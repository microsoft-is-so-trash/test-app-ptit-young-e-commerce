# Tiến độ chuẩn hoá UI v4

File trạng thái **duy nhất** của kế hoạch `docs/KE_HOACH_CHUAN_HOA_UI_V4.md`. Agent đọc file này
đầu mỗi phiên và cập nhật sau mỗi task, theo `.claude/rules/ui-v4-workflow.md`.

Trạng thái task: `chưa làm` · `đang làm` · `bị chặn (Q..)` · `xong`.

## Hiện tại

| | |
|---|---|
| Giai đoạn | M (chưa bắt đầu) |
| Task đang làm | — |
| Đang chờ chủ dự án | Xác nhận Q2, Q4 và trả lời Q3 (chặn M1, M2 phần can, M5.2) |
| Branch | `ui_version_4` (tạo từ `ui_version_3` ngày 03/10/2026; trùng `origin/ui_version_4`) |
| Cập nhật lần cuối | 03/10/2026 — ghi câu trả lời Q1, cài môi trường |

## Quyết định

Ghi theo dạng: ngày — mã câu hỏi — nội dung đã chọn.

- 02/10/2026 — Branch `ui_version_4` tạo từ `ui_version_3`; thứ tự M → C → I1 → I2 → I3; giữ
  nguyên phần giả và dataset demo; thanh điều hướng kiểu A; đã có Google Cloud và Zalo AI.
- 03/10/2026 — Agent tự chạy theo `.claude/rules/ui-v4-workflow.md`; chỉ báo cáo ở cuối mỗi giai
  đoạn hoặc khi cần hỏi; dừng chờ duyệt giữa các giai đoạn.
- 03/10/2026 — Workflow, file tiến độ và mọi thay đổi của kế hoạch nằm trên branch `ui_version_4`.
- 03/10/2026 — Q1 — Hệ số CO2 là **2.5** kg CO2/lít (M3 đưa 2.65 ở `HistoryPage.tsx` về 2.5).

## Câu hỏi đang mở

| Mã | Chặn task | Câu hỏi | Đề xuất |
|---|---|---|---|
| Q2 | M1 | **Chờ xác nhận:** chủ dự án trả lời "bỏ khối dữ liệu", agent hiểu là chọn (a) — bỏ `ward_id` khỏi dữ liệu gửi đi. Câu hỏi gốc — Gửi lại hồ sơ: (a) không gửi `ward_id`, giữ phường hiện tại — backend đã cho phép bỏ trống (`merchants.service.ts:283-292`), không đổi API; hay (b) hiện ô chọn phường điền sẵn phường hiện tại, cho sửa | (a): nhỏ nhất, sửa đúng lỗi; (b) là thêm tính năng |
| Q3 | M2, M4 | M2 yêu cầu chuyển danh sách can ở Tài khoản vào "Của tôi", nhưng "Của tôi" chỉ có sau M4. Làm phần này trong M4? | Có: M2 chỉ bỏ ô "Tiền ước tính tuần" ở Trang chủ; phần can làm trong M4 |
| Q4 | M5.2 | **Chờ xác nhận:** chủ dự án trả lời "không nhắc báo thu gom", agent hiểu là: can thiếu dung tích thì không nhắc, M5.2 vẫn làm cho can có dung tích (không phải bỏ cả M5.2). Câu hỏi gốc — Can không có dung tích (`capacity_l = null`) thì không tính được % đầy. Khi đó không nhắc? | Không nhắc (không đoán dung tích) |
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
| M1 | B | bị chặn (Q2) | | |
| M2 | A | bị chặn một phần (Q3) | | Phần bỏ ô "Tiền ước tính tuần" làm được ngay |
| M3 | B | chưa làm | | Q1: dùng 2.5 |
| M4 | B | chưa làm | | |
| M5.1 | B | chưa làm | | |
| M5.2 | B | bị chặn (Q4) | | |
| M5.3 | B | chưa làm | | |
| M5.4 | B | chưa làm | | |
| M6 | A/B | chưa làm | | |

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

- 03/10/2026 — `apps/api` chưa có cơ chế rate limit cho bất kỳ endpoint nào (liên quan quy tắc
  bảo mật chung, không chỉ TTS).

## Báo cáo giai đoạn

(Chưa có.)

## Nhật ký

Mới nhất lên trên. Mỗi dòng: ngày — task — việc đã làm / lý do dừng.

- 03/10/2026 — B0 — Tạo branch `ui_version_4` từ `ui_version_3`. Cài Node 22.23.3 (`pnpm env use --global 22`) và wrapper git của host ở `~/.local/share/agent-tools/bin`. `pnpm install` xong. Cổng kiểm tra miniapp trên code gốc: typecheck, lint, build pass; test 150/150 pass. Repo không có Playwright; có `google-chrome` để chụp màn hình headless.
- 03/10/2026 — Tạo file tiến độ, quy trình tự thực thi và nghiên cứu TTS Google. Chưa sửa code.
