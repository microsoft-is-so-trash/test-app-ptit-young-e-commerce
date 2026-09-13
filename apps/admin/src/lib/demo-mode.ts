/**
 * Chế độ demo: chạy bảng vận hành bằng dữ liệu mẫu, không cần API và cơ sở dữ liệu.
 * Bật bằng NEXT_PUBLIC_DEMO_OFFLINE=1 trong .env.local khi cần xem trước giao diện.
 */
export const DEMO_OFFLINE = process.env.NEXT_PUBLIC_DEMO_OFFLINE === '1';

export const DEMO_ADMIN_USER = {
  id: 'demo-admin-01',
  role: 'ADMIN' as const,
  name: 'Quản trị viên (demo)',
  phone: '0900000000',
};
