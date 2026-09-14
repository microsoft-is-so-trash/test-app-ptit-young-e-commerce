import { describe, expect, it } from 'vitest';
import { sharedLoginGateUrl } from './login-gate';

describe('sharedLoginGateUrl', () => {
  it('trả về địa chỉ cổng đăng nhập chung khi đã cấu hình', () => {
    expect(sharedLoginGateUrl('http://localhost:5173')).toBe('http://localhost:5173');
  });

  it('bỏ dấu gạch chéo thừa ở cuối', () => {
    expect(sharedLoginGateUrl('https://app.ecollect.vn/')).toBe('https://app.ecollect.vn');
  });

  it('trả null khi chưa cấu hình, để giữ màn đăng nhập riêng của web quản trị', () => {
    expect(sharedLoginGateUrl(undefined)).toBeNull();
    expect(sharedLoginGateUrl('')).toBeNull();
    expect(sharedLoginGateUrl('   ')).toBeNull();
  });

  it('chỉ nhận http/https', () => {
    expect(sharedLoginGateUrl('javascript:alert(1)')).toBeNull();
    expect(sharedLoginGateUrl('data:text/html,x')).toBeNull();
    expect(sharedLoginGateUrl('khong-phai-dia-chi')).toBeNull();
  });
});
