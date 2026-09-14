export const PRODUCTION_API_BASE_URL = 'https://eco-oil-api-kgoe.onrender.com/api/v1';

const INVALID_PRODUCTION_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'example.com']);

/**
 * Lỗi cấu hình thì phải nói rõ nhận được gì. Không có phần này thì log build chỉ
 * báo "sai định dạng" và người sửa phải đoán xem mình gõ nhầm chỗ nào.
 * Giá trị là địa chỉ API công khai nên in ra log không lộ gì.
 */
function describeReceived(value: string): string {
  const trimmed = value.length > 120 ? `${value.slice(0, 120)}…` : value;
  return `Nhận được: "${trimmed}"`;
}

export function resolveApiBaseUrl(mode: string, configured?: string): string {
  const candidate = configured?.trim() || (mode === 'development' ? '/api/v1' : PRODUCTION_API_BASE_URL);
  if (mode !== 'development') {
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      throw new Error(
        'VITE_API_BASE_URL phải là URL HTTPS đầy đủ của Render khi build production, '
          + `ví dụ ${PRODUCTION_API_BASE_URL} — nhớ có cả "https://". ${describeReceived(candidate)}`,
      );
    }
    const hostname = parsed.hostname.toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, '');
    if (
      parsed.protocol !== 'https:'
      || INVALID_PRODUCTION_HOSTS.has(hostname)
      || hostname.endsWith('.local')
      || hostname.endsWith('.example.com')
      || path !== '/api/v1'
    ) {
      throw new Error(
        'VITE_API_BASE_URL production phải là URL HTTPS của API với suffix /api/v1, '
          + `ví dụ ${PRODUCTION_API_BASE_URL}. ${describeReceived(candidate)}`,
      );
    }
  }
  return candidate.replace(/\/$/, '');
}
