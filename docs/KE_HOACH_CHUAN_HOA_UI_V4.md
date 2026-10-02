# Kế hoạch chuẩn hoá UI v4 (branch `ui_version_4`)

Kế hoạch thực hiện các kết luận trong `docs/NGHIEN_CUU_UI_NON_FICTION_VA_GOOGLE_API.md`.
Quy tắc agent phải tuân theo: `.claude/rules/ui-non-fiction.md` và `.claude/rules/external-apis.md`.

## 0. Quyết định của chủ dự án (02/10/2026)

| Chủ đề | Quyết định |
|---|---|
| Branch | `ui_version_4`, tạo từ `ui_version_3`. Không commit lên `ui_version_3` |
| Thứ tự | Merchant trước, Collector sau. Các tích hợp (Google Maps, TTS, Gemini) làm sau khi xong UI của cả hai vai trò |
| Phần giả và dataset demo | **Giữ nguyên**: không xoá, không đổi nội dung, không ẩn sau cờ. Khi tái cấu trúc thì đặt lại vào vị trí mới |
| Thanh điều hướng | Kiểu A: thanh dưới đáy, 2 nút có chữ |
| Tài khoản | Đã có Google Cloud (có thanh toán) và Zalo AI. Key chỉ đặt trong biến môi trường, không gửi qua chat, không commit |

## 1. Cách làm chung cho mọi task

1. **Dừng chờ duyệt giữa các giai đoạn.** Xong một giai đoạn (M, C, I1, I2, I3) thì báo kết quả
   và chờ chủ dự án duyệt trước khi sang giai đoạn tiếp theo.
2. **Phân loại** mỗi task: nhóm A (thuần trình bày) hoặc nhóm B (đổi tương tác/state/tính năng).
   Nhóm B: viết test trước (RED), rồi mới sửa (GREEN). Logic mới tách thành hàm thuần trong
   `src/lib/` để test bằng `node:test`.
3. **Cổng kiểm tra** trước mỗi commit (chạy ở gốc repo):

   ```bash
   pnpm --filter @eco-oil/miniapp typecheck
   pnpm --filter @eco-oil/miniapp lint
   pnpm --filter @eco-oil/miniapp test
   pnpm --filter @eco-oil/miniapp build
   git diff --stat HEAD   # đối chiếu số dòng với kỳ vọng, lệch bất thường thì dừng lại điều tra
   ```

   Task có sửa `apps/api` hoặc `apps/admin` thì chạy thêm lệnh tương ứng của package đó.
4. **Kiểm tra trực quan bắt buộc** cho mọi thay đổi giao diện: chạy miniapp với
   `VITE_DEMO_MODE=true VITE_DEMO_OFFLINE=true`, chụp màn hình khung 375×812 bằng Playwright
   (Chromium có sẵn), so trước/sau. Chưa nhìn thấy kết quả thì chưa coi là xong.
5. **Test mới** của miniapp phải được thêm vào script `test` trong `apps/miniapp/package.json`.
6. **Commit** theo dạng `<type>: <mô tả>` (feat, fix, refactor, docs, test, chore), mỗi task một
   commit, push lên `origin ui_version_4`.
7. **Không đụng:** `prisma/` và migration, `docker-compose.yml`, file deploy/`.env` thật, dataset
   demo. Nếu một task buộc phải sửa những chỗ này thì hỏi trước.

---

## Giai đoạn M: Merchant

### M1. Sửa lỗi phường bị viết cứng khi gửi lại hồ sơ (nhóm B, fix)

- **File:** `apps/miniapp/src/components/MerchantApprovalView.tsx`.
- **Việc:** bỏ `WARD_ID` cứng trong `save()`; không gửi `ward_id` (giữ phường hiện tại) hoặc cho
  chọn phường như lúc đăng ký, điền sẵn phường hiện tại.
- **Nghiệm thu:** gửi lại hồ sơ không làm đổi phường của quán. Có test cho hàm tạo payload.

### M2. Bỏ hiển thị trùng (nhóm A)

