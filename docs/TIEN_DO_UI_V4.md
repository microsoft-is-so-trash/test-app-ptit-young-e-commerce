# Tiến độ chuẩn hoá UI v4

File trạng thái **duy nhất** của kế hoạch `docs/KE_HOACH_CHUAN_HOA_UI_V4.md`. Agent đọc file này
đầu mỗi phiên và cập nhật sau mỗi task, theo `.claude/rules/ui-v4-workflow.md`.

Trạng thái task: `chưa làm` · `đang làm` · `bị chặn (Q..)` · `xong`.

## Hiện tại

| | |
|---|---|
| Giai đoạn | I1 — đang làm (I1.3 xong) |
| Task đang làm | I1.2 |
| Đang chờ chủ dự án | — |
| Branch | `ui_version_4` (tạo từ `ui_version_3` ngày 03/10/2026; trùng `origin/ui_version_4`) |
| Cập nhật lần cuối | 03/10/2026 — nhận trả lời Q17–Q24 và ràng buộc chi phí Google |

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

- 03/10/2026 — Society Charter — Chủ dự án duyệt mục 2 của kế hoạch: (S-1) một luồng ghi, tác tử phụ chỉ đọc, dùng ở B2 (I2), B6, B8; (S-2) trần **12 lần** gọi tác tử phụ mỗi giai đoạn (chủ dự án ghi "chặt hơn" nhưng con số 12 lớn hơn đề xuất 9; áp dụng con số 12, mỗi vai không quá 3); (S-3) tạo agent `.claude/agents/ui-v4-verifier.md`; (S-4) sửa `.claude/rules/ui-v4-workflow.md` (B2, B3, B6, B8).
- 03/10/2026 — Duyệt C — Chủ dự án duyệt giai đoạn C, cho sang giai đoạn I1.
- 03/10/2026 — Q17–Q24 — (Q17) Thêm task **I1.0**: sửa test api đang đỏ trên CI trước khi làm I1.2. (Q18) Places API (New) gọi qua backend, endpoint chỉ ADMIN, `GOOGLE_MAPS_SERVER_KEY`. (Q19) Bản đồ ghim trong form trạm dùng Google Maps JavaScript; toạ độ lưu là vị trí ghim admin xác nhận. (Q20) Lúc Bắt đầu ca lưu danh sách trạm trên máy (Dexie version 3, bảng `stationCache`, S5 đã duyệt); mất mạng tính đường chim bay trên máy; cho phép lấy trạm khi chưa biết số lít. (Q21) Render đã có `REDIS_URL`; thêm `@nestjs/throttler` (S5 đã duyệt) chỉ cho endpoint gọi API trả phí; cache trong Redis. Khoá Redis mới dùng tiền tố riêng `maps:` (khoá hiện có của `ui_version_3` đều là `auth:`), không xoá/đổi khoá cũ, không dùng `FLUSHDB`/`FLUSHALL`. (Q22) Key backend giới hạn theo API (Routes + Places New) + hạn mức/ngày, không giới hạn IP; key giao diện giới hạn referrer tên miền admin + `localhost`, chỉ Maps JavaScript; chủ dự án tự tạo và đặt key; không có key thì agent dùng nhà cung cấp giả lập. (Q23) Timeout 3 s, thử lại tối đa 2 lần, tối đa 25 trạm gần nhất, làm tròn vị trí 3 chữ số thập phân, cache 10 phút, xếp theo quãng đường xe máy, dự phòng ghi "đường chim bay" (`distance_source`). (Q24) Kẹt "Đang lưu…": chủ dự án thử máy thật; giá ước tính: task nhỏ riêng sau I1; rate limit toàn API: ngoài I1; CI đỏ: I1.0.
- 03/10/2026 — Q25–Q27 — (Q25) Phương án (a) nhưng dùng dữ liệu **`seed-demo`**: CI vẫn seed bằng `pnpm db:seed` (`scripts/seed-demo.ts`, không sửa file này); sửa các test e2e api để chạy trên dữ liệu seed-demo (chủ dự án cho phép sửa test có sẵn cho việc này); dữ liệu test cần thêm (can, đơn, giao dịch…) do từng test tự tạo. (Q26) Theo đề xuất (a): Routes **Essentials** (`DRIVE`, `TRAFFIC_UNAWARE`), tối đa 5 trạm gần nhất mỗi lần, bộ đếm tháng trong Redis `maps:route-matrix:elements:<YYYY-MM>` tự dừng ở 8.000 rồi dùng `ST_Distance`, ghi "đường ô tô" cạnh số km. (Q27) Theo đề xuất (a): làm I1.1 kèm lớp chặn (session token, ≥ 3 ký tự + 300 ms, endpoint chỉ ADMIN có rate limit, bộ đếm tháng tự dừng ở 8.000 mỗi SKU, bản đồ chỉ tải khi mở form trạm).
- 03/10/2026 — **Nguyên tắc offline-first** — App phải lưu dữ liệu trên máy và tải lên máy chủ khi có mạng; khi mất mạng mọi chức năng vẫn phải hoạt động bình thường.
- 03/10/2026 — **Ràng buộc chi phí Google (áp dụng mọi giai đoạn)** — Chi phí Google Maps API và Google AI API (Gemini, Cloud TTS) phải là **0 đồng**. Bước nào có dấu hiệu phát sinh phí (vượt hoặc có thể vượt mức miễn phí, SKU không có mức miễn phí, cần trả trước) → dừng hỏi (S15), kèm phương án thay thế vẫn giữ ổn định.

