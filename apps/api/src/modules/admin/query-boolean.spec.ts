import {
  adminContainerListQuerySchema,
  adminMerchantListQuerySchema,
  adminOperationsMapQuerySchema,
  adminWardListQuerySchema,
} from '@eco-oil/validation';

/**
 * Tham số trên URL luôn tới dưới dạng chuỗi. Trước đây các schema dùng
 * z.coerce.boolean(), mà cách đó gọi Boolean("false") nên ra true — trình duyệt
 * gửi ?only_at_risk=false thì backend lại hiểu là true và lọc sạch bản đồ.
 */
describe('cờ boolean trên query string', () => {
  it('đọc "false" là false chứ không phải true', () => {
    expect(adminOperationsMapQuerySchema.parse({ only_at_risk: 'false' }).only_at_risk).toBe(false);
    expect(adminWardListQuerySchema.parse({ include_inactive: 'false' }).include_inactive).toBe(false);
    expect(adminContainerListQuerySchema.parse({ unassigned: 'false' }).unassigned).toBe(false);
    expect(adminMerchantListQuerySchema.parse({ anomaly: 'false' }).anomaly).toBe(false);
  });

  it('đọc "true" là true', () => {
    expect(adminOperationsMapQuerySchema.parse({ only_at_risk: 'true' }).only_at_risk).toBe(true);
    expect(adminWardListQuerySchema.parse({ include_inactive: 'true' }).include_inactive).toBe(true);
    expect(adminContainerListQuerySchema.parse({ unassigned: 'true' }).unassigned).toBe(true);
    expect(adminMerchantListQuerySchema.parse({ anomaly: 'true' }).anomaly).toBe(true);
  });

  it('chấp nhận "0" và "1" vì nhiều nơi gửi kiểu đó', () => {
    expect(adminOperationsMapQuerySchema.parse({ only_at_risk: '0' }).only_at_risk).toBe(false);
    expect(adminOperationsMapQuerySchema.parse({ only_at_risk: '1' }).only_at_risk).toBe(true);
  });

  it('không phân biệt hoa thường và bỏ qua khoảng trắng thừa', () => {
    expect(adminOperationsMapQuerySchema.parse({ only_at_risk: ' FALSE ' }).only_at_risk).toBe(false);
    expect(adminOperationsMapQuerySchema.parse({ only_at_risk: 'True' }).only_at_risk).toBe(true);
  });

  it('vẫn nhận boolean thật khi gọi từ mã nguồn chứ không qua URL', () => {
    expect(adminOperationsMapQuerySchema.parse({ only_at_risk: false }).only_at_risk).toBe(false);
    expect(adminOperationsMapQuerySchema.parse({ only_at_risk: true }).only_at_risk).toBe(true);
  });

  it('giữ nguyên giá trị mặc định khi không gửi tham số', () => {
    expect(adminOperationsMapQuerySchema.parse({}).only_at_risk).toBe(false);
    expect(adminWardListQuerySchema.parse({}).include_inactive).toBe(true);
    expect(adminContainerListQuerySchema.parse({}).unassigned).toBeUndefined();
  });

  it('báo lỗi khi gặp giá trị lạ, thay vì âm thầm coi là false', () => {
    // Gõ sai thì phải biết ngay, chứ không để bộ lọc lặng lẽ chạy sai.
    expect(() => adminOperationsMapQuerySchema.parse({ only_at_risk: 'flase' })).toThrow();
    expect(() => adminWardListQuerySchema.parse({ include_inactive: 'có' })).toThrow();
  });
});
