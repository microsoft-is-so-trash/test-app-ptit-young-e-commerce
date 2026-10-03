# Tiến độ chuẩn hoá UI v4

File trạng thái **duy nhất** của kế hoạch `docs/KE_HOACH_CHUAN_HOA_UI_V4.md`. Agent đọc file này
đầu mỗi phiên và cập nhật sau mỗi task, theo `.claude/rules/ui-v4-workflow.md`.

Trạng thái task: `chưa làm` · `đang làm` · `bị chặn (Q..)` · `xong`.

## Hiện tại

| | |
|---|---|
| Giai đoạn | C (đang làm) — M đã duyệt |
| Task đang làm | — |
| Đang chờ chủ dự án | — |
| Branch | `ui_version_4` (tạo từ `ui_version_3` ngày 03/10/2026; trùng `origin/ui_version_4`) |
| Cập nhật lần cuối | 03/10/2026 — rà soát đầu giai đoạn M (B2) |

## Quyết định

Ghi theo dạng: ngày — mã câu hỏi — nội dung đã chọn.

- 02/10/2026 — Branch `ui_version_4` tạo từ `ui_version_3`; thứ tự M → C → I1 → I2 → I3; giữ
  nguyên phần giả và dataset demo; thanh điều hướng kiểu A; đã có Google Cloud và Zalo AI.
- 03/10/2026 — Agent tự chạy theo `.claude/rules/ui-v4-workflow.md`; chỉ báo cáo ở cuối mỗi giai
  đoạn hoặc khi cần hỏi; dừng chờ duyệt giữa các giai đoạn.
- 03/10/2026 — Workflow, file tiến độ và mọi thay đổi của kế hoạch nằm trên branch `ui_version_4`.
- 03/10/2026 — Q1 — Hệ số CO2 là **2.5** kg CO2/lít (M3 đưa 2.65 ở `HistoryPage.tsx` về 2.5).
- 03/10/2026 — Q2 — Chọn (a): khi gửi lại hồ sơ, không gửi `ward_id` (bỏ hằng số `WARD_ID` viết cứng), giữ phường hiện tại; không thêm ô chọn phường.
- 03/10/2026 — Q3 — Theo đề xuất: M2 chỉ bỏ ô "Tiền ước tính tuần" ở Trang chủ; việc chuyển danh sách can (kể cả chữ giả "Can HDPE ISCC", "QR-ISCC") từ Tài khoản sang "Của tôi" làm trong M4.
- 03/10/2026 — Q4 — Giữ M5.2 (nhắc báo thu gom khi can ước tính đầy từ 85%). Chỉ thêm điều kiện: can có `capacity_l = null` thì không nhắc.
- 03/10/2026 — Q5–Q9 — Theo đề xuất: (Q5) "Lịch sử thu gom" = nội dung tab Lịch sử + danh sách "Đơn đã huỷ"; đơn đang chờ/đã phân công ở "Hôm nay". (Q6) Mục riêng "Can chuẩn được cấp" ngay sau "Hồ sơ quán", giữ nguyên chữ và nút. (Q7) M6 chỉ đổi nút đăng xuất Merchant thành chữ thường, không thêm hộp xác nhận; 2 `window.confirm` của Collector làm ở giai đoạn C. (Q8) Mục mở rộng mặc định đóng, mở mục này thì mục khác đóng. (Q9) Chỉ nhắc khi can `AT_MERCHANT` và chưa có đơn đang chờ.
- 03/10/2026 — Ràng buộc chung — **Giữ nguyên font**: không đổi font chữ (họ font, cỡ, độ đậm) của phần tử đang có; phần tử mới dùng lại class chữ sẵn có.
- 03/10/2026 — Duyệt M — Chủ dự án duyệt giai đoạn M (sau khi xem kết quả kiểm thử), cho sang giai đoạn C; muốn tự thử trên localhost.
- 03/10/2026 — Q10–Q16 — Theo đề xuất: (Q10) giữ nút "Hàng chờ N" luôn hiện, bỏ khối "Dữ liệu trên máy" ở Tài khoản. (Q11) Dải trạng thái màn Tuyến: lỗi tải/lỗi đồng bộ > mất mạng > hàng chờ > GPS > dữ liệu cũ > biên nhận đã lưu > ca đã sẵn sàng > tải lại thành công; hiện mục cao nhất, bấm mở danh sách đầy đủ giữ nút của từng mục; lỗi Bắt đầu ca vẫn hiện dưới nút; màn khác giữ thông báo mất mạng. (Q12) Đã thu ≥ 1 điểm thì màn Tuyến có nút chữ "Đi nộp trạm", thu xong điểm cuối thành nút chính; dòng "x / y điểm đã thu · z lít"; "Về tóm tắt ca" → "Về tuyến hôm nay"; mở lại app vào thẳng màn Tuyến. (Q13) Không đổi luồng kết ca, C4.4 thêm test chứng minh 1 lần bấm, giữ màn và dòng giả. (Q14) Ô kg và lít để trống; chỉ gửi ô người dùng nhập; ô còn lại ghi "tự tính". (Q15) Trạm gần nhất còn đủ chỗ lên đầu, ghi "Gần nhất còn đủ chỗ", nút của nó là nút chính; không tự chuyển màn. (Q16) Bỏ avatar chỉ ở Collector; Merchant giữ.