- Trang chủ: tiền tuần chỉ hiện 1 lần (giữ thẻ lớn, bỏ ô "Tiền ước tính tuần" trong lưới thống kê).
- Danh sách can: chỉ giữ ở "Hôm nay"; phần can ở Tài khoản (kể cả chữ giả "Can HDPE ISCC",
  "QR-ISCC") chuyển thành một mục trong "Của tôi", giữ nguyên chữ.
- **Nghiệm thu:** không còn số liệu nào hiện 2 lần trên cùng một màn.

### M3. Hằng số nghiệp vụ một nguồn (nhóm B, nhỏ)

- Hệ số CO2: `HistoryPage.tsx:48` dùng 2.65, nơi khác dùng 2.5. Đưa về một hằng số dùng chung.
- **Cần chủ dự án chọn** giá trị đúng (2.5 hay 2.65) trước khi làm, vì số trên màn Lịch sử sẽ đổi.
- **Nghiệm thu:** `grep` không còn hệ số CO2 khai báo riêng trong từng màn.

### M4. Thanh điều hướng 2 nhóm cho Merchant (nhóm B)

- **File chính:** `apps/miniapp/src/App.tsx`, `src/styles.css`, các trang trong `src/pages/`.
- **Hôm nay:** nút "Sẵn sàng thu gom" (nút chính duy nhất), trạng thái can, đơn đang mở (chỉ khi có,
  kèm Huỷ), tiền tuần này, giá dầu hôm nay, và các phần giả hiện có của Trang chủ (giữ nguyên).
- **Của tôi:** danh sách mục mở rộng (accordion), mỗi mục mở ra nội dung của trang cũ:
  1. Lịch sử thu gom: gộp `OrdersPage` (đơn đã xong/huỷ) và `HistoryPage`.
  2. Tiền theo kỳ: `PaymentsPage`.
  3. Hành trình xanh: `GreenJourneyPage` (giữ xuất PDF).
  4. Hồ sơ quán: phần hồ sơ của `AccountPage` (giữ nguyên các chữ giả ISCC-EU, MB Bank…).
  5. Mời bạn.
  6. Cài đặt chung: các công tắc và mục giả hiện có (giữ nguyên), thông tin phiên bản, đăng xuất.
- Thanh dưới đáy 2 nút có chữ "Hôm nay" / "Của tôi" (kiểu A).
- **Nghiệm thu:** mọi nội dung của 6 tab cũ vẫn truy cập được trong tối đa 2 chạm; không còn tab
  chỉ có icon; phần giả vẫn hiển thị đúng chữ cũ.

### M5. Tự động hoá Merchant (nhóm B)

| Task | Việc | Nghiệm thu |
|---|---|---|
| M5.1 | `OrderSheet`: điền sẵn số lít bằng `estimated_liters` của can sẵn sàng, ghi "tự tính", sửa được | Báo sẵn sàng chỉ cần 1 chạm; test hàm tính giá trị điền sẵn |
| M5.2 | Thông báo nhắc báo thu gom khi can ước tính đầy từ 85%, tính ở client trong `lib/notifications.ts`. Công tắc giả ở Cài đặt chung giữ nguyên, không nối vào | Có test trong `notifications.test.ts` |
| M5.3 | Lưu trạng thái "đã đọc" của thông báo trên máy (`zaloClient` storage) | Tải lại vẫn giữ trạng thái đã đọc; có test |
| M5.4 | Nút bị khoá phải hiện lý do (ví dụ "Sẵn sàng thu gom" khi can đang vận chuyển) | Mỗi nút disabled đều có dòng lý do |

### M6. Rào cản cảm xúc Merchant (nhóm A, phần nhỏ nhóm B)

- Thay `window.confirm` bằng hộp xác nhận trong app (dùng lại `confirm-dialog`).
- Nút đăng xuất trong Cài đặt chung: chữ thường, không dùng nút đỏ lớn.

**Kết thúc giai đoạn M:** chụp màn hình trước/sau toàn bộ màn Merchant, báo cáo, chờ duyệt.

---

## Giai đoạn C: Collector

