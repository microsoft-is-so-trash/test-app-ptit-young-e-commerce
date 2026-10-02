---
paths:
  - "apps/miniapp/**"
---

# UI non-fiction cho apps/miniapp (Merchant và Collector)

Nguồn gốc và lý do: `docs/NGHIEN_CUU_UI_NON_FICTION_VA_GOOGLE_API.md`.
Kế hoạch thực hiện: `docs/KE_HOACH_CHUAN_HOA_UI_V4.md`.

## Ngoại lệ bắt buộc: dữ liệu demo và phần giả hiện có

- KHÔNG xoá, KHÔNG đổi nội dung, KHÔNG ẩn sau cờ các phần giả đã liệt kê ở mục 3.1 của tài liệu
  nghiên cứu, và các file dataset demo (`apps/miniapp/src/lib/demo-*.ts`,
  `apps/admin/src/lib/demo-*.ts`, `scripts/seed-demo.ts`).
- Khi tái cấu trúc màn hình, phần giả hiện có phải được đặt lại vào vị trí mới, giữ nguyên chữ và
  hành vi. Nếu không tìm được chỗ đặt hợp lý thì hỏi chủ dự án, không tự bỏ.
- Mọi quy tắc dưới đây áp dụng cho phần tử MỚI hoặc phần tử thật đang được sửa.

## Quy tắc

- **U1.** Mọi chỗ bấm được phải thuộc đúng một loại: Hành động (đổi dữ liệu thật), Mở rộng (hiện
  thêm thông tin), Thiết lập (đổi hành vi về sau). Không thuộc loại nào thì không thêm.
- **U2.** Non-fiction: không tạo thêm thông tin giả, nút chết, công tắc không lưu, hay thông báo
  thành công giả. Tính năng chưa có backend thì không thêm vào UI.
- **U3.** Mỗi màn tối đa 1 nút chính. Hành động phụ nằm trong menu thả xuống của thẻ.
- **U4.** Mỗi vai trò chỉ có một mục "Cài đặt chung" cho mọi thiết lập và đăng xuất.
- **U5.** Mỗi thông tin hoặc hành động chỉ có một nơi chính thức; không hiển thị trùng.
- **U6.** Mỗi màn tối đa 1 dải trạng thái, ưu tiên: lỗi > mất mạng > hàng chờ đồng bộ > GPS >
  dữ liệu cache. Bấm vào để xem chi tiết. Trạng thái đồng bộ không được ẩn hẳn.
- **U7.** Thanh điều hướng kiểu A: thanh dưới đáy, đúng 2 nút có chữ.
  Merchant: "Hôm nay" / "Của tôi". Collector: "Ca hôm nay" / "Của tôi".
- **U8.** Ô tự tính phải ghi rõ "tự tính"; người dùng sửa tay thì giữ số họ nhập. Phép tính viết
  thành hàm thuần trong `src/lib/` và có test `node:test`. Không dùng `useEffect` để đồng bộ hai
  state với nhau; tính giá trị phụ thuộc ngay khi render.
- **U9.** App được tự điền, tự chọn, tự chuyển màn khi chắc chắn. App KHÔNG tự gửi, tự nộp trạm,
  tự huỷ, tự kết ca, hay tự xử lý tiền.
- **U10.** Nút bị khoá phải hiện lý do; thông báo lỗi phải nói cách sửa.
- **U11.** Hằng số nghiệp vụ (hệ số CO2, đơn giá, mật độ dầu) chỉ lấy từ một nguồn duy nhất
  (`@eco-oil/shared-types` hoặc API), không khai báo lại trong từng màn.
- **U12.** Không hiện thông tin kỹ thuật (UUID đầy đủ, tên model/provider AI) ở giao diện chính;
  nếu cần cho hỗ trợ thì để trong phần "Chi tiết" thu gọn.
- **U13.** Giọng đọc (TTS) luôn có chữ đi kèm, tắt được trong Cài đặt chung, mặc định không đọc
  số tiền.

## Cách làm

- Trước khi sửa, phân loại thay đổi: nhóm A (thuần trình bày, CSS/markup) hay nhóm B (đổi tương
  tác, state, tính năng). Nhóm B phải nằm trong kế hoạch đã duyệt.
- Không dùng `window.confirm`; dùng hộp xác nhận trong app (`confirm-dialog`).
- Không tạo trang/màn mới chỉ để chứa một nút; gộp vào màn có sẵn.
- Test mới của miniapp phải được thêm vào script `test` trong `apps/miniapp/package.json` (script
  đang liệt kê từng file).