## Câu hỏi đang mở

| Mã | Chặn task | Câu hỏi | Đề xuất |
|---|---|---|---|
| T1 | I2.1 | Nhà cung cấp Google cho TTS: Cloud TTS Chirp 3: HD, Gemini 3.8 Flash TTS, hay thử cả hai? | Chirp 3: HD (xem `docs/NGHIEN_CUU_TTS_GOOGLE.md` mục 2.3) |
| T2 | I2.1 | Xác thực với Google: API key chỉ bật Cloud TTS, hay service account (thêm `google-auth-library`)? | API key + hạn mức/ngày + cảnh báo ngân sách |
| T3 | I2.1 | Cache âm thanh phía server bằng Redis (cần `REDIS_URL` trên Render) hay chỉ cache trên máy? | Redis nếu Render đã có `REDIS_URL`; nếu không thì chỉ cache trên máy |
| T4 | I2.1 | Rate limit: tự viết bằng Redis `INCR` hay thêm `@nestjs/throttler`? | `@nestjs/throttler` (thư viện chuẩn của NestJS) |
| T5 | I2.3, I2.4 | Giọng đọc Collector mặc định bật hay tắt? | Bật cho Collector, tắt cho Merchant; số tiền luôn mặc định tắt |
| T6 | I2.2 | Giọng miền Bắc/Nam, nam/nữ? | Chọn sau khi nghe thử ở I2.2 |
| T7 | I2.1 | Ngân sách tháng để đặt cảnh báo trên Google Cloud? | 5 USD |

Câu T1–T7 chỉ chặn giai đoạn I2, chưa cần trả lời trước khi làm M và C.

## Bảng task

### Giai đoạn M — Merchant

