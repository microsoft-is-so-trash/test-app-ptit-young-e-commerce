/**
 * Nhãn tiếng Việt cho các mã trạng thái của API.
 *
 * Giao diện không in thẳng mã enum (AT_MERCHANT, FLAGGED…) vì người vận hành
 * đọc không hiểu. Gặp mã lạ thì trả lại chính mã đó thay vì để trống, để khi
 * backend thêm trạng thái mới thì màn hình vẫn còn thông tin chứ không hụt.
 */

const CONTAINER_STATE: Record<string, string> = {
  AT_MERCHANT: 'Ở quán',
  IN_TRANSIT: 'Đang vận chuyển',
  AT_STATION: 'Tại trạm',
};

const QUALITY: Record<string, string> = {
  PASS: 'Đạt',
  FLAG: 'Cần kiểm tra',
};

const VARIANCE_STATUS: Record<string, string> = {
  OK: 'Khớp',
  FLAGGED: 'Lệch quá ngưỡng',
};

const ALERT_SEVERITY: Record<string, string> = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
};

const APPROVAL_STATUS: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Đã từ chối',
};

const ENTITY_STATUS: Record<string, string> = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Tạm dừng',
};

function translate(table: Record<string, string>, value: string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return table[value] ?? value;
}

export function containerStateLabel(value: string | null | undefined): string {
  return translate(CONTAINER_STATE, value);
}

export function qualityLabel(value: string | null | undefined): string {
  return translate(QUALITY, value);
}

export function varianceStatusLabel(value: string | null | undefined): string {
  return translate(VARIANCE_STATUS, value);
}

export function alertSeverityLabel(value: string | null | undefined): string {
  return translate(ALERT_SEVERITY, value);
}

export function approvalStatusLabel(value: string | null | undefined): string {
  return translate(APPROVAL_STATUS, value);
}

export function entityStatusLabel(value: string | null | undefined): string {
  return translate(ENTITY_STATUS, value);
}

/** Dung tích kèm đơn vị; chưa có số thì nói rõ chứ không hiện "— lít". */
export function formatCapacity(liters: number | null | undefined): string {
  if (liters === null || liters === undefined || !Number.isFinite(liters)) return 'Chưa rõ';
  return `${liters.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} lít`;
}

const RISK_LEVEL: Record<string, string> = {
  HIGH_RISK: 'Rủi ro cao',
  REVIEW: 'Cần kiểm tra',
  NORMAL: 'Bình thường',
};

/**
 * Nhãn của từng mã nguyên nhân, chép đúng từ
 * apps/api/src/modules/collections/transaction-anomaly-scorer.ts.
 * Bảng breakdown_by_reason_code chỉ trả về mã, không kèm nhãn như reason_codes.
 */
const ANOMALY_REASON: Record<string, string> = {
  DENSITY_OUTLIER: 'Tỷ lệ kg/lít bất thường',
  MASS_OR_VOLUME_OUTLIER: 'Khối lượng hoặc thể tích bất thường',
  COLLECTION_TIME_OUTLIER: 'Thời gian thu gom khác thường',
  FREQUENCY_SPIKE: 'Tần suất giao dịch tăng đột biến',
  INSUFFICIENT_HISTORY: 'Chưa đủ lịch sử',
};

export function riskLevelLabel(value: string | null | undefined): string {
  return translate(RISK_LEVEL, value);
}

export function anomalyReasonLabel(value: string | null | undefined): string {
  return translate(ANOMALY_REASON, value);
}
