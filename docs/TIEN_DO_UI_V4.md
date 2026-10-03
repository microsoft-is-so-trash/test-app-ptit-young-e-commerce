# Tiến độ chuẩn hoá UI v4

File trạng thái **duy nhất** của kế hoạch `docs/KE_HOACH_CHUAN_HOA_UI_V4.md`. Agent đọc file này
đầu mỗi phiên và cập nhật sau mỗi task, theo `.claude/rules/ui-v4-workflow.md`.

Trạng thái task: `chưa làm` · `đang làm` · `bị chặn (Q..)` · `xong`.

## Hiện tại

| | |
|---|---|
| Giai đoạn | M (đang làm) |
| Task đang làm | — |
| Đang chờ chủ dự án | Trả lời Q5–Q9 (rà soát đầu giai đoạn M) |
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

## Câu hỏi đang mở

| Mã | Chặn task | Câu hỏi | Đề xuất |
|---|---|---|---|
| Q5 | M4 | "Lịch sử thu gom" gộp tab Đơn (đơn đã xong/huỷ) và tab Lịch sử. Nhưng đơn "Đã thu gom" chính là giao dịch đã có ở tab Lịch sử, gộp nguyên sẽ hiện trùng (U5). Hiển thị thế nào? | Phần trên: nội dung tab Lịch sử như hiện tại (tổng lít, lượt, CO2, danh sách giao dịch). Phần dưới: "Đơn đã huỷ" (chỉ đơn CANCELLED). Đơn đang chờ/đã phân công chuyển sang "Hôm nay" |
| Q6 | M4 | Khối "Can chuẩn được cấp" ở Tài khoản (chữ giả "Can HDPE ISCC", "QR-ISCC", nút giả "Đăng ký cấp thêm can chuẩn") đặt ở đâu trong "Của tôi"? | Thành mục riêng "Can chuẩn được cấp", nằm ngay sau "Hồ sơ quán", giữ nguyên chữ và nút |
| Q7 | M6 | Merchant không có `window.confirm` nào; 2 chỗ còn lại thuộc Collector (`App.tsx:172` đăng xuất, `CollectorFlow.tsx:239` huỷ ca). Đăng xuất Merchant hiện bấm là thoát ngay | M6 chỉ đổi nút đăng xuất Merchant thành chữ thường, không thêm hộp xác nhận; 2 chỗ `window.confirm` của Collector làm ở giai đoạn C (C2 và cùng task gần nhất) |
| Q8 | M4 | Các mục mở rộng ở "Của tôi": mặc định đóng hết? Mở được nhiều mục cùng lúc? | Mặc định đóng hết; mở mục này thì mục khác tự đóng (màn ngắn, đỡ cuộn) |
| Q9 | M5.2 | Ngoài điều kiện ≥ 85% và có dung tích: có nhắc khi quán **đã** báo thu gom (đang có đơn chờ) hoặc can đang vận chuyển không? | Không: chỉ nhắc khi can ở quán (`AT_MERCHANT`) và quán chưa có đơn đang chờ |
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
| M1 | B | chưa làm | | Q2: a |
| M2 | A | chưa làm | | Q3: phần chuyển danh sách can làm trong M4 |
| M3 | B | chưa làm | | Q1: dùng 2.5 |
| M4 | B | bị chặn (Q5, Q6, Q8) | | Gồm cả phần chuyển danh sách can từ M2 (Q3) |
| M5.1 | B | chưa làm | | |
| M5.2 | B | bị chặn (Q9) | | Q4: can thiếu dung tích thì không nhắc |
| M5.3 | B | chưa làm | | |
| M5.4 | B | chưa làm | | |
| M6 | A/B | bị chặn (Q7) | | |

### Giai đoạn C — Collector

| Mã | Nhóm | Trạng thái | Commit | Ghi chú |
|---|---|---|---|---|
| C1 | B | chưa làm | | |
| C2 | B | chưa làm | | |
| C3 | B | chưa làm | | |
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

(Chưa có.)

## Nhật ký

Mới nhất lên trên. Mỗi dòng: ngày — task — việc đã làm / lý do dừng.

- 03/10/2026 — B2 giai đoạn M — Đọc toàn bộ file của M1–M6, chụp ảnh trước (`design/snapshots/ui-v4/M-before/`), thêm cấu hình `eco-oil-miniapp-demo` vào `.claude/launch.json`. Dừng hỏi Q5–Q9.
- 03/10/2026 — B0 — Tạo branch `ui_version_4` từ `ui_version_3`. Cài Node 22.23.3 (`pnpm env use --global 22`) và wrapper git của host ở `~/.local/share/agent-tools/bin`. `pnpm install` xong. Cổng kiểm tra miniapp trên code gốc: typecheck, lint, build pass; test 150/150 pass. Repo không có Playwright; có `google-chrome` để chụp màn hình headless.
- 03/10/2026 — Tạo file tiến độ, quy trình tự thực thi và nghiên cứu TTS Google. Chưa sửa code.
