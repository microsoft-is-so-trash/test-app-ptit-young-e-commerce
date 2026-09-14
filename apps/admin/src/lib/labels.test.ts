import { describe, expect, it } from 'vitest';
import {
  alertSeverityLabel,
  anomalyReasonLabel,
  approvalStatusLabel,
  containerStateLabel,
  formatCapacity,
  qualityLabel,
  riskLevelLabel,
  varianceStatusLabel,
} from './labels';

describe('nhãn tiếng Việt cho các trạng thái', () => {
  it('dịch trạng thái can', () => {
    expect(containerStateLabel('AT_MERCHANT')).toBe('Ở quán');
    expect(containerStateLabel('IN_TRANSIT')).toBe('Đang vận chuyển');
    expect(containerStateLabel('AT_STATION')).toBe('Tại trạm');
  });

  it('dịch chất lượng giao dịch', () => {
    expect(qualityLabel('PASS')).toBe('Đạt');
    expect(qualityLabel('FLAG')).toBe('Cần kiểm tra');
  });

  it('dịch kết quả đối soát', () => {
    expect(varianceStatusLabel('OK')).toBe('Khớp');
    expect(varianceStatusLabel('FLAGGED')).toBe('Lệch quá ngưỡng');
  });

  it('dịch mức độ cảnh báo', () => {
    expect(alertSeverityLabel('LOW')).toBe('Thấp');
    expect(alertSeverityLabel('MEDIUM')).toBe('Trung bình');
    expect(alertSeverityLabel('HIGH')).toBe('Cao');
  });

  it('dịch trạng thái duyệt quán', () => {
    expect(approvalStatusLabel('PENDING')).toBe('Chờ duyệt');
    expect(approvalStatusLabel('APPROVED')).toBe('Đã duyệt');
    expect(approvalStatusLabel('REJECTED')).toBe('Đã từ chối');
  });

  it('trả lại chính giá trị khi gặp mã lạ, không để trống màn hình', () => {
    expect(containerStateLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW');
    expect(qualityLabel(null)).toBe('—');
    expect(alertSeverityLabel(null)).toBe('—');
  });
});

describe('formatCapacity', () => {
  it('ghi kèm đơn vị khi có số', () => {
    expect(formatCapacity(30)).toBe('30 lít');
    expect(formatCapacity(20.5)).toBe('20,5 lít');
  });

  it('không ghi "— lít" khi chưa có dung tích', () => {
    expect(formatCapacity(null)).toBe('Chưa rõ');
    expect(formatCapacity(undefined)).toBe('Chưa rõ');
  });
});

describe('nhãn cho phần chấm điểm bất thường', () => {
  it('dịch mức rủi ro', () => {
    expect(riskLevelLabel('HIGH_RISK')).toBe('Rủi ro cao');
    expect(riskLevelLabel('REVIEW')).toBe('Cần kiểm tra');
    expect(riskLevelLabel('NORMAL')).toBe('Bình thường');
  });

  it('dùng đúng nhãn mà backend đặt cho từng mã nguyên nhân', () => {
    expect(anomalyReasonLabel('DENSITY_OUTLIER')).toBe('Tỷ lệ kg/lít bất thường');
    expect(anomalyReasonLabel('MASS_OR_VOLUME_OUTLIER')).toBe('Khối lượng hoặc thể tích bất thường');
    expect(anomalyReasonLabel('COLLECTION_TIME_OUTLIER')).toBe('Thời gian thu gom khác thường');
    expect(anomalyReasonLabel('FREQUENCY_SPIKE')).toBe('Tần suất giao dịch tăng đột biến');
    expect(anomalyReasonLabel('INSUFFICIENT_HISTORY')).toBe('Chưa đủ lịch sử');
  });

  it('giữ nguyên mã lạ để không mất thông tin', () => {
    expect(anomalyReasonLabel('MÃ_MỚI_CHƯA_BIẾT')).toBe('MÃ_MỚI_CHƯA_BIẾT');
  });
});