| Mã | Nhóm | Trạng thái | Commit | Ghi chú |
|---|---|---|---|---|
| M1 | B | xong | (commit này) | Bỏ WARD_ID cứng; payload gửi lại hồ sơ tạo bằng lib/merchant-resubmit.ts, test merchant-resubmit.test.ts (3). Không đổi giao diện nên không chụp ảnh. Cổng kiểm tra pass (153 test). |
| M2 | A | xong | (commit này) | Bỏ ô "Tiền ước tính tuần"/"Tiền chốt tuần" ở lưới thống kê Trang chủ (tiền tuần chỉ còn ở thẻ lớn); "Lần thu gom gần nhất" xếp cạnh "Lít tháng này". Phần chuyển danh sách can làm trong M4 (Q3). Ảnh: design/snapshots/ui-v4/M2/. Cổng kiểm tra pass. |
| M3 | B | xong | (commit này) | Thêm CO2_KG_PER_LITER = 2.5 vào @eco-oil/shared-types; HistoryPage (trước 2.65), GreenJourneyPage, CollectorStatsPage, co2-report-pdf dùng chung. Lịch sử: 1.073 lít → 2682.5 kg CO2e (trước 2843.4). Test co2-factor.test.ts (4, có kiểm tra không màn nào tự khai báo hệ số). Typecheck shared-types/api/admin pass. Ảnh: design/snapshots/ui-v4/M3/. |
| M4 | B | xong | (commit này) | Thanh dưới đáy 2 nút có chữ Hôm nay/Của tôi (lib/merchant-nav.ts). Hôm nay = Trang chủ cũ + thẻ "Đơn đang mở" (đơn chờ/đã phân công, kèm Huỷ). Của tôi = 7 mục mở rộng (MinePage.tsx): Lịch sử thu gom (+ Đơn đã huỷ), Tiền theo kỳ, Hành trình xanh, Hồ sơ quán, Can chuẩn được cấp, Mời bạn, Cài đặt chung. AccountPage tách thành các section; OrdersPage bỏ (bộ lọc đơn bỏ theo Q5). Mọi nội dung cũ tối đa 2 chạm. Test merchant-nav (5) + demo-parts-preserved (giữ 21 chuỗi phần giả). Đã chạy code-reviewer: không CRITICAL/HIGH; sửa 4 điểm MEDIUM (icon trang trí aria-hidden, báo lỗi + Thử lại khi tải đơn lỗi, báo lỗi khi huỷ đơn lỗi, aria-controls). Chưa thấy trực quan thẻ Đơn đang mở vì dataset demo không có đơn mở. Ảnh: design/snapshots/ui-v4/M4/. |
| M5.1 | B | xong | (commit này) | OrderSheet điền sẵn số lít = estimated_liters của can đang ở quán (làm tròn 0,1, không vượt dung tích), nhãn "(tự tính)" + dòng giải thích; sửa tay thì giữ số người dùng nhập (lib/order-liters.ts, không dùng useEffect). Báo sẵn sàng chỉ cần bấm Báo ngay. Test order-liters (6). Ảnh: design/snapshots/ui-v4/M5.1/. |
| M5.2 | B | xong | (commit này) | buildNotifications thêm thông báo "Can sắp đầy" khi can AT_MERCHANT có dung tích và ước tính ≥ 85%, chỉ khi chưa có đơn đang chờ (Q4, Q9). Công tắc giả ở Cài đặt chung giữ nguyên, không nối vào. 5 test mới trong notifications.test.ts. Dataset demo có can 70% nên không thấy trên màn hình; kiểm bằng test. |
| M5.3 | B | xong | (commit này) | Trạng thái đã đọc lưu qua zaloClient storage, khoá eco_oil.notifications_read.<userId>, tối đa 100 khoá (lib/notification-read.ts). Mỗi thông báo có readKey: id bản ghi (thanh toán, giá dầu) hoặc id + thời điểm sự kiện (đơn chờ, lần thu gom, can đầy) để sự kiện mới cùng loại lại hiện chưa đọc. Test notification-read (6). Đã thử tải lại: 3/4 thông báo giữ trạng thái đã đọc; "Đã thu gom thành công" trong dataset demo bị tính lại thời điểm theo giờ hiện tại mỗi lần tải nên hiện chưa đọc lại (dữ liệu thật không bị). Ảnh: design/snapshots/ui-v4/M5.3/. |
| M5.4 | B | xong | (commit này) | Nút "Sẵn sàng thu gom" hiện dòng lý do khi bị khoá (đơn đang chờ / can đang chở đi / chưa được cấp can) qua lib/merchant-blockers.ts; nút gửi hồ sơ (MerchantApprovalView) liệt kê trường còn thiếu; nút "Gửi hồ sơ đăng ký" ở màn đăng nhập ghi "Chọn phường để gửi hồ sơ.". OrderSheet, sửa thông tin quán, yêu cầu can đã có dòng lỗi sẵn. Test merchant-blockers (6). Dataset demo không giữ đơn mới nên không chụp được trạng thái khoá; kiểm bằng test. |
| M6 | A | xong | (commit này) | Nút đăng xuất trong Cài đặt chung: chữ thường "Đăng xuất", bỏ btn-lg (không còn nút lớn); giữ class btn-danger để font giữ nguyên 14px/700 theo ràng buộc giữ font. Không thêm hộp xác nhận (Q7). Ảnh: design/snapshots/ui-v4/M6/ (ảnh bị lệch khung do công cụ chụp, nội dung đúng). |

