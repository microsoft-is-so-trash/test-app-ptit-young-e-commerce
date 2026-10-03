---
description: Tự thực thi kế hoạch chuẩn hoá UI v4 (Merchant, Collector, Google Maps, TTS). Chỉ dừng khi cần hỏi hoặc khi xong một giai đoạn.
---

# /ui-v4

Thực thi kế hoạch `docs/KE_HOACH_CHUAN_HOA_UI_V4.md` theo đúng `.claude/rules/ui-v4-workflow.md`.

1. Đọc `.claude/rules/ui-v4-workflow.md` và làm theo từng bước, bắt đầu từ B0.
2. Đọc `docs/TIEN_DO_UI_V4.md` để biết đang ở đâu.
3. Nếu có nội dung sau lệnh (`$ARGUMENTS`), coi đó là câu trả lời cho câu hỏi đang mở (dạng
   `Q1: a, Q2: b`) hoặc lệnh duyệt giai đoạn (dạng `duyệt M`). Ghi vào mục "Quyết định" của file
   tiến độ trước khi làm tiếp. Nội dung không rõ nghĩa → hỏi lại (điều kiện S1).
4. Chạy vòng lặp B1–B8. Kết thúc lượt bằng đúng một loại tin nhắn: câu hỏi chặn, báo cáo giai
   đoạn, hoặc báo hoàn thành toàn bộ kế hoạch.

Nội dung kèm theo: $ARGUMENTS
