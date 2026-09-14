/**
 * Cổng đăng nhập chung nằm ở miniapp: người dùng chọn vai trò tại đó, chọn
 * quản trị viên thì được chuyển sang web này. Khi đăng xuất thì quay lại đúng
 * cổng đó để chọn vai trò khác mà không phải tự gõ địa chỉ.
 *
 * Chưa cấu hình địa chỉ thì trả null, web quản trị giữ màn đăng nhập riêng.
 */
export function sharedLoginGateUrl(configuredUrl: string | undefined): string | null {
  const trimmed = (configuredUrl ?? '').trim();
  if (trimmed.length === 0) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  // Chỉ nhận http/https để không mở được javascript: hay data:
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  return trimmed.replace(/\/+$/, '');
}

/** Địa chỉ cổng chung lấy từ cấu hình lúc build. */
export function configuredLoginGateUrl(): string | null {
  return sharedLoginGateUrl(process.env.NEXT_PUBLIC_LOGIN_GATE_URL);
}