## Câu hỏi đang mở

| Mã | Chặn task | Câu hỏi | Đề xuất |
|---|---|---|---|
| T1 | I2.1 | Nhà cung cấp Google cho TTS: Cloud TTS Chirp 3: HD, Gemini 3.8 Flash TTS, hay thử cả hai? | Chirp 3: HD (xem `docs/NGHIEN_CUU_TTS_GOOGLE.md` mục 2.3) |
| T2 | I2.1 | Xác thực với Google: API key chỉ bật Cloud TTS, hay service account (thêm `google-auth-library`)? | API key + hạn mức/ngày + cảnh báo ngân sách |
| T3 | I2.1, I1.2 (qua Q21) | Cache âm thanh phía server bằng Redis (cần `REDIS_URL` trên Render) hay chỉ cache trên máy? | Redis nếu Render đã có `REDIS_URL`; nếu không thì chỉ cache trên máy |
| T4 | I2.1, I1.2 (qua Q21) | Rate limit: tự viết bằng Redis `INCR` hay thêm `@nestjs/throttler`? | `@nestjs/throttler` (thư viện chuẩn của NestJS) |
| T5 | I2.3, I2.4 | Giọng đọc Collector mặc định bật hay tắt? | Bật cho Collector, tắt cho Merchant; số tiền luôn mặc định tắt |
| T6 | I2.2 | Giọng miền Bắc/Nam, nam/nữ? | Chọn sau khi nghe thử ở I2.2 |
| T7 | I2.1 | Ngân sách tháng để đặt cảnh báo trên Google Cloud? | 5 USD |

