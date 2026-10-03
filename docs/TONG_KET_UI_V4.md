# Tổng kết chuẩn hoá UI v4 (đến hết giai đoạn C)

Ngày cập nhật: 03/10/2026. Branch: `ui_version_4` (tạo từ `ui_version_3`, đã push lên
`origin/ui_version_4`). Commit cuối: `7655a6b`.

Tài liệu này tóm tắt toàn bộ việc đã làm trong đợt chuẩn hoá UI v4 và liệt kê các nhiệm vụ tiếp
theo. Trạng thái chi tiết theo từng task nằm ở `docs/TIEN_DO_UI_V4.md`; kế hoạch gốc ở
`docs/KE_HOACH_CHUAN_HOA_UI_V4.md`.

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Hạ tầng làm việc đã dựng](#2-hạ-tầng-làm-việc-đã-dựng)
3. [Nghiên cứu Google TTS](#3-nghiên-cứu-google-tts)
4. [Các quyết định của chủ dự án](#4-các-quyết-định-của-chủ-dự-án)
5. [Giai đoạn M: Merchant](#5-giai-đoạn-m-merchant)
6. [Giai đoạn C: Collector](#6-giai-đoạn-c-collector)
7. [Kiểm thử và kiểm tra chất lượng](#7-kiểm-thử-và-kiểm-tra-chất-lượng)
8. [Phát hiện ngoài phạm vi và giới hạn còn lại](#8-phát-hiện-ngoài-phạm-vi-và-giới-hạn-còn-lại)
9. [Nhiệm vụ tiếp theo cần triển khai](#9-nhiệm-vụ-tiếp-theo-cần-triển-khai)
10. [Phụ lục: danh sách commit](#10-phụ-lục-danh-sách-commit)

---

## 1. Tổng quan

| Hạng mục | Trạng thái |
|---|---|
| Nghiên cứu Google TTS (giá, cách áp dụng, vị trí đặt) | Xong — `docs/NGHIEN_CUU_TTS_GOOGLE.md` |
| Bộ quy tắc tự thực thi (`/ui-v4`) | Xong — `.claude/rules/ui-v4-workflow.md` |
| Giai đoạn M (Merchant) | Xong, **đã duyệt** |
| Giai đoạn C (Collector) | Xong, **chờ duyệt** |
| Giai đoạn I1 (Google Maps cho trạm) | Chưa làm |
| Giai đoạn I2 (Đọc giọng nói TTS) | Chưa làm, đang chờ câu trả lời T1–T7 |
| Giai đoạn I3 (Gợi ý hạng dầu bằng Gemini, tuỳ chọn) | Chưa làm, chỉ làm nếu chủ dự án xác nhận |

Con số chính (so với `68d5325`, điểm trước khi bắt đầu v4):

- 30 commit, 69 file trong `apps/` và `packages/` thay đổi (+2.035 / −724 dòng).
- Test miniapp: **150 → 228**, tất cả pass. Typecheck, lint, build pass.
- 3 lần review tự động bằng agent `code-reviewer`: không có lỗi CRITICAL/HIGH; 11 điểm MEDIUM, đã sửa 10, điểm còn lại (đơn "Đã thu gom" không hiện riêng) giữ theo quyết định Q5.

---

## 2. Hạ tầng làm việc đã dựng

### 2.1. Bộ quy tắc tự thực thi

| File | Vai trò |
|---|---|
| `.claude/rules/ui-v4-workflow.md` | Quy trình agent tự chạy: vòng lặp B0–B8 (kiểm tra môi trường → chọn task → rà soát đầu giai đoạn → test trước → cổng kiểm tra → kiểm tra trực quan → tự rà soát → commit), 14 điều kiện bắt buộc dừng hỏi (S1–S14), mẫu câu hỏi, mẫu báo cáo giai đoạn, vùng cấm |
| `.claude/commands/ui-v4.md` | Lệnh `/ui-v4`: đọc quy tắc, đọc tiến độ, nhận câu trả lời/lệnh duyệt kèm theo lệnh, chạy tiếp |
| `docs/TIEN_DO_UI_V4.md` | File trạng thái duy nhất: bảng task, câu hỏi đang mở, quyết định, phát hiện ngoài phạm vi, báo cáo giai đoạn, nhật ký |
| `.claude/rules/external-apis.md` | Bổ sung quy tắc E7 (phát âm thanh qua API của dự án) và tên biến môi trường TTS |
| `docs/KE_HOACH_CHUAN_HOA_UI_V4.md` | Cập nhật giai đoạn I2 theo nghiên cứu TTS, trỏ sang quy trình và file tiến độ |

Nguyên tắc giao tiếp: agent chỉ nhắn chủ dự án khi (1) cần hỏi, (2) xong một giai đoạn, hoặc
(3) xong toàn bộ kế hoạch. Mọi chi tiết khác nằm trong file tiến độ và git log.

### 2.2. Môi trường máy

Agent chạy trong container không có sẵn `git` và `node`. Đã xử lý mà không đổi cấu hình hệ thống:

- `~/.local/share/agent-tools/bin/git`: gọi git của máy host và dùng `gh` của host để đăng nhập khi push.
- Node 22.23.3 cài bằng `pnpm env use --global 22`, nằm trong `~/.local/share/pnpm/bin`.
- Trước mỗi lệnh shell cần: `export PATH=$HOME/.local/share/agent-tools/bin:$HOME/.local/share/pnpm/bin:$PATH`
  (đã ghi trong bước B0 của quy trình).
- Đã chạy `pnpm install` cho toàn bộ workspace.
- `.claude/launch.json` có thêm cấu hình `eco-oil-miniapp-demo` (chạy miniapp với
  `VITE_DEMO_MODE=true VITE_DEMO_OFFLINE=true`, không cần backend).

Lưu ý kỹ thuật: hai file Collector (`CollectorFlow.tsx`, `CollectorRouteScreen.tsx`) và một số
file khác có lẫn kiểu xuống dòng Windows (CRLF). Khi sửa đã giữ nguyên kiểu xuống dòng gốc để diff
chỉ chứa thay đổi thật.

---

## 3. Nghiên cứu Google TTS

Chi tiết: `docs/NGHIEN_CUU_TTS_GOOGLE.md`.

- **Đề xuất:** Google Cloud Text-to-Speech, giọng **Chirp 3: HD** tiếng Việt (GA). Trả MP3 trực
  tiếp, hạn mức 200 request/phút, miễn phí 1 triệu ký tự/tháng (số liệu giá lấy từ nguồn thứ cấp,
  cần đối chiếu lại trên trang giá chính thức).
- **Gemini 3.8 Flash TTS** chỉ để so sánh: trả WAV/PCM, tính theo token, vòng đời model ngắn.
- **Chi phí ước tính** (20 Collector, 500 quán): khoảng 0 USD/tháng nếu lưu âm thanh theo hash;
  khoảng 1,8 USD/tháng nếu không lưu. Quy mô gấp 10: 12 USD (có lưu) so với 288 USD (không lưu).
- **Vị trí đặt:**
  - Collector: tạo sẵn âm thanh lúc "Bắt đầu ca"; đọc khi lưu giao dịch xong, khi sai mã can, khi
    thu hết điểm, khi kết ca còn giao dịch chưa đồng bộ. Không đưa số liệu chỉ có lúc chạy tuyến
    (số lít, khoảng cách) vào âm thanh vì không tạo được khi mất sóng.
  - Merchant: nút "Nghe" trên từng thông báo; công tắc "Giọng đọc" và "Đọc số tiền" (mặc định
    tắt) trong Cài đặt chung.
- Miniapp phát âm thanh tải từ API của dự án (`blob:` URL) nên không cần khai báo thêm tên miền
  trong Zalo Mini App.

---

## 4. Các quyết định của chủ dự án

| Mã | Nội dung đã chốt |
|---|---|
| — | Làm trên `ui_version_4`; thứ tự M → C → I1 → I2 → I3; giữ nguyên phần giả và dataset demo; thanh điều hướng kiểu A |
| — | **Giữ nguyên font**: không đổi họ font, cỡ, độ đậm của phần tử đang có |
| Q1 | Hệ số CO2 = **2.5** kg/lít |
| Q2 | Gửi lại hồ sơ quán: không gửi `ward_id`, giữ phường hiện tại |
| Q3 | Danh sách can ở Tài khoản chuyển vào "Của tôi" trong task M4 |
| Q4 | Giữ nhắc "can đầy 85%"; can không có dung tích thì không nhắc |
| Q5 | "Lịch sử thu gom" = lịch sử giao dịch + "Đơn đã huỷ"; đơn đang mở ở "Hôm nay" |
| Q6 | "Can chuẩn được cấp" là mục riêng ngay sau "Hồ sơ quán" |
| Q7 | Merchant không thêm hộp xác nhận đăng xuất; 2 `window.confirm` của Collector làm ở giai đoạn C |
| Q8 | Mục mở rộng mặc định đóng, mở mục này thì mục khác đóng |
| Q9 | Chỉ nhắc can đầy khi can ở quán và chưa có đơn đang chờ |
| Q10 | Giữ nút "Hàng chờ N"; bỏ khối "Dữ liệu trên máy" ở Tài khoản Collector |
| Q11 | Thứ tự dải trạng thái: lỗi > mất mạng > hàng chờ > GPS > dữ liệu cũ > biên nhận > ca sẵn sàng > tải lại thành công |
| Q12 | Đã thu ≥ 1 điểm thì có "Đi nộp trạm" (nút chữ), thu hết thì thành nút chính |
| Q13 | Không đổi luồng kết ca (vốn đã 1 lần bấm), chỉ thêm test |
| Q14 | Ô kg và lít để trống, chỉ gửi ô người dùng nhập |
| Q15 | Trạm gần nhất còn đủ chỗ lên đầu, không tự chuyển màn |
| Q16 | Bỏ avatar chỉ ở Collector; Merchant giữ |

---

## 5. Giai đoạn M: Merchant

Trạng thái: **xong, đã duyệt** (sau khi chủ dự án yêu cầu kiểm thử thêm).

### 5.1. Từng task

| Task | Việc đã làm | File chính | Commit |
|---|---|---|---|
| M1 | Sửa lỗi gửi lại hồ sơ làm quán bị chuyển sang phường khác (mã phường viết cứng). Payload gửi lại không còn `ward_id` | `components/MerchantApprovalView.tsx`, `lib/merchant-resubmit.ts` | `1249fe5` |
| M2 | Bỏ ô "Tiền ước tính tuần" trùng ở Trang chủ; tiền tuần chỉ còn ở thẻ lớn | `pages/HomePage.tsx` | `1d952d9` |
| M3 | Thêm hằng số `CO2_KG_PER_LITER = 2.5` vào `@eco-oil/shared-types`; Lịch sử (trước dùng 2.65), Hành trình xanh, Thống kê Collector, PDF báo cáo dùng chung. Lịch sử đổi từ 2843.4 thành 2682.5 kg CO2e | `packages/shared-types`, `lib/merchant-history.ts` | `ac87b2a` |
| M4 | Từ 6 tab chỉ có biểu tượng thành 2 tab có chữ "Hôm nay" / "Của tôi". "Hôm nay" thêm thẻ "Đơn đang mở" (kèm Huỷ). "Của tôi" có 7 mục mở rộng: Lịch sử thu gom (+ Đơn đã huỷ), Tiền theo kỳ, Hành trình xanh, Hồ sơ quán, Can chuẩn được cấp, Mời bạn, Cài đặt chung. Tab Đơn bị bỏ | `App.tsx`, `pages/MinePage.tsx`, `pages/AccountPage.tsx` (tách thành các mục), `components/MerchantOrderList.tsx`, `lib/merchant-nav.ts` | `a2e1761` |
| M5.1 | Báo sẵn sàng: ô số lít điền sẵn số ước tính của can, ghi "(tự tính)", sửa được | `components/OrderSheet.tsx`, `lib/order-liters.ts` | `57a45ff` |
| M5.2 | Thông báo "Can sắp đầy" khi can ở quán ước tính đầy từ 85% và chưa có đơn chờ | `lib/notifications.ts` | `784bec1` |
| M5.3 | Lưu trạng thái "đã đọc" của thông báo trên máy, theo từng tài khoản | `components/NotificationBell.tsx`, `lib/notification-read.ts` | `3ccbb3a` |
| M5.4 | Nút bị khoá hiện lý do (Sẵn sàng thu gom, gửi hồ sơ, đăng ký) | `lib/merchant-blockers.ts`, `HomePage`, `MerchantApprovalView`, `LoginScreen` | `e10799f` |
| M6 | Nút đăng xuất chữ thường "Đăng xuất", không còn là nút lớn (font giữ nguyên) | `pages/AccountPage.tsx` | `fa62f1b` |

### 5.2. Kiểm thử giai đoạn M

- Chạy thử trên app demo khung 375×812: 2 tab, màn báo sẵn sàng, 7 mục "Của tôi", các sheet.
- Giả lập trong bộ nhớ trình duyệt (không sửa file): đơn đang chờ, đơn đã huỷ, can 90%, can đang
  chở. Tất cả hiển thị đúng.
- Có test `demo-parts-preserved.test.ts` bảo đảm 21 dòng chữ của phần giả không bị mất khi tái cấu trúc.
- Ảnh: `design/snapshots/ui-v4/M-before/`, `M2/` … `M6/`, `M-test/`.

---

## 6. Giai đoạn C: Collector

Trạng thái: **xong, chờ duyệt**.

### 6.1. Từng task

| Task | Việc đã làm | File chính | Commit |
|---|---|---|---|
| C1 | Màn Tuyến từ tối đa 9 thông báo xếp chồng còn 1 dải trạng thái; "Xem thêm n trạng thái" mở cả danh sách; mỗi mục giữ nút gốc; "Hủy ca" bị khoá thì ghi lý do | `lib/collector-status.ts`, `components/CollectorStatusStrip.tsx`, `CollectorRouteScreen.tsx`, `CollectorFlow.tsx` | `3cf77df` |
| C2 | Từ 5 tab thành 2 tab có chữ "Ca hôm nay" / "Của tôi". "Ca hôm nay" có nút chuyển "Danh sách / Bản đồ". "Của tôi": Đã thu và thống kê, Hồ sơ và xe, Địa bàn, Cài đặt chung. Bỏ "Cần thu hôm nay", nút "Thoát", avatar, khối "Dữ liệu trên máy". Đăng xuất chỉ còn ở Cài đặt chung. 2 `window.confirm` đổi thành hộp xác nhận trong app | `CollectorShell.tsx`, `CollectorAccountPage.tsx`, `CollectorSchedulePage.tsx`, `components/MineAccordion.tsx`, `components/ConfirmDialog.tsx`, `lib/collector-nav.ts` | `016a1c2` |
| C3 | Thẻ điểm thu khi đóng chỉ còn nút "Thu gom"; Gọi quán, Chỉ đường, Sao chép số, Chi tiết AI trong menu; nút không dùng được ghi lý do | `CollectorRouteScreen.tsx`, `lib/stop-card-menu.ts` | `ef7306e` |
| C4.1 | Quét mã can khớp thì tự sang màn nhập (bỏ nút "Tiếp tục nhập giao dịch") | `CollectorQrScreen.tsx`, `lib/container-code.ts` | `9c73b55` |
| C4.2 | Ô nhập tay mã can để trống — vá lỗ hổng bỏ qua bước quét QR | như trên | `9c73b55` |
| C4.3 | Bỏ màn Tóm tắt ca; dòng "x / y điểm đã thu · z lít" và nút "Đi nộp trạm" nằm trên màn Tuyến | `lib/route-delivery.ts`, `CollectorFlow.tsx`, `StationDeliveryFlow.tsx` | `ca68484` |
| C4.4 | Luồng kết ca đã là 1 lần bấm; tách hàm `closeShiftAfterReceipt` và thêm test | `lib/station-delivery.ts` | `9a93af0` |
| C5.1 | Ô kg và lít để trống lúc đầu; ô nhập sau cùng là ô gốc, ô kia tự tính, ghi "(tự tính)"; chỉ gửi ô gốc | `lib/mass-entry.ts`, `CollectorEntryScreen.tsx` | `ca8d440` |
| C5.2 | Hạng C hoặc nghi pha lẫn → chất lượng tự chuyển "Cần kiểm tra"; gộp khối Chất lượng vào khối Phân hạng | `lib/grade-automation.ts` | `c933a47`, `29de823` |
| C5.3 | Mở màn nhập là tự lấy GPS; "Lấy lại GPS" chỉ hiện khi lỗi. Cùng commit sửa lỗi phụ của C5.1 (ô trống không còn đòi xác nhận chênh lệch) | `lib/entry-gps.ts` | `df0d106` |
| C5.4 | AI tin cậy cao và chưa chọn hạng thì chọn sẵn, ghi "AI chọn sẵn" | `lib/grade-automation.ts` | `f562f99` |
| C5.5 | Trạm gần nhất còn đủ chỗ lên đầu, ghi "Gần nhất còn đủ chỗ", là nút chính | `lib/station-delivery.ts` | `93587a4` |
| C6 | UUID, mã phiếu, mã trạm, mã người thu gom, provider/model AI vào phần "Chi tiết" thu gọn | `components/TechDetails.tsx` | `ccdafc9` |
| Review | Sửa 5 điểm MEDIUM: khoá +/− của ô tự tính; bỏ hạng AI khi ảnh bị xoá/đổi; "Đi nộp trạm" thành nút chính cả khi điểm cuối chưa đồng bộ; hộp xác nhận dùng được bằng bàn phím/trình đọc màn hình; thẻ điểm giữ tiêu đề `h2` | nhiều file | `9ee7030` |

### 6.2. Kiểm thử giai đoạn C

Đã chạy thử trên app demo:

- Mã can sai thì báo lỗi; mã đúng thì tự sang màn nhập.
- Nhập 18,2 kg → 20,0 lít tự tính; nhập 12 lít → 10,9 kg tự tính.
- Chọn hạng C → "Cần kiểm tra"; đổi A → "Đạt"; bấm tay thì giữ.
- GPS bị từ chối → hiện cách sửa và nút "Lấy lại GPS".
- Sau 1 giao dịch: "1 / 4 điểm đã thu · 26 lít | Đi nộp trạm"; danh sách trạm đưa Long Biên lên đầu.

Ảnh: `design/snapshots/ui-v4/C-before/`, `C-after/`, `C1/` … `C6/`.

### 6.3. Những gì đã bỏ theo quyết định

- Màn Tóm tắt ca (gồm số kg ước tính và "Dung tích còn lại").
- Khối "Dữ liệu trên máy" ở Tài khoản Collector.
- Phần "Cần thu hôm nay" ở tab Lịch.
- Ghi chú "Dữ liệu lúc …" trên thẻ đối chiếu can ở màn quét mã.

---

## 7. Kiểm thử và kiểm tra chất lượng

| Hạng mục | Kết quả |
|---|---|
| `pnpm --filter @eco-oil/miniapp typecheck` | Pass |
| `pnpm --filter @eco-oil/miniapp lint` | Pass |
| `pnpm --filter @eco-oil/miniapp test` | 228/228 pass |
| `pnpm --filter @eco-oil/miniapp build` | Pass |
| Typecheck `shared-types`, `api`, `admin` (sau khi thêm hằng số CO2) | Pass |
| Review `code-reviewer` | 3 lần; 0 CRITICAL/HIGH; 11 MEDIUM (sửa 10, 1 giữ theo Q5) |

File test mới (đều đã thêm vào script `test` của miniapp): `merchant-resubmit`, `co2-factor`,
`merchant-nav`, `demo-parts-preserved`, `order-liters`, `notification-read`, `merchant-blockers`,
`collector-status`, `collector-nav`, `stop-card-menu`, `mass-entry`, `grade-automation`,
`entry-gps`; bổ sung test vào `notifications`, `container-code`, `collector-flow`, `station-delivery`.

---

## 8. Phát hiện ngoài phạm vi và giới hạn còn lại

Chưa sửa, đã ghi trong file tiến độ:

1. **Màn nhập thu gom kẹt "Đang lưu trên máy…"** khi khung trình duyệt bị ẩn: giao dịch vẫn được
   lưu và đồng bộ, nhưng màn hình không chuyển. Bản trước v4 (`68d5325`) cũng bị y hệt. Cần thử
   trên điện thoại thật khi màn hình đang mở.
2. **Đơn giá ước tính sai lệch:** Trang chủ Merchant và màn kết ca Collector tính tiền theo
   `VITE_ESTIMATED_PRICE_PER_LITER` (8.000đ) trong khi giá dầu từ API là 20.000đ (vi phạm U11).
3. **Backend chưa có rate limit** ở bất kỳ endpoint nào.

Chưa xem được trên màn hình (mới kiểm bằng test):

- AI chọn sẵn hạng (cần ảnh thật cho kết quả tin cậy cao).
- Hộp xác nhận đăng xuất khi còn giao dịch chưa đồng bộ.
- Màn gửi lại hồ sơ của quán bị từ chối (tài khoản demo đã được duyệt).
- Hành vi trong Zalo thật trên điện thoại (camera, GPS, âm thanh).

Giới hạn của dữ liệu demo: thông báo "Đã thu gom thành công" hiện lại là chưa đọc sau khi tải lại,
vì dataset demo tính lại thời điểm theo giờ hiện tại (dữ liệu thật không bị).

---

## 9. Nhiệm vụ tiếp theo cần triển khai

### 9.1. Việc cần chủ dự án làm ngay

1. **Duyệt giai đoạn C:** gõ `/ui-v4 duyệt C` (hoặc ghi yêu cầu sửa).
2. Thử app trên điện thoại thật trong Zalo, đặc biệt lỗi kẹt "Đang lưu trên máy…" (mục 8.1).
3. Quyết định có xử lý 3 phát hiện ngoài phạm vi (mục 8) không, và xử lý ở giai đoạn nào.

### 9.2. Giai đoạn I1: Google Maps cho trạm

| Task | Việc | File |
|---|---|---|
| I1.1 | Admin nhập vị trí trạm: gõ địa chỉ → gợi ý Places API (New) → chọn → kéo ghim xác nhận; giữ ô nhập tay lat/lng làm dự phòng | `apps/admin/src/components/stations-view.tsx` |
| I1.2 | Backend gợi ý trạm theo đường đi xe máy bằng Routes API (Compute Route Matrix, `TWO_WHEELER`); lỗi/timeout dùng `ST_Distance` hiện có | `apps/api/src/modules/stations/` |
| I1.3 | Collector tính gợi ý trạm lúc "Bắt đầu ca", lưu trên máy; mất mạng dùng bản đã lưu | `apps/miniapp/src/lib/offline-cache.ts`, `StationDeliveryFlow.tsx` |

Cần chuẩn bị trước khi chạy I1 (agent sẽ hỏi ở bước rà soát đầu giai đoạn):

- Key `GOOGLE_MAPS_SERVER_KEY` (backend, chỉ bật Routes + Places) và
  `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` (admin, giới hạn tên miền). Key chỉ đặt trong biến môi
  trường, không gửi qua chat, không commit.
- Hạn mức/ngày và cảnh báo ngân sách trên Google Cloud.
- Có thể cần thêm thư viện bản đồ cho admin (điều kiện S5, phải hỏi).
- Giai đoạn này sửa cả `apps/api` và `apps/admin`, cổng kiểm tra sẽ chạy thêm test của hai app đó.
- Nghiệm thu: tắt mạng hoặc dùng key sai thì app vẫn gợi ý trạm (đường chim bay); có test e2e
  backend cho nhánh dự phòng.

### 9.3. Giai đoạn I2: Đọc giọng nói (TTS)

| Task | Việc |
|---|---|
| I2.1 | Module backend `tts`: `POST /api/v1/tts` (JWT, rate limit), nhận mẫu câu + tham số; nhà cung cấp Google Cloud TTS (Chirp 3: HD) và Zalo AI; lưu âm thanh theo hash |
| I2.2 | Lấy danh sách giọng `vi-VN`, nghe thử 2 nhà cung cấp với tên quán thật; chủ dự án chọn nhà cung cấp chính và giọng |
| I2.3 | Collector: tạo sẵn âm thanh lúc "Bắt đầu ca", đọc ở các điểm đã nêu trong mục 3 |
| I2.4 | Cài đặt chung của hai vai trò: công tắc "Giọng đọc"; Merchant thêm "Đọc số tiền" (mặc định tắt) |
| I2.5 | Merchant: nút "Nghe" trên từng thông báo |

Câu hỏi đang chờ (chặn I2), kèm đề xuất:

| Mã | Câu hỏi | Đề xuất |
|---|---|---|
| T1 | Nhà cung cấp Google: Chirp 3: HD, Gemini TTS hay thử cả hai? | Chirp 3: HD |
| T2 | Xác thực: API key chỉ bật Cloud TTS, hay service account? | API key + hạn mức/ngày + cảnh báo ngân sách |
| T3 | Cache âm thanh phía server bằng Redis hay chỉ trên máy? | Redis nếu Render có `REDIS_URL` |
| T4 | Rate limit: tự viết bằng Redis hay thêm `@nestjs/throttler`? | `@nestjs/throttler` |
| T5 | Giọng đọc Collector mặc định bật hay tắt? | Bật cho Collector, tắt cho Merchant; số tiền luôn tắt |
| T6 | Giọng Bắc/Nam, nam/nữ? | Chọn sau khi nghe thử ở I2.2 |
| T7 | Ngân sách tháng để đặt cảnh báo? | 5 USD |

Cần thử trên máy thật: iOS/Zalo có chặn tự phát âm thanh không (mở khoá khi bấm "Bắt đầu ca"),
`speechSynthesis` có giọng `vi-VN` trong WebView của Zalo không.

### 9.4. Giai đoạn I3 (tuỳ chọn): Gợi ý hạng dầu bằng Gemini

- Chỉ chạy khi có mạng, sau thuật toán trên máy, không chặn nút lưu; kết quả chỉ là gợi ý.
- Chỉ làm nếu chủ dự án xác nhận sau giai đoạn I2.

### 9.5. Cách chạy tiếp

1. Gõ `/ui-v4 duyệt C` (có thể kèm câu trả lời, ví dụ `/ui-v4 duyệt C, T1–T7: theo đề xuất`).
2. Agent đọc `docs/TIEN_DO_UI_V4.md`, chạy bước rà soát đầu giai đoạn I1, gom câu hỏi một lần.
3. Agent chỉ nhắn lại khi cần hỏi hoặc khi xong giai đoạn.

---

## 10. Phụ lục: danh sách commit

| Commit | Nội dung |
|---|---|
| `2a72b8b` | docs: quy trình tự thực thi UI v4, file tiến độ và nghiên cứu TTS Google |
| `e45fca9` | docs: ghi quyết định Q3, Q4 |
| `f02526d` | docs: rà soát đầu giai đoạn M, ảnh trước và câu hỏi Q5–Q9 |
| `1249fe5` | fix: gửi lại hồ sơ quán không còn ghi đè phường bằng mã cứng (M1) |
| `1d952d9` | refactor: bỏ ô tiền tuần trùng ở Trang chủ Merchant (M2) |
| `ac87b2a` | refactor: hệ số CO2 dùng một hằng số chung 2.5 trong shared-types (M3) |
| `a2e1761` | feat: thanh điều hướng 2 nhóm Hôm nay / Của tôi cho Merchant (M4) |
| `57a45ff` | feat: điền sẵn số lít tự tính khi quán báo sẵn sàng thu gom (M5.1) |
| `784bec1` | feat: nhắc báo thu gom khi can ở quán ước tính đầy từ 85% (M5.2) |
| `3ccbb3a` | feat: lưu trạng thái đã đọc của thông báo trên máy (M5.3) |
| `e10799f` | feat: nút bị khoá của Merchant hiện lý do (M5.4) |
| `fa62f1b` | refactor: nút đăng xuất Merchant chữ thường, không còn nút lớn (M6) |
| `18069ab` | fix: gợi ý chọn phường chỉ hiện khi có ô chọn phường; báo cáo giai đoạn M |
| `30fab68` | docs: kết quả kiểm thử giai đoạn M |
| `3249d20` | docs: duyệt giai đoạn M; rà soát đầu giai đoạn C, câu hỏi Q10–Q16 |
| `3cf77df` | feat: gom thông báo màn Tuyến Collector thành 1 dải trạng thái (C1) |
| `016a1c2` | feat: thanh điều hướng 2 nhóm Ca hôm nay / Của tôi cho Collector (C2) |
| `ef7306e` | feat: thẻ điểm thu chỉ còn nút Thu gom, thao tác phụ trong menu (C3) |
| `9c73b55` | fix: quét mã can khớp thì tự sang màn nhập, ô nhập tay không điền sẵn mã (C4.1, C4.2) |
| `ca68484` | feat: bỏ màn Tóm tắt ca, nút Đi nộp trạm nằm trên màn Tuyến (C4.3) |
| `9a93af0` | test: chứng minh kết ca từ biên nhận chỉ cần 1 lần bấm (C4.4) |
| `ca8d440` | feat: kg và lít tự tính qua lại ở màn nhập thu gom (C5.1) |
| `c933a47` | test: hàm tự chọn chất lượng và AI chọn sẵn hạng dầu (C5.2, C5.4) |
| `29de823` | feat: chất lượng dầu tự chọn theo hạng, gộp vào khối phân hạng (C5.2) |
| `df0d106` | feat: tự lấy GPS khi mở màn nhập, chỉ hiện Lấy lại GPS khi lỗi (C5.3) |
| `f562f99` | feat: AI tin cậy cao thì chọn sẵn hạng dầu và ghi AI chọn sẵn (C5.4) |
| `93587a4` | feat: chọn sẵn trạm gần nhất còn đủ chỗ khi nộp trạm (C5.5) |
| `ccdafc9` | refactor: ẩn mã kỹ thuật vào phần Chi tiết thu gọn ở màn Collector (C6) |
| `9ee7030` | fix: sửa 5 điểm review giai đoạn C |
| `7655a6b` | docs: báo cáo giai đoạn C |