### Giai đoạn C — Collector

| Mã | Nhóm | Trạng thái | Commit | Ghi chú |
|---|---|---|---|---|
| C1 | B | xong | (commit này) | Màn Tuyến còn 1 dải trạng thái (CollectorStatusStrip) xếp theo Q11 (lib/collector-status.ts): mục cao nhất hiện sẵn, "Xem thêm n trạng thái" mở cả danh sách, mỗi mục giữ nút gốc (Thử lại, Xem hàng chờ, Xem lại biên nhận, Hủy ca; Hủy ca bị khoá thì ghi lý do). Mất mạng ở màn Tuyến vào dải; màn khác giữ thông báo cũ. Nút "Hàng chờ N" giữ nguyên (Q10). Test collector-status (7); outbox, collector-flow vẫn pass. Lưu ý: 2 file Collector có lẫn CRLF, đã giữ nguyên kiểu xuống dòng gốc. Ảnh: design/snapshots/ui-v4/C1/. |
| C2 | B | xong | (commit này) | Thanh dưới đáy 2 nút có chữ Ca hôm nay / Của tôi (lib/collector-nav.ts). Ca hôm nay: màn Tuyến + nút chuyển Danh sách/Bản đồ (nội dung tab Bản đồ cũ). Của tôi: 4 mục mở rộng (Đã thu và thống kê, Hồ sơ và xe, Địa bàn, Cài đặt chung); dùng chung MineAccordion với Merchant. Bỏ: phần Cần thu hôm nay, nút Thoát trên header, avatar Collector (Q16), khối Dữ liệu trên máy (Q10). Đăng xuất chỉ còn ở Cài đặt chung; 2 window.confirm của Collector (đăng xuất khi còn hàng chờ, hủy ca) thay bằng ConfirmDialog trong app (Q7). Giữ ẩn thanh tab ở màn thao tác dở. Test collector-nav (4). Ảnh: design/snapshots/ui-v4/C2/. |
| C3 | B | xong | (commit này) | Thẻ điểm thu khi đóng chỉ còn 1 nút "Thu gom" (kèm lý do khi bị khoá). Bấm vào phần thông tin thẻ (bàn phím: Enter/Space) mở menu Gọi quán, Chỉ đường, Sao chép số, Chi tiết AI; nút không dùng được ghi lý do (lib/stop-card-menu.ts). Test stop-card-menu (4; viết cùng lúc với hàm, không có bước RED riêng). Ảnh: design/snapshots/ui-v4/C3/. |
| C4.1 | B | chưa làm | | |
| C4.2 | B | chưa làm | | |
| C4.3 | B | chưa làm | | |
| C4.4 | B | chưa làm | | |
| C5.1 | B | chưa làm | | |
| C5.2 | B | chưa làm | | |
| C5.3 | B | chưa làm | | |
| C5.4 | B | chưa làm | | |
| C5.5 | B | chưa làm | | |
| C6 | A | chưa làm | | |

### Giai đoạn I1 — Google Maps cho trạm

| Mã | Nhóm | Trạng thái | Commit | Ghi chú |
|---|---|---|---|---|
| I1.1 | B | chưa làm | | |
| I1.2 | B | chưa làm | | |
| I1.3 | B | chưa làm | | |

### Giai đoạn I2 — Đọc giọng nói (TTS)

| Mã | Nhóm | Trạng thái | Commit | Ghi chú |
|---|---|---|---|---|
| I2.1 | B | bị chặn (T1–T4, T7) | | |
| I2.2 | B | bị chặn (T6) | | |
| I2.3 | B | bị chặn (T5) | | |
| I2.4 | B | bị chặn (T5) | | |
| I2.5 | B | chưa làm | | Làm sau I2.1 (cần endpoint `/tts`) |

### Giai đoạn I3 — Gợi ý hạng dầu bằng Gemini (tuỳ chọn)