T1, T2, T5, T6, T7 chỉ chặn giai đoạn I2. T3, T4 đã có câu trả lời cho I1 qua Q21 (Redis có sẵn trên Render, `@nestjs/throttler`).

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
| C4.1 | B | xong | (commit này) | Mã can khớp điểm thì tự chuyển sang màn nhập; bỏ thẻ "Đã đối chiếu" và nút "Tiếp tục nhập giao dịch" (containerMatchOutcome). Không khớp vẫn dừng với thông báo "Đây không phải can của điểm này". Dòng "Dữ liệu lúc …" của thẻ đối chiếu (khi dùng dữ liệu can đã lưu) không còn hiện ở màn này. Đã thử trên demo: mã sai báo lỗi, mã đúng sang màn Ghi nhận thu gom. Test thêm trong container-code.test.ts. |
| C4.2 | B | xong | (commit này) | Ô nhập tay mã can để trống (INITIAL_MANUAL_CONTAINER_CODE), không còn điền sẵn mã của điểm; nhãn đổi thành "Không quét được? Nhập mã in trên can". Test trong container-code.test.ts. Cùng commit với C4.1. |
| C4.3 | B | xong | (commit này) | Bỏ màn Tóm tắt ca (xoá CollectorSummaryScreen). Màn Tuyến: dòng "x / y điểm đã thu · z lít"; đã thu ≥ 1 điểm có nút chữ "Đi nộp trạm", thu hết điểm thì thành nút chính (lib/route-delivery.ts, Q12). "Về tóm tắt ca" → "Về tuyến hôm nay"; mở lại app khi ca dở vào thẳng màn Tuyến. Đã thử trên demo: sau 1 giao dịch dòng tiến độ hiện "1 / 4 điểm đã thu · 20 lít | Đi nộp trạm". Test thêm 3 trong collector-flow.test.ts. Phát hiện màn nhập kẹt "Đang lưu…" khi khung ẩn, có từ trước (xem Phát hiện ngoài phạm vi). |
| C4.4 | B | xong | (commit này) | Theo Q13 không đổi luồng: bấm "Kết ca" ở biên nhận đã kết ca luôn. Tách logic thành closeShiftAfterReceipt (lưu biên nhận → kết ca, không qua màn trung gian) và thêm 3 test trong station-delivery.test.ts chứng minh 1 lần bấm, báo lỗi khi kết ca bị từ chối, không kết ca khi chưa lưu được biên nhận. Màn "Ca làm đã khép lại" và dòng giả "Số phiếu nộp trạm: 1" giữ nguyên. |
| C5.1 | B | xong | (commit này) | Ô kg và lít để trống lúc đầu (Q14, không còn điền số quán khai). Ô nhập sau cùng là ô gốc, ô kia tự tính theo DEFAULT_DENSITY_KG_PER_LITER và ghi "(tự tính)" (lib/mass-entry.ts, không dùng useEffect). Chỉ gửi ô gốc: kg → actual_kg, lít → actual_liters. Đã thử: nhập 18,2 kg → 20.0 lít tự tính; nhập 12 lít → 10.9 kg tự tính, nhãn kg đổi thành "Khối lượng (tự tính)". Test mass-entry (5). Ảnh: design/snapshots/ui-v4/C5/. |
| C5.2 | B | xong | (commit này) | Khối "Chất lượng dầu" gộp vào khối "Phân hạng dầu" (bớt 1 khối). Chất lượng tự chọn: hạng C hoặc nghi pha lẫn → "Cần kiểm tra", còn lại "Đạt", ghi "(tự chọn)" + dòng giải thích; bấm tay thì giữ lựa chọn của người dùng (lib/grade-automation.ts resolveQuality). Đã thử trên demo: chọn C → Cần kiểm tra; đổi A → Đạt; tick nghi pha lẫn → Cần kiểm tra; bấm Đạt tay → bỏ nhãn tự chọn. Test grade-automation (5). Ảnh: design/snapshots/ui-v4/C5/. |
| C5.3 | B | xong | (commit này) | Mở màn nhập là tự lấy GPS (effect một lần, lib/entry-gps.ts); nút "Lấy lại GPS" chỉ hiện khi lỗi hoặc đang dùng tâm phường; lỗi GPS hiện ngay trong khối vị trí kèm cách sửa, không còn đổ vào khung lỗi chung. Đã thử trên demo (khung trình duyệt từ chối quyền vị trí): hiện "Chưa lấy được GPS: Quyền vị trí đã bị từ chối…" + nút Lấy lại GPS. Cùng commit sửa lỗi phụ của C5.1: khi ô kg/lít còn trống không còn đòi xác nhận cảnh báo chênh lệch (litersForDeviationCheck). Test entry-gps (4) + 1 test mass-entry. Ảnh: design/snapshots/ui-v4/C5/. |
| C5.4 | B | xong | (commit này) | Phân tích ảnh xong với độ tin cậy cao và người thu gom chưa chọn hạng thì AI chọn sẵn hạng gợi ý (aiPreselectGrade, cập nhật bằng hàm cập nhật nên không ghi đè hạng người dùng vừa chọn), hiện dòng "AI chọn sẵn hạng X (tin cậy cao)…" (isAiPreselected); người dùng bấm hạng khác hoặc "Dùng gợi ý" thì bỏ dòng này. Test grade-automation (+1). Chưa xem được trên màn hình vì cần ảnh thật cho kết quả tin cậy cao; kiểm bằng test. |
| C5.5 | B | xong | (commit này) | Màn chọn trạm: trạm gần nhất còn đủ chỗ cho số lít đang mang lên đầu, ghi "Gần nhất còn đủ chỗ", nút "Chọn trạm này" của nó là nút chính, trạm khác nút phụ (U3); các trạm còn lại giữ thứ tự từ máy chủ; không tự chuyển màn (Q15, lib/station-delivery.ts orderStationsForDelivery). Đã thử trên demo: Long Biên 5.4 km lên đầu kèm nhãn. Test +2 trong station-delivery.test.ts (sửa kỳ vọng thứ tự của chính test mới viết). Ảnh: design/snapshots/ui-v4/C5/. |
| C6 | A | xong | (commit này) | Mã kỹ thuật chuyển vào phần "Chi tiết" thu gọn (TechDetails, thẻ details): Mã giao dịch và provider/model AI ở màn nhập, UUID ở hàng chờ đồng bộ, Mã phiếu ở biên nhận nộp trạm, Mã phiếu/mã trạm/mã người thu gom/mã giao dịch ở biên nhận đã lưu. Dải trạng thái mục biên nhận không còn in mã phiếu. Đã thử trên demo: hàng chờ và màn nhập chỉ hiện "Chi tiết" (đóng). Cũng thấy dòng "Còn thiếu" không còn đòi xác nhận chênh lệch khi ô trống. Ảnh: design/snapshots/ui-v4/C6/. |

