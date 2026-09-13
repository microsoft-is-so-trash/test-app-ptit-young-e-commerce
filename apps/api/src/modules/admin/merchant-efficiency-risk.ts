/**
 * Chấm điểm "nguy cơ thiếu hiệu quả" của một quán để tô màu trên bản đồ vận hành.
 * Điểm càng cao càng đáng lo: 0 là xanh, 30+ là vàng, 60+ là đỏ.
 *
 * Bốn nhóm tín hiệu, tổng tối đa 100:
 *   quá hạn thu gom 35 · sản lượng mỗi lượt 30 · cảnh báo 25 · khoảng cách 10
 */

export type MerchantEfficiencyLevel = 'HEALTHY' | 'WATCH' | 'AT_RISK' | 'INSUFFICIENT_DATA';

export type MerchantEfficiencyReasonCode =
  | 'NO_COLLECTION_HISTORY'
  | 'NO_CADENCE_BASELINE'
  | 'SEVERELY_OVERDUE'
  | 'OVERDUE'
  | 'DUE_NOW'
  | 'VERY_LOW_YIELD'
  | 'LOW_YIELD'
  | 'SUSPECTED_ADULTERATION'
  | 'MULTIPLE_OPEN_ALERTS'
  | 'OPEN_ALERT'
  | 'FAR_FROM_STATION'
  | 'MISSING_DISTANCE';

export type MerchantEfficiencyRiskInput = {
  days_since_last_collection: number | null;
  avg_daily_liters: number | null;
  container_capacity_liters: number | null;
  pickup_count: number;
  total_liters: number;
  open_alert_count: number;
  suspected_adulteration_count: number;
  distance_km: number | null;
};

export type MerchantEfficiencyRiskResult = {
  score: number;
  level: MerchantEfficiencyLevel;
  reason_codes: MerchantEfficiencyReasonCode[];
};

const AT_RISK_SCORE = 60;
const WATCH_SCORE = 30;

/** Không có lịch sử lẫn cadence thì rơi về mốc tuyệt đối này. */
const ABSOLUTE_SEVERELY_OVERDUE_DAYS = 21;
const ABSOLUTE_OVERDUE_DAYS = 14;

const VERY_LOW_YIELD_LITERS = 5;
const LOW_YIELD_LITERS = 10;
const FAR_FROM_STATION_KM = 15;