### C1. Dải trạng thái duy nhất (nhóm B)

- **File:** `src/pages/CollectorFlow.tsx`, `src/pages/collector/CollectorRouteScreen.tsx`,
  `src/components/CollectorNotice.tsx`.
- Gom các thông báo (mất mạng, kết quả tải lại, lỗi tải, GPS, cache, biên nhận, hàng chờ, ca sẵn
  sàng) thành 1 dải theo thứ tự ưu tiên của quy tắc U6; bấm vào để xem danh sách đầy đủ.
- Hàm chọn trạng thái ưu tiên viết thuần trong `src/lib/`, có test.
- **Nghiệm thu:** màn Tuyến hiện tối đa 1 dải trạng thái; trạng thái hàng chờ đồng bộ luôn thấy
  được; `outbox.test.ts`, `collector-flow.test.ts` vẫn pass.

### C2. Thanh điều hướng 2 nhóm cho Collector (nhóm B)

- **File chính:** `src/pages/collector/CollectorShell.tsx`.
- **Ca hôm nay:** dải trạng thái, Bắt đầu ca, danh sách điểm với nút chuyển "Danh sách / Bản đồ"
  (nội dung `CollectorMapPage`), Thu gom, Nộp trạm.
- **Của tôi:** mục mở rộng: Đã thu và thống kê (`CollectorSchedulePage` phần "Đã thu" +
  `CollectorStatsPage`), Hồ sơ và xe, Địa bàn, Cài đặt chung (đăng xuất).
- Bỏ: phần "Cần thu hôm nay" (trùng tab Tuyến), nút "Thoát" trên header, avatar không bấm được.
- Giữ ẩn thanh tab khi đang ở màn thao tác dở (`FOCUSED_SCREENS`).
- **Nghiệm thu:** 2 nút có chữ; đăng xuất chỉ còn 1 nơi; mọi nội dung cũ vẫn truy cập được.

### C3. Thẻ điểm thu gọn (nhóm B)

- `CollectorStopCard`: 1 nút chính "Thu gom"; bấm vào thẻ mở menu Gọi quán, Chỉ đường, Sao chép
  số, Chi tiết AI.
- **Nghiệm thu:** mỗi thẻ khi đóng chỉ có 1 nút; các hành động cũ vẫn dùng được.

### C4. Bỏ bước thừa (nhóm B)

| Task | Việc | Test liên quan |
|---|---|---|
| C4.1 | Quét QR khớp thì tự chuyển sang màn nhập, bỏ nút "Tiếp tục nhập giao dịch" | `container-code.test.ts` |
| C4.2 | Ô nhập tay mã can để trống, không điền sẵn `stop.container_code` (vá lỗ hổng bỏ qua quét QR) | `container-code.test.ts` |
| C4.3 | Thu xong điểm cuối thì hiện "Đi nộp trạm" ngay trên màn Tuyến, bỏ màn Tóm tắt ca | `collector-flow.test.ts` |
| C4.4 | Gộp "Kết ca" và "Kết thúc ca" thành 1 lần bấm. Dòng giả "Số phiếu nộp trạm: 1" giữ nguyên | `station-delivery.test.ts` |

### C5. Tự động hoá màn nhập thu gom (nhóm B)

| Task | Việc |
|---|---|
| C5.1 | kg và lít tự tính qua lại theo mật độ `DEFAULT_DENSITY_KG_PER_LITER`; ô vừa sửa là ô gốc. Không còn trường hợp ô lít điền sẵn làm 2 số mâu thuẫn |
| C5.2 | Chọn hạng C hoặc tick "Nghi ngờ pha lẫn" thì chất lượng tự chuyển "Cần kiểm tra" (vẫn sửa được) |
| C5.3 | Tự lấy GPS khi mở màn nhập; nút "Lấy lại GPS" chỉ hiện khi lỗi |
| C5.4 | AI (thuật toán trên máy) tin cậy cao và chưa chọn hạng thì chọn sẵn, ghi "AI chọn sẵn" |
| C5.5 | Bước nộp trạm: chọn sẵn trạm gần nhất còn đủ sức chứa |