### Giai đoạn I1 — Google Maps cho trạm

| Mã | Nhóm | Trạng thái | Commit | Ghi chú |
|---|---|---|---|---|
| I1.0 | B | xong | 6de287c, 73ad335, 638f2da, 3772889, 5f221ee | Vòng 1: `turbo.json` khai báo biến môi trường cho task `test` (Turborepo 2 lọc biến không khai báo). RED: chạy 1 file e2e qua turbo với `DATABASE_URL=127.0.0.1:1` vẫn báo `HOST:5432`; GREEN: báo `127.0.0.1:1`. Vòng 2: `jest.config.js` thêm `forceExit` (CI treo khi e2e lỗi ở beforeAll sau khi Redis đã kết nối). Theo Q25: test e2e chuyển sang dữ liệu seed-demo qua `test/helpers/demo-seed.ts` (định danh thực thể seed-demo, admin đăng nhập bằng `admin/login`, test tự tạo thêm can/giá dầu, gán thêm phường cho người thu gom demo, toạ độ Hà Nội theo từng quán). CI run 37133364271: 2/315 hỏng do test lỗi thời so với code v3 (tạo trạm cần `capacity_liters`; tuyến xếp theo `pickup_priority_score` có tính khoảng cách) → sửa (5f221ee). **CI run 37133576282 xanh**: api 315/315 (42 suite), miniapp 239/239, admin 6 file. Không sửa `scripts/seed-demo.ts`. |
| I1.1 | B | chưa làm | | |
| I1.2 | B | chưa làm | | |
| I1.3 | B | xong | (commit này) | Theo Q20 (a). Bằng chứng RED: `test/station-cache.test.ts` fail "Cannot find module src/lib/station-cache"; `station-recommend-schema.spec.ts` fail "accepts 0 liters…" (schema bắt `liters > 0`). Đã làm: `stationRecommendSchema` cho phép `liters = 0` (lấy mọi trạm đang nhận); Dexie version 3 thêm bảng `stationCache` (khoá `stations:<collector>`); `prefetchRouteData` lúc Bắt đầu ca lưu danh sách trạm (vị trí GPS, không có thì tâm phường của tuyến), lỗi không chặn bắt đầu ca; `loadStationsWithCache`: có mạng lấy từ máy chủ và gộp vào bản lưu, mất mạng (lỗi mạng/408/429/5xx) dùng bản lưu và tính đường chim bay trên máy (`lib/station-cache.ts`), lỗi 4xx không bị che. Màn chọn trạm hiện "Đang dùng danh sách trạm đã lưu — Chưa kết nối được máy chủ. Khoảng cách đường chim bay, sức chứa lúc …". Test: station-cache (11), api schema spec (3), thêm kiểm tra `liters=0` trong `full-flow.e2e-spec.ts` (chạy trên CI). Cổng: miniapp typecheck/lint/239 test/build pass; api typecheck/lint/230 unit test pass; admin typecheck pass. Trực quan (demo 375×812): bấm Bắt đầu ca → IndexedDB `eco-oil-miniapp` có bảng `stationCache` với 2 trạm demo (Long Biên, Thanh Trì), không lỗi console; ảnh `design/snapshots/ui-v4/I1.3/after-start-shift.jpg`. Chưa xem được thông báo "danh sách trạm đã lưu" trên màn hình: chế độ demo offline không bao giờ lỗi mạng; đã kiểm bằng test. Lưu ý: màn chọn trạm chỉ tìm trạm khi mọi giao dịch đã đồng bộ (quy tắc có sẵn), nên bản lưu chỉ dùng được khi mất mạng sau lúc đồng bộ xong (xem Phát hiện ngoài phạm vi). |

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