| Mã | Nhóm | Trạng thái | Commit | Ghi chú |
|---|---|---|---|---|
| I3 | B | chưa làm | | Chỉ làm nếu chủ dự án xác nhận sau I2 |

## Phát hiện ngoài phạm vi

Ghi những vấn đề thấy được nhưng không thuộc kế hoạch; không tự sửa.

- 03/10/2026 — Trang chủ Merchant tính "tiền ước tính" bằng `VITE_ESTIMATED_PRICE_PER_LITER` (8.000đ) trong khi giá dầu từ API là 20.000đ (`HomePage.tsx:11`); vi phạm U11 nhưng không thuộc task nào của giai đoạn M.
- 03/10/2026 — `apps/api` chưa có cơ chế rate limit cho bất kỳ endpoint nào (liên quan quy tắc
  bảo mật chung, không chỉ TTS).

## Báo cáo giai đoạn

### Giai đoạn M — 03/10/2026

- Đã làm: M1, M2, M3, M4, M5.1, M5.2, M5.3, M5.4, M6 (mỗi task một commit trên `ui_version_4`).
- Cổng kiểm tra cuối: typecheck, lint, build pass; 186/186 test pass (trước giai đoạn: 150).
- Review: code-reviewer chạy 2 lần (M4; M5.1–M6). Không có CRITICAL/HIGH. Đã sửa 5 điểm MEDIUM.
- Ảnh trước: `design/snapshots/ui-v4/M-before/`; ảnh sau theo từng task: `design/snapshots/ui-v4/M2` … `M6`.
- Thẻ "Đơn đang mở", nhắc "Can sắp đầy", dòng lý do nút khoá: đã kiểm trên màn hình bằng dữ liệu giả lập trong trình duyệt (xem nhật ký) và bằng test.
- Giới hạn của dữ liệu demo: thông báo "Đã thu gom thành công" hiện lại chưa đọc sau khi tải lại vì dataset demo tính lại thời điểm theo giờ hiện tại.

## Nhật ký

Mới nhất lên trên. Mỗi dòng: ngày — task — việc đã làm / lý do dừng.