- Mỗi task có test hàm thuần; `collection-entry-validation`, `oil-grade-selector.test.ts`,
  `grade-photo-picker.test.ts`, `oil-image-analyzer.test.ts` vẫn pass.

### C6. Ẩn thông tin kỹ thuật (nhóm A)

- UUID đầy đủ, "provider/model" của AI, "Mã giao dịch" chuyển vào phần "Chi tiết" thu gọn.

**Kết thúc giai đoạn C:** chụp màn hình trước/sau toàn bộ màn Collector, báo cáo, chờ duyệt.

---

## Giai đoạn I1: Google Maps cho trạm

| Task | Việc | File |
|---|---|---|
| I1.1 | Admin nhập vị trí trạm: gõ địa chỉ → gợi ý Places API (New) → chọn → kéo ghim xác nhận. Giữ ô nhập tay lat/lng làm dự phòng | `apps/admin/src/components/stations-view.tsx` |
| I1.2 | Backend: gợi ý trạm theo đường đi xe máy bằng Routes API (Compute Route Matrix, `TWO_WHEELER`); lỗi/timeout thì dùng `ST_Distance` hiện có | `apps/api/src/modules/stations/` |
| I1.3 | Collector: tính gợi ý trạm lúc "Bắt đầu ca" và lưu trên máy; mất mạng dùng bản đã lưu | `apps/miniapp/src/lib/offline-cache.ts`, `StationDeliveryFlow.tsx` |

- Key: `GOOGLE_MAPS_SERVER_KEY` (backend, giới hạn IP + Routes/Places),
  `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` (admin, giới hạn referrer). Đặt hạn mức/ngày và cảnh báo
  ngân sách trên Google Cloud.
- **Nghiệm thu:** tắt mạng hoặc dùng key sai thì app vẫn gợi ý trạm (đường chim bay); có test e2e
  backend cho nhánh dự phòng.

## Giai đoạn I2: Đọc giọng nói (TTS)

| Task | Việc |
|---|---|
| I2.1 | Backend module `tts`: `POST /api/v1/tts` (JWT, rate limit), nhận mẫu câu + tham số; lớp `TtsProvider` với 2 nhà cung cấp Zalo AI và Gemini; lưu âm thanh theo hash |
| I2.2 | So sánh thử 2 nhà cung cấp với các câu mẫu của Collector (chất lượng giọng, độ trễ, tỷ lệ lỗi), chủ dự án chọn nhà cung cấp chính |
| I2.3 | Collector: tạo sẵn âm thanh cho từng điểm lúc "Bắt đầu ca", lưu trên máy; đọc khi lưu giao dịch xong ("Đã lưu… Điểm tiếp theo…"), khi sai can, khi còn giao dịch chưa đồng bộ lúc kết ca |
| I2.4 | Cài đặt chung: công tắc bật/tắt giọng đọc (thật). Mặc định không đọc số tiền |
| I2.5 | Merchant: nút "Nghe" trên thông báo |

- Key: `ZALO_AI_API_KEY`, `GEMINI_API_KEY`, `GEMINI_TTS_MODEL`.
- Dự phòng: âm thanh đã lưu → nhà cung cấp chính → nhà cung cấp phụ → `speechSynthesis` → chỉ chữ.
- **Cần thử trên máy thật trong Zalo:** chính sách tự phát âm thanh của iOS ("mở khoá" khi bấm
  Bắt đầu ca), khai báo tên miền chứa file âm thanh trong cấu hình Zalo Mini App.

## Giai đoạn I3 (tuỳ chọn): Gợi ý hạng dầu bằng Gemini

- Chỉ chạy khi có mạng, sau thuật toán trên máy, không chặn nút lưu; kết quả chỉ là gợi ý.
- Chỉ làm nếu chủ dự án xác nhận sau giai đoạn I2.

---

## Câu hỏi còn chờ trả lời

1. **M3:** hệ số CO2 đúng là 2.5 hay 2.65 kg/lít?