- 03/10/2026 — Màn nhập thu gom: khi khung trình duyệt bị ẩn (`document.hidden = true`), bấm "Xác nhận thu gom" thì giao dịch được lưu và đồng bộ nhưng màn hình kẹt ở "Đang lưu trên máy…". Đã thử trên bản gốc trước v4 (commit 68d5325) cũng bị y hệt, nên không do thay đổi v4. Chưa rõ có xảy ra khi màn hình đang hiện hay không; cần thử trên máy thật.
- 03/10/2026 — Trang chủ Merchant tính "tiền ước tính" bằng `VITE_ESTIMATED_PRICE_PER_LITER` (8.000đ) trong khi giá dầu từ API là 20.000đ (`HomePage.tsx:11`); vi phạm U11 nhưng không thuộc task nào của giai đoạn M.
- 03/10/2026 — `apps/api` chưa có cơ chế rate limit cho bất kỳ endpoint nào (liên quan quy tắc
  bảo mật chung, không chỉ TTS).
- 03/10/2026 — CI GitHub (`.github/workflows/ci.yml`) đỏ ở mọi commit của `ui_version_4` và
  `ui_version_3`, cùng bước `pnpm typecheck && pnpm lint && pnpm test && pnpm build`; chú thích của
  lần chạy nói lệnh `pnpm run test` của `apps/api` thoát mã 1. Đã đỏ từ trước v4 (68d5325, 17d3867).
  Log chi tiết cần đăng nhập GitHub nên chưa biết test nào hỏng. Các báo cáo M, C không chạy test
  api (chỉ typecheck) nên không phát hiện.
- 03/10/2026 — Rủi ro: `pnpm --filter @eco-oil/api test` chạy cả test e2e, có 27 lệnh
  `deleteMany`/`TRUNCATE`. `test/setup-env.ts` chỉ nạp `.env.test` nếu có; không có thì Prisma đọc
  `DATABASE_URL` của `.env`. Hiện `.env` để giá trị mẫu (`HOST`) nên chưa nguy hiểm, nhưng nếu ai
  đặt DB thật vào `.env` rồi chạy test thì dữ liệu sẽ bị xoá.

- 03/10/2026 — Màn chọn trạm (`StationDeliveryFlow.tsx`) chỉ tìm trạm khi `waiting === 0` (mọi giao dịch đã đồng bộ). Khi mất mạng từ trước lúc đồng bộ xong, Collector không thấy danh sách trạm (kể cả bản lưu của I1.3) dù phiếu nộp trạm vẫn xếp hàng chờ được. Không đổi vì là quy tắc đối soát có sẵn; cần chủ dự án quyết nếu muốn hiện danh sách trạm đã lưu trong trường hợp này.

## Báo cáo giai đoạn

### Giai đoạn C — 03/10/2026

- Đã làm: C1, C2, C3, C4.1–C4.4, C5.1–C5.5, C6 (commit 3cf77df … ccdafc9) và sửa sau review (9ee7030).
- Cổng kiểm tra cuối: typecheck, lint, build pass; 228/228 test pass (đầu giai đoạn: 186).
- Review: code-reviewer 1 lần cho cả giai đoạn; không CRITICAL/HIGH; sửa 5 điểm MEDIUM.
- Ảnh trước: `design/snapshots/ui-v4/C-before/`; sau: `C-after/` và từng task `C1` … `C6`.
- Chưa xem được trên màn hình: AI chọn sẵn hạng (cần ảnh thật cho kết quả tin cậy cao), hộp xác nhận đăng xuất khi còn hàng chờ (demo không có hàng chờ chưa đồng bộ). Đã kiểm bằng test.
- Mất so với trước (đúng quyết định): màn Tóm tắt ca (số kg ước tính, dung tích còn lại), khối Dữ liệu trên máy, ghi chú "Dữ liệu lúc …" của thẻ đối chiếu can.