- 03/10/2026 — C3 — xong. Thẻ điểm thu khi đóng chỉ còn 1 nút "Thu gom" (kèm lý do khi bị khoá). Bấm vào phần thông tin thẻ (bàn phím: Enter/Space) mở menu Gọi quán, Chỉ đường, Sao chép số, Chi tiết AI; nút không dùng được ghi lý do (lib/stop-card-menu.ts). Test stop-card-menu (4; viết cùng lúc với hàm, không có bước RED riêng). Ảnh: design/snapshots/ui-v4/C3/.
- 03/10/2026 — C2 — xong. Thanh dưới đáy 2 nút có chữ Ca hôm nay / Của tôi (lib/collector-nav.ts). Ca hôm nay: màn Tuyến + nút chuyển Danh sách/Bản đồ (nội dung tab Bản đồ cũ). Của tôi: 4 mục mở rộng (Đã thu và thống kê, Hồ sơ và xe, Địa bàn, Cài đặt chung); dùng chung MineAccordion với Merchant. Bỏ: phần Cần thu hôm nay, nút Thoát trên header, avatar Collector (Q16), khối Dữ liệu trên máy (Q10). Đăng xuất chỉ còn ở Cài đặt chung; 2 window.confirm của Collector (đăng xuất khi còn hàng chờ, hủy ca) thay bằng ConfirmDialog trong app (Q7). Giữ ẩn thanh tab ở màn thao tác dở. Test collector-nav (4). Ảnh: design/snapshots/ui-v4/C2/.
- 03/10/2026 — C1 — xong. Màn Tuyến còn 1 dải trạng thái (CollectorStatusStrip) xếp theo Q11 (lib/collector-status.ts): mục cao nhất hiện sẵn, "Xem thêm n trạng thái" mở cả danh sách, mỗi mục giữ nút gốc (Thử lại, Xem hàng chờ, Xem lại biên nhận, Hủy ca; Hủy ca bị khoá thì ghi lý do). Mất mạng ở màn Tuyến vào dải; màn khác giữ thông báo cũ. Nút "Hàng chờ N" giữ nguyên (Q10). Test collector-status (7); outbox, collector-flow vẫn pass. Lưu ý: 2 file Collector có lẫn CRLF, đã giữ nguyên kiểu xuống dòng gốc. Ảnh: design/snapshots/ui-v4/C1/.
- 03/10/2026 — B2 giai đoạn C — Đọc toàn bộ màn Collector (CollectorFlow, Shell, Route, QR, Entry, Summary, StationDeliveryFlow, Schedule, Stats, Account, Map, Outbox, SavedReceipt). Ảnh trước: `design/snapshots/ui-v4/C-before/`. Dừng hỏi Q10–Q16.
- 03/10/2026 — Kiểm thử giai đoạn M (theo yêu cầu chủ dự án, trước khi duyệt) — Chạy thử trên app demo khung 375×812: 2 tab, Hôm nay, màn báo sẵn sàng (điền sẵn, sửa tay, vượt dung tích), 7 mục Của tôi (mỗi lần chỉ mở 1 mục, không lỗi tải, đủ 19 chuỗi phần giả), sheet sửa thông tin và yêu cầu can, chuyển tuần ở Tiền theo kỳ. Giả lập trong bộ nhớ trình duyệt (không sửa file): đơn đang chờ (nút khoá + lý do, thẻ Đơn đang mở, hộp xác nhận huỷ), đơn đã huỷ trong Lịch sử, can 90% (thông báo Can sắp đầy, điền sẵn 27 lít), can đang chở (nút khoá + lý do, không nhắc). Tất cả đúng. Không có lỗi console mới.
- 03/10/2026 — B8 giai đoạn M — Review M5.1–M6: sửa gợi ý "Chọn phường để gửi hồ sơ." ở màn đăng ký chỉ hiện khi thật sự có ô chọn phường. Ghi báo cáo giai đoạn, dừng chờ duyệt.
- 03/10/2026 — M6 — xong. Nút đăng xuất trong Cài đặt chung: chữ thường "Đăng xuất", bỏ btn-lg (không còn nút lớn); giữ class btn-danger để font giữ nguyên 14px/700 theo ràng buộc giữ font. Không thêm hộp xác nhận (Q7). Ảnh: design/snapshots/ui-v4/M6/ (ảnh bị lệch khung do công cụ chụp, nội dung đúng).
- 03/10/2026 — M5.4 — xong. Nút "Sẵn sàng thu gom" hiện dòng lý do khi bị khoá (đơn đang chờ / can đang chở đi / chưa được cấp can) qua lib/merchant-blockers.ts; nút gửi hồ sơ (MerchantApprovalView) liệt kê trường còn thiếu; nút "Gửi hồ sơ đăng ký" ở màn đăng nhập ghi "Chọn phường để gửi hồ sơ.". OrderSheet, sửa thông tin quán, yêu cầu can đã có dòng lỗi sẵn. Test merchant-blockers (6). Dataset demo không giữ đơn mới nên không chụp được trạng thái khoá; kiểm bằng test.
- 03/10/2026 — M5.3 — xong. Trạng thái đã đọc lưu qua zaloClient storage, khoá eco_oil.notifications_read.<userId>, tối đa 100 khoá (lib/notification-read.ts). Mỗi thông báo có readKey: id bản ghi (thanh toán, giá dầu) hoặc id + thời điểm sự kiện (đơn chờ, lần thu gom, can đầy) để sự kiện mới cùng loại lại hiện chưa đọc. Test notification-read (6). Đã thử tải lại: 3/4 thông báo giữ trạng thái đã đọc; "Đã thu gom thành công" trong dataset demo bị tính lại thời điểm theo giờ hiện tại mỗi lần tải nên hiện chưa đọc lại (dữ liệu thật không bị). Ảnh: design/snapshots/ui-v4/M5.3/.
- 03/10/2026 — M5.2 — xong. buildNotifications thêm thông báo "Can sắp đầy" khi can AT_MERCHANT có dung tích và ước tính ≥ 85%, chỉ khi chưa có đơn đang chờ (Q4, Q9). Công tắc giả ở Cài đặt chung giữ nguyên, không nối vào. 5 test mới trong notifications.test.ts. Dataset demo có can 70% nên không thấy trên màn hình; kiểm bằng test.
- 03/10/2026 — M5.1 — xong. OrderSheet điền sẵn số lít = estimated_liters của can đang ở quán (làm tròn 0,1, không vượt dung tích), nhãn "(tự tính)" + dòng giải thích; sửa tay thì giữ số người dùng nhập (lib/order-liters.ts, không dùng useEffect). Báo sẵn sàng chỉ cần bấm Báo ngay. Test order-liters (6). Ảnh: design/snapshots/ui-v4/M5.1/.
- 03/10/2026 — M4 — xong. Thanh dưới đáy 2 nút có chữ Hôm nay/Của tôi (lib/merchant-nav.ts). Hôm nay = Trang chủ cũ + thẻ "Đơn đang mở" (đơn chờ/đã phân công, kèm Huỷ). Của tôi = 7 mục mở rộng (MinePage.tsx): Lịch sử thu gom (+ Đơn đã huỷ), Tiền theo kỳ, Hành trình xanh, Hồ sơ quán, Can chuẩn được cấp, Mời bạn, Cài đặt chung. AccountPage tách thành các section; OrdersPage bỏ (bộ lọc đơn bỏ theo Q5). Mọi nội dung cũ tối đa 2 chạm. Test merchant-nav (5) + demo-parts-preserved (giữ 21 chuỗi phần giả). Đã chạy code-reviewer: không CRITICAL/HIGH; sửa 4 điểm MEDIUM (icon trang trí aria-hidden, báo lỗi + Thử lại khi tải đơn lỗi, báo lỗi khi huỷ đơn lỗi, aria-controls). Chưa thấy trực quan thẻ Đơn đang mở vì dataset demo không có đơn mở. Ảnh: design/snapshots/ui-v4/M4/.
- 03/10/2026 — M3 — xong. Thêm CO2_KG_PER_LITER = 2.5 vào @eco-oil/shared-types; HistoryPage (trước 2.65), GreenJourneyPage, CollectorStatsPage, co2-report-pdf dùng chung. Lịch sử: 1.073 lít → 2682.5 kg CO2e (trước 2843.4). Test co2-factor.test.ts (4, có kiểm tra không màn nào tự khai báo hệ số). Typecheck shared-types/api/admin pass. Ảnh: design/snapshots/ui-v4/M3/.
- 03/10/2026 — M2 — xong. Bỏ ô "Tiền ước tính tuần"/"Tiền chốt tuần" ở lưới thống kê Trang chủ (tiền tuần chỉ còn ở thẻ lớn); "Lần thu gom gần nhất" xếp cạnh "Lít tháng này". Phần chuyển danh sách can làm trong M4 (Q3). Ảnh: design/snapshots/ui-v4/M2/. Cổng kiểm tra pass.
- 03/10/2026 — M1 — xong. Bỏ WARD_ID cứng; payload gửi lại hồ sơ tạo bằng lib/merchant-resubmit.ts, test merchant-resubmit.test.ts (3). Không đổi giao diện nên không chụp ảnh. Cổng kiểm tra pass (153 test).
- 03/10/2026 — B2 giai đoạn M — Đọc toàn bộ file của M1–M6, chụp ảnh trước (`design/snapshots/ui-v4/M-before/`), thêm cấu hình `eco-oil-miniapp-demo` vào `.claude/launch.json`. Dừng hỏi Q5–Q9.
- 03/10/2026 — B0 — Tạo branch `ui_version_4` từ `ui_version_3`. Cài Node 22.23.3 (`pnpm env use --global 22`) và wrapper git của host ở `~/.local/share/agent-tools/bin`. `pnpm install` xong. Cổng kiểm tra miniapp trên code gốc: typecheck, lint, build pass; test 150/150 pass. Repo không có Playwright; có `google-chrome` để chụp màn hình headless.
- 03/10/2026 — Tạo file tiến độ, quy trình tự thực thi và nghiên cứu TTS Google. Chưa sửa code.