function finiteNonNegative(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function classify(score: number): MerchantEfficiencyLevel {
  if (score >= AT_RISK_SCORE) return 'AT_RISK';
  if (score >= WATCH_SCORE) return 'WATCH';
  return 'HEALTHY';
}

type Contribution = { points: number; reasons: MerchantEfficiencyReasonCode[] };

const NONE: Contribution = { points: 0, reasons: [] };

/**
 * Số ngày một quán cần để đầy can, suy ra từ sức chứa và sản lượng trung bình mỗi ngày.
 * Nhờ vậy quán nhỏ đổ chậm không bị coi là quá hạn chỉ vì lâu chưa ai ghé.
 */
function expectedRefillDays(input: MerchantEfficiencyRiskInput): number | null {
  const avgDaily = finiteNonNegative(input.avg_daily_liters);
  const capacity = finiteNonNegative(input.container_capacity_liters);
  if (avgDaily === null || capacity === null || avgDaily === 0 || capacity === 0) return null;
  return capacity / avgDaily;
}

function overdueContribution(input: MerchantEfficiencyRiskInput): Contribution {
  const daysSince = finiteNonNegative(input.days_since_last_collection);
  if (daysSince === null) return NONE;

  const refillDays = expectedRefillDays(input);
  if (refillDays === null) {
    if (daysSince >= ABSOLUTE_SEVERELY_OVERDUE_DAYS)
      return { points: 35, reasons: ['NO_CADENCE_BASELINE', 'SEVERELY_OVERDUE'] };
    if (daysSince >= ABSOLUTE_OVERDUE_DAYS)
      return { points: 20, reasons: ['NO_CADENCE_BASELINE', 'OVERDUE'] };
    return { points: 0, reasons: ['NO_CADENCE_BASELINE'] };
  }

  const ratio = daysSince / refillDays;
  if (ratio >= 2) return { points: 35, reasons: ['SEVERELY_OVERDUE'] };
  if (ratio >= 1.25) return { points: 20, reasons: ['OVERDUE'] };
  if (ratio >= 1) return { points: 10, reasons: ['DUE_NOW'] };
  return NONE;
}

/** Quán phải ghé nhiều lượt mà mỗi lượt chỉ được vài lít thì chuyến xe không bõ công. */
function yieldContribution(input: MerchantEfficiencyRiskInput): Contribution {
  const pickups = finiteNonNegative(input.pickup_count);
  const liters = finiteNonNegative(input.total_liters);
  if (pickups === null || liters === null || pickups === 0) return NONE;

  const litersPerPickup = liters / pickups;
  if (litersPerPickup < VERY_LOW_YIELD_LITERS) return { points: 30, reasons: ['VERY_LOW_YIELD'] };
  if (litersPerPickup < LOW_YIELD_LITERS) return { points: 18, reasons: ['LOW_YIELD'] };
  return NONE;
}

function alertContribution(input: MerchantEfficiencyRiskInput): Contribution {
  const adulteration = finiteNonNegative(input.suspected_adulteration_count) ?? 0;
  if (adulteration > 0) return { points: 25, reasons: ['SUSPECTED_ADULTERATION'] };

  const openAlerts = finiteNonNegative(input.open_alert_count) ?? 0;
  if (openAlerts >= 3) return { points: 20, reasons: ['MULTIPLE_OPEN_ALERTS'] };
  if (openAlerts >= 1) return { points: 12, reasons: ['OPEN_ALERT'] };
  return NONE;
}

function distanceContribution(input: MerchantEfficiencyRiskInput): Contribution {
  const distanceKm = finiteNonNegative(input.distance_km);
  if (distanceKm === null) return { points: 0, reasons: ['MISSING_DISTANCE'] };
  if (distanceKm >= FAR_FROM_STATION_KM) return { points: 10, reasons: ['FAR_FROM_STATION'] };
  return NONE;
}

/** Quán mới chưa từng thu gom lần nào thì chưa đủ căn cứ để chấm — trừ khi đã có cảnh báo. */
function hasNoTrackRecord(input: MerchantEfficiencyRiskInput): boolean {
  const pickups = finiteNonNegative(input.pickup_count) ?? 0;
  const daysSince = finiteNonNegative(input.days_since_last_collection);
  const openAlerts = finiteNonNegative(input.open_alert_count) ?? 0;
  const adulteration = finiteNonNegative(input.suspected_adulteration_count) ?? 0;
  return pickups === 0 && daysSince === null && openAlerts === 0 && adulteration === 0;
}

export function scoreMerchantEfficiencyRisk(
  input: MerchantEfficiencyRiskInput,
): MerchantEfficiencyRiskResult {
  if (hasNoTrackRecord(input)) {
    return { score: 0, level: 'INSUFFICIENT_DATA', reason_codes: ['NO_COLLECTION_HISTORY'] };
  }

  const contributions = [
    overdueContribution(input),
    yieldContribution(input),
    alertContribution(input),
    distanceContribution(input),
  ];

  const rawScore = contributions.reduce((total, item) => total + item.points, 0);
  const score = Math.round(Math.min(Math.max(rawScore, 0), 100));
  const reasonCodes = contributions.flatMap((item) => item.reasons);

  return { score, level: classify(score), reason_codes: [...new Set(reasonCodes)] };
}

export type WardEfficiencySummary = {
  level: MerchantEfficiencyLevel;
  at_risk_count: number;
  watch_count: number;
  healthy_count: number;
  scored_count: number;
};

/** Tỷ lệ quán đỏ đủ để cả phường chuyển đỏ. */
const WARD_AT_RISK_SHARE = 1 / 3;
/** Tỷ lệ quán cần để mắt đủ để cả phường chuyển vàng. */
const WARD_WATCH_SHARE = 0.2;

/**
 * Gộp điểm của từng quán thành màu của cả phường.
 * Quán chưa có lịch sử không được tính vào mẫu số, nếu không một phường mới mở
 * toàn quán chưa thu sẽ luôn hiện xanh.
 */
export function summarizeWardEfficiency(levels: MerchantEfficiencyLevel[]): WardEfficiencySummary {
  const atRisk = levels.filter((level) => level === 'AT_RISK').length;
  const watch = levels.filter((level) => level === 'WATCH').length;
  const healthy = levels.filter((level) => level === 'HEALTHY').length;
  const scored = atRisk + watch + healthy;

  const summary = {
    at_risk_count: atRisk,
    watch_count: watch,
    healthy_count: healthy,
    scored_count: scored,
  };

  if (scored === 0) return { level: 'INSUFFICIENT_DATA', ...summary };
  if (atRisk / scored >= WARD_AT_RISK_SHARE) return { level: 'AT_RISK', ...summary };
  if ((atRisk + watch) / scored >= WARD_WATCH_SHARE) return { level: 'WATCH', ...summary };
  return { level: 'HEALTHY', ...summary };
}