### Giai đoạn M — 03/10/2026

- Đã làm: M1, M2, M3, M4, M5.1, M5.2, M5.3, M5.4, M6 (mỗi task một commit trên `ui_version_4`).
- Cổng kiểm tra cuối: typecheck, lint, build pass; 186/186 test pass (trước giai đoạn: 150).
- Review: code-reviewer chạy 2 lần (M4; M5.1–M6). Không có CRITICAL/HIGH. Đã sửa 5 điểm MEDIUM.
- Ảnh trước: `design/snapshots/ui-v4/M-before/`; ảnh sau theo từng task: `design/snapshots/ui-v4/M2` … `M6`.
- Thẻ "Đơn đang mở", nhắc "Can sắp đầy", dòng lý do nút khoá: đã kiểm trên màn hình bằng dữ liệu giả lập trong trình duyệt (xem nhật ký) và bằng test.
- Giới hạn của dữ liệu demo: thông báo "Đã thu gom thành công" hiện lại chưa đọc sau khi tải lại vì dataset demo tính lại thời điểm theo giờ hiện tại.

## Nhật ký

Mới nhất lên trên. Mỗi dòng: ngày — task — việc đã làm / lý do dừng.

- 03/10/2026 — I1.0 — xong. CI xanh lần đầu kể từ `ui_version_3` (run 37133576282).

- 03/10/2026 — Kế hoạch — Theo yêu cầu chủ dự án: rà toàn bộ thay đổi của `docs/KE_HOACH_CHUAN_HOA_UI_V4.md` và ghi vào kế hoạch: bảng quy tắc bắt buộc R1–R8 cho Society Charter (mục 2), quy tắc 8–10 ở mục 1, quyết định Q18–Q23 và trạng thái I1, sổ câu hỏi (mục 3) và nhật ký thay đổi kế hoạch (mục 4); sửa cách chụp ảnh (không có Playwright). Sửa dòng thừa trong mục "Câu hỏi đang mở" của file này.

- 03/10/2026 — Dừng hỏi Q25 (I1.0 hết 2 vòng, S7), Q26 (I1.2, S15: chế độ xe máy là SKU Enterprise), Q27 (I1.1, S15). Đọc giá trên developers.google.com/maps/billing-and-pricing/pricing và sku-details. Số lần gọi tác tử phụ của I1: 0/12.
- 03/10/2026 — I1.3 — xong (4405ef8). Chi tiết ở bảng task.
- 03/10/2026 — I1.0 — vòng 1 (turbo env), vòng 2 (jest forceExit); CI vẫn đỏ vì seed. Lấy log CI bằng `gh` của máy host (`/run/host/usr/bin/gh run view … --log-failed`).

- 03/10/2026 — B2 giai đoạn I1 — Tác tử chính tự rà (theo bảng 2.4, không gọi tác tử phụ; số lần gọi tác tử phụ của I1: 0/12). Đã đọc: `apps/admin/src/components/stations-view.tsx` (form trạm nhập tay vĩ độ/kinh độ ở dòng 612–631, kiểm hợp lệ ở 433–457; khớp kế hoạch), `operations-map-canvas.tsx` (admin đã có Leaflet, nền OSM có dự phòng), `apps/admin/src/lib/api.ts` (có chế độ demo offline cho trạm); `apps/api/src/modules/stations/` (`recommend` ở `stations.service.ts:137-179` dùng `ST_Distance`, lọc trạm đủ sức chứa; controller cho COLLECTOR và ADMIN), `stationRecommendSchema` (`packages/validation/src/index.ts:561`, bắt `liters > 0`), `StationRecommendation` (`packages/shared-types/src/index.ts:520`), `RedisService` (báo lỗi khi thiếu `REDIS_URL`), cách gọi HTTP ra ngoài có timeout (`real-zalo-auth.provider.ts`), `jest.config.js` và `test/setup-env.ts`; `apps/miniapp`: `offline-cache.ts`, `outbox-db.ts` (Dexie version 1–2, chưa có bảng trạm), `startShift` (`CollectorFlow.tsx:202`), `StationDeliveryFlow.tsx` (gọi `/stations/recommend` lúc mở màn nộp trạm, chưa có bản lưu khi mất mạng), `api.recommendStations` (demo trả `DEMO_STATIONS`). Kế hoạch ghi file `StationDeliveryFlow.tsx` không kèm thư mục; file thật ở `src/pages/`. Không chạy test api (chủ dự án huỷ lệnh; xem Q17). Tra CI qua API công khai của GitHub: đỏ từ trước v4. Dừng hỏi Q17–Q24.
- 03/10/2026 — Society Charter — Chủ dự án duyệt (S-1…S-4). Đã sửa `.claude/rules/ui-v4-workflow.md` (B2 rà soát song song có điều kiện, B3 bằng chứng RED, B6 review theo bảng 2.4 + kiểm chỉ đọc + nhật ký MAST, B8 verifier) và tạo `.claude/agents/ui-v4-verifier.md`.
- 03/10/2026 — Duyệt C — Ghi quyết định; bắt đầu giai đoạn I1.

- 03/10/2026 — B8 giai đoạn C — Chạy code-reviewer trên 3249d20..HEAD: không CRITICAL/HIGH; sửa 5 điểm MEDIUM: (1) nút +/− của ô tự tính bị khoá để số tự tính không bị ghi thành số cân; (2) hạng AI chọn sẵn bị bỏ khi ảnh bị xoá/đổi nếu người thu gom chưa tự chọn; (3) "Đi nộp trạm" thành nút chính cả khi điểm cuối đã thu nhưng chưa đồng bộ; (4) hộp xác nhận: focus vào nút an toàn, Esc để đóng, role alertdialog; (5) thẻ điểm thu giữ tiêu đề h2, mở menu bằng nút thật "Gọi quán, chỉ đường…".
- 03/10/2026 — C6 — xong. Mã kỹ thuật chuyển vào phần "Chi tiết" thu gọn (TechDetails, thẻ details): Mã giao dịch và provider/model AI ở màn nhập, UUID ở hàng chờ đồng bộ, Mã phiếu ở biên nhận nộp trạm, Mã phiếu/mã trạm/mã người thu gom/mã giao dịch ở biên nhận đã lưu. Dải trạng thái mục biên nhận không còn in mã phiếu. Đã thử trên demo: hàng chờ và màn nhập chỉ hiện "Chi tiết" (đóng). Cũng thấy dòng "Còn thiếu" không còn đòi xác nhận chênh lệch khi ô trống. Ảnh: design/snapshots/ui-v4/C6/.
- 03/10/2026 — C5.5 — xong. Màn chọn trạm: trạm gần nhất còn đủ chỗ cho số lít đang mang lên đầu, ghi "Gần nhất còn đủ chỗ", nút "Chọn trạm này" của nó là nút chính, trạm khác nút phụ (U3); các trạm còn lại giữ thứ tự từ máy chủ; không tự chuyển màn (Q15, lib/station-delivery.ts orderStationsForDelivery). Đã thử trên demo: Long Biên 5.4 km lên đầu kèm nhãn. Test +2 trong station-delivery.test.ts (sửa kỳ vọng thứ tự của chính test mới viết). Ảnh: design/snapshots/ui-v4/C5/.
- 03/10/2026 — C5.4 — xong. Phân tích ảnh xong với độ tin cậy cao và người thu gom chưa chọn hạng thì AI chọn sẵn hạng gợi ý (aiPreselectGrade, cập nhật bằng hàm cập nhật nên không ghi đè hạng người dùng vừa chọn), hiện dòng "AI chọn sẵn hạng X (tin cậy cao)…" (isAiPreselected); người dùng bấm hạng khác hoặc "Dùng gợi ý" thì bỏ dòng này. Test grade-automation (+1). Chưa xem được trên màn hình vì cần ảnh thật cho kết quả tin cậy cao; kiểm bằng test.
- 03/10/2026 — C5.3 — xong. Mở màn nhập là tự lấy GPS (effect một lần, lib/entry-gps.ts); nút "Lấy lại GPS" chỉ hiện khi lỗi hoặc đang dùng tâm phường; lỗi GPS hiện ngay trong khối vị trí kèm cách sửa, không còn đổ vào khung lỗi chung. Đã thử trên demo (khung trình duyệt từ chối quyền vị trí): hiện "Chưa lấy được GPS: Quyền vị trí đã bị từ chối…" + nút Lấy lại GPS. Cùng commit sửa lỗi phụ của C5.1: khi ô kg/lít còn trống không còn đòi xác nhận cảnh báo chênh lệch (litersForDeviationCheck). Test entry-gps (4) + 1 test mass-entry. Ảnh: design/snapshots/ui-v4/C5/.
- 03/10/2026 — C5.2 — xong. Khối "Chất lượng dầu" gộp vào khối "Phân hạng dầu" (bớt 1 khối). Chất lượng tự chọn: hạng C hoặc nghi pha lẫn → "Cần kiểm tra", còn lại "Đạt", ghi "(tự chọn)" + dòng giải thích; bấm tay thì giữ lựa chọn của người dùng (lib/grade-automation.ts resolveQuality). Đã thử trên demo: chọn C → Cần kiểm tra; đổi A → Đạt; tick nghi pha lẫn → Cần kiểm tra; bấm Đạt tay → bỏ nhãn tự chọn. Test grade-automation (5). Ảnh: design/snapshots/ui-v4/C5/.
- 03/10/2026 — C5.2/C5.4 — Dừng do hết hạn mức sử dụng. Đã có lib/grade-automation.ts và test; việc tiếp theo: nối vào CollectorEntryScreen, rồi C5.3, C5.5, C6, review, báo cáo giai đoạn C.
- 03/10/2026 — C5.1 — xong. Ô kg và lít để trống lúc đầu (Q14, không còn điền số quán khai). Ô nhập sau cùng là ô gốc, ô kia tự tính theo DEFAULT_DENSITY_KG_PER_LITER và ghi "(tự tính)" (lib/mass-entry.ts, không dùng useEffect). Chỉ gửi ô gốc: kg → actual_kg, lít → actual_liters. Đã thử: nhập 18,2 kg → 20.0 lít tự tính; nhập 12 lít → 10.9 kg tự tính, nhãn kg đổi thành "Khối lượng (tự tính)". Test mass-entry (5). Ảnh: design/snapshots/ui-v4/C5/.
- 03/10/2026 — C4.4 — xong. Theo Q13 không đổi luồng: bấm "Kết ca" ở biên nhận đã kết ca luôn. Tách logic thành closeShiftAfterReceipt (lưu biên nhận → kết ca, không qua màn trung gian) và thêm 3 test trong station-delivery.test.ts chứng minh 1 lần bấm, báo lỗi khi kết ca bị từ chối, không kết ca khi chưa lưu được biên nhận. Màn "Ca làm đã khép lại" và dòng giả "Số phiếu nộp trạm: 1" giữ nguyên.
- 03/10/2026 — C4.3 — xong. Bỏ màn Tóm tắt ca (xoá CollectorSummaryScreen). Màn Tuyến: dòng "x / y điểm đã thu · z lít"; đã thu ≥ 1 điểm có nút chữ "Đi nộp trạm", thu hết điểm thì thành nút chính (lib/route-delivery.ts, Q12). "Về tóm tắt ca" → "Về tuyến hôm nay"; mở lại app khi ca dở vào thẳng màn Tuyến. Đã thử trên demo: sau 1 giao dịch dòng tiến độ hiện "1 / 4 điểm đã thu · 20 lít | Đi nộp trạm". Test thêm 3 trong collector-flow.test.ts. Phát hiện màn nhập kẹt "Đang lưu…" khi khung ẩn, có từ trước (xem Phát hiện ngoài phạm vi).
- 03/10/2026 — C4.2 — xong. Ô nhập tay mã can để trống (INITIAL_MANUAL_CONTAINER_CODE), không còn điền sẵn mã của điểm; nhãn đổi thành "Không quét được? Nhập mã in trên can". Test trong container-code.test.ts. Cùng commit với C4.1.
- 03/10/2026 — C4.1 — xong. Mã can khớp điểm thì tự chuyển sang màn nhập; bỏ thẻ "Đã đối chiếu" và nút "Tiếp tục nhập giao dịch" (containerMatchOutcome). Không khớp vẫn dừng với thông báo "Đây không phải can của điểm này". Dòng "Dữ liệu lúc …" của thẻ đối chiếu (khi dùng dữ liệu can đã lưu) không còn hiện ở màn này. Đã thử trên demo: mã sai báo lỗi, mã đúng sang màn Ghi nhận thu gom. Test thêm trong container-code.test.ts.
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
