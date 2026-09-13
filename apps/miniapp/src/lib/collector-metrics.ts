import { DEFAULT_DENSITY_KG_PER_LITER } from '@eco-oil/shared-types';
import type { CollectionCreateRequest, CurrentRouteResponse, RouteStop } from '@eco-oil/shared-types';
import type { OutboxRecord } from './outbox-db';
import type { OilImageAnalysis } from './oil-image-analyzer';
import { normalizeVietnamesePhone } from './zalo-client';

export interface CompletedStop {
  liters: number;
  kilograms: number | null;
  clientUuid: string;
  stop: RouteStop;
}

export interface ReconciledRouteProgress {
  completed: Record<string, CompletedStop>;
  completedOrderIds: string[];
  skippedOrderIds: string[];
}

function completedStopFromOutbox(row: OutboxRecord, stop: RouteStop): CompletedStop {
  const payload = row.payload as Partial<CollectionCreateRequest>;
  const kilograms = typeof payload.actual_kg === 'number' && Number.isFinite(payload.actual_kg) ? payload.actual_kg : null;
  const liters = typeof payload.actual_liters === 'number' && Number.isFinite(payload.actual_liters)
    ? payload.actual_liters
    : kilograms === null ? 0 : kilograms / DEFAULT_DENSITY_KG_PER_LITER;
  return { liters, kilograms, clientUuid: row.client_uuid, stop };
}

export function reconcileRouteProgress(
  route: CurrentRouteResponse,
  storedCompleted: Record<string, CompletedStop>,
  storedRouteId: string | undefined,
  outboxRows: OutboxRecord[],
): ReconciledRouteProgress {
  const completed: Record<string, CompletedStop> = {};
  const completedOrderIds = new Set<string>();
  const skippedOrderIds = new Set<string>();
  const canUseStoredCompleted = route.route_id
    ? storedRouteId === route.route_id
    : storedRouteId === undefined;

  for (const stop of route.stops) {
    if (stop.route_stop_status === 'SKIPPED') {
      skippedOrderIds.add(stop.order_id);
      continue;
    }
    if (stop.route_stop_status === 'COLLECTED') {
      completedOrderIds.add(stop.order_id);
    }

    const stored = canUseStoredCompleted ? storedCompleted[stop.order_id] : undefined;
    const outbox = outboxRows.find((row) => {
      if (row.type !== 'collection') return false;
      const payload = row.payload as Partial<CollectionCreateRequest>;
      return payload.order_id === stop.order_id && ['pending', 'syncing', 'synced', 'failed'].includes(row.status);
    });
    if (stored) {
      completed[stop.order_id] = stored;
      completedOrderIds.add(stop.order_id);
    } else if (outbox) {
      completed[stop.order_id] = completedStopFromOutbox(outbox, stop);
      completedOrderIds.add(stop.order_id);
    }
  }

  if (canUseStoredCompleted) {
    for (const [orderId, stored] of Object.entries(storedCompleted)) {
      if (skippedOrderIds.has(orderId) || completed[orderId]) continue;
      completed[orderId] = stored;
      completedOrderIds.add(orderId);
    }
  }

  return { completed, completedOrderIds: [...completedOrderIds], skippedOrderIds: [...skippedOrderIds] };
}
const PICKUP_PRIORITY_LEVELS = {
  URGENT: { label: 'Khẩn cấp', className: 'urgent' },
  HIGH: { label: 'Ưu tiên cao', className: 'high' },
  NORMAL: { label: 'Bình thường', className: 'normal' },
  LOW: { label: 'Ưu tiên thấp', className: 'low' },
  INSUFFICIENT_DATA: { label: 'Chưa đủ dữ liệu', className: 'insufficient' },
} as const;

const PICKUP_PRIORITY_REASONS: Record<string, string> = {
  MISSING_FILL_DATA: 'Thiếu dữ liệu mức đầy',
  NEAR_FULL: 'Can gần đầy',
  HIGH_FILL: 'Mức đầy cao',
  MEDIUM_FILL: 'Mức đầy trung bình',
  MISSING_COLLECTION_HISTORY: 'Chưa có lịch sử thu gom',
  OVERDUE_COLLECTION: 'Đã quá lâu chưa thu',
  WAITING_LONG: 'Đã chờ lâu',
  MISSING_DISTANCE: 'Thiếu dữ liệu khoảng cách',
  NEARBY: 'Điểm thu ở gần',
  ALREADY_SCHEDULED: 'Đã có lịch thu gom',
};

const PICKUP_VOLUME_CONFIDENCE: Record<string, { label: string; className: string }> = {
  HIGH: { label: 'Tin cậy cao', className: 'high' },
  MEDIUM: { label: 'Tin cậy trung bình', className: 'medium' },
  LOW: { label: 'Tin cậy thấp', className: 'low' },
  INSUFFICIENT_DATA: { label: 'Chưa đủ dữ liệu', className: 'insufficient' },
};

const PICKUP_VOLUME_REASONS: Record<string, string> = {
  HISTORY_WEIGHTED: 'Dựa trên lịch sử gần đây',
  DECLARED_ESTIMATE_BLEND: 'Kết hợp số quán khai',
  DECLARED_ESTIMATE_ONLY: 'Tạm tính theo số quán khai',
  LIMITED_HISTORY: 'Ít dữ liệu lịch sử',
  STABLE_HISTORY: 'Sản lượng khá ổn định',
  VOLATILE_HISTORY: 'Sản lượng biến động',
  PREDICTION_CAPPED_TO_CAPACITY: 'Không vượt dung tích can',
};

export function pickupPriorityLevelLabel(level: string): string | null {
  return PICKUP_PRIORITY_LEVELS[level as keyof typeof PICKUP_PRIORITY_LEVELS]?.label ?? null;
}

export function pickupPriorityReasonLabel(reasonCode: string): string {
  return PICKUP_PRIORITY_REASONS[reasonCode] ?? reasonCode;
}

export interface PickupVolumeForecastDisplay {
  predictedLiters: number | null;
  confidenceLabel: string;
  className: string;
  sampleSize: number | null;
  declaredOnly: boolean;
  reasons: string[];
}

function isValidForecastLiters(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function validSampleSize(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
}

export function formatPickupVolumeLiters(value: unknown): string | null {
  if (!isValidForecastLiters(value)) return null;
  return `${value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} lít`;
}

export function getPickupVolumeForecastDisplay(stop: RouteStop): PickupVolumeForecastDisplay | null {
  const candidate = (stop as RouteStop & { pickup_volume_forecast?: unknown }).pickup_volume_forecast;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;

  const metadata = candidate as {
    predicted_liters?: unknown;
    confidence?: unknown;
    sample_size?: unknown;
    reason_codes?: unknown;
  };
  const declaredOnly = Array.isArray(metadata.reason_codes) && metadata.reason_codes.includes('DECLARED_ESTIMATE_ONLY');
  const confidence = declaredOnly ? PICKUP_VOLUME_CONFIDENCE.LOW : PICKUP_VOLUME_CONFIDENCE[String(metadata.confidence)] ?? PICKUP_VOLUME_CONFIDENCE.INSUFFICIENT_DATA;
  const reasons = Array.isArray(metadata.reason_codes)
    ? [...new Set(metadata.reason_codes.filter((reason): reason is string => typeof reason === 'string').map((reason) => PICKUP_VOLUME_REASONS[reason]).filter((reason): reason is string => Boolean(reason)))].slice(0, 2)
    : [];

  return {
    predictedLiters: isValidForecastLiters(metadata.predicted_liters) ? metadata.predicted_liters : null,
    confidenceLabel: confidence.label,
    className: confidence.className,
    sampleSize: validSampleSize(metadata.sample_size),
    declaredOnly,
    reasons,
  };
}

export type PickupVolumeDeviationLevel = 'NORMAL' | 'REVIEW' | 'HIGH';

export type PickupVolumeDeviationResult = {
  level: PickupVolumeDeviationLevel;
  predicted_liters: number;
  actual_liters: number;
  deviation_liters: number;
  deviation_pct: number;
};

export function evaluatePickupVolumeDeviation(stop: RouteStop, actualLiters: unknown): PickupVolumeDeviationResult | null {
  const candidate = (stop as RouteStop & { pickup_volume_forecast?: unknown }).pickup_volume_forecast;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  const metadata = candidate as { predicted_liters?: unknown; confidence?: unknown; reason_codes?: unknown };
  const predictedLiters = metadata.predicted_liters;
  const confidence = metadata.confidence;
  const reasonCodes = Array.isArray(metadata.reason_codes) ? metadata.reason_codes : [];
  if (!isValidForecastLiters(predictedLiters) || predictedLiters <= 0) return null;
  if (!isValidForecastLiters(actualLiters)) return null;
  if (confidence !== 'HIGH' && confidence !== 'MEDIUM') return null;
  if (reasonCodes.includes('DECLARED_ESTIMATE_ONLY')) return null;

  const deviationLiters = actualLiters - predictedLiters;
  const deviationPct = Math.abs(deviationLiters) / predictedLiters;
  if (!Number.isFinite(deviationLiters) || !Number.isFinite(deviationPct)) return null;
  const level: PickupVolumeDeviationLevel = deviationPct <= 0.2 ? 'NORMAL' : deviationPct <= 0.35 ? 'REVIEW' : 'HIGH';
  return {
    level,
    predicted_liters: predictedLiters,
    actual_liters: actualLiters,
    deviation_liters: deviationLiters,
    deviation_pct: deviationPct,
  };
}

export function formatDeviationPercent(value: number): string {
  return `${(value * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
}

export function formatSignedDeviationLiters(value: number): string {
  const formatted = Math.abs(value).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  return `${value >= 0 ? '+' : '-'}${formatted} lít`;
}

export function getPickupVolumeDeviationKey(deviation: PickupVolumeDeviationResult | null): string | null {
  return deviation?.level === 'HIGH'
    ? `${deviation.predicted_liters}:${deviation.actual_liters}:${deviation.deviation_pct}`
    : null;
}

export function requiresPickupVolumeAcknowledgement(
  deviation: PickupVolumeDeviationResult | null,
  acknowledgementKey: string | null,
): boolean {
  const key = getPickupVolumeDeviationKey(deviation);
  return key !== null && key !== acknowledgementKey;
}
const IMAGE_GRADE_CONFIDENCE_LABELS: Record<OilImageAnalysis['confidence'], string> = {
  HIGH: 'Tin cậy cao',
  MEDIUM: 'Tin cậy trung bình',
  LOW: 'Tin cậy thấp',
};

const IMAGE_GRADE_LABELS: Record<'A' | 'B' | 'C', string> = {
  A: 'Hạng A',
  B: 'Hạng B',
  C: 'Hạng C',
};

const IMAGE_GRADE_REASON_LABELS: Partial<Record<string, string>> = {
  LIGHT_CLEAR_APPEARANCE: 'Màu sáng và khá trong',
  MEDIUM_BROWN_APPEARANCE: 'Màu nâu trung bình',
  DARK_APPEARANCE: 'Màu sẫm',
  HIGH_TEXTURE_OR_SEDIMENT: 'Kết cấu/cặn nổi bật',
  LOW_TEXTURE: 'Ít kết cấu nhìn thấy',
  IMAGE_TOO_DARK: 'Ảnh quá tối',
  IMAGE_OVEREXPOSED: 'Ảnh quá sáng',
  IMAGE_TOO_BLURRY: 'Ảnh có thể bị mờ',
  IMAGE_TOO_SMALL: 'Ảnh quá nhỏ',
  MULTIPLE_IMAGES_DISAGREE: 'Các ảnh cho tín hiệu khác nhau',
  INSUFFICIENT_IMAGE_SIGNAL: 'Tín hiệu hình ảnh chưa đủ',
};

export interface ImageGradeAnalysisDisplay {
  suggestedGrade: string | null;
  confidenceLabel: string;
  qualityLabel: string;
  reasons: string[];
  summary: string;
  canUseSuggestion: boolean;
}

export function getImageGradeAnalysisDisplay(analysis: OilImageAnalysis | null | undefined): ImageGradeAnalysisDisplay | null {
  if (!analysis) return null;
  const reasons = [...new Set(analysis.reason_codes.map((code) => IMAGE_GRADE_REASON_LABELS[code]).filter((label): label is string => Boolean(label)))].slice(0, 3);
  return {
    suggestedGrade: analysis.suggested_grade ? IMAGE_GRADE_LABELS[analysis.suggested_grade] : null,
    confidenceLabel: IMAGE_GRADE_CONFIDENCE_LABELS[analysis.confidence],
    qualityLabel: analysis.quality_status === 'USABLE' ? 'Ảnh có thể dùng' : analysis.quality_status === 'RETAKE_RECOMMENDED' ? 'Nên chụp lại nếu có thể' : 'Chưa hỗ trợ phân tích ảnh này',
    reasons,
    summary: analysis.summary,
    canUseSuggestion: analysis.suggested_grade !== null && analysis.quality_status !== 'UNSUPPORTED',
  };
}

type RouteOptimizationMetadata = NonNullable<CurrentRouteResponse['route_optimization']>;

export interface RouteOptimizationDisplay {
  title: string;
  message: string;
  detail: string | null;
  tone: 'success' | 'neutral' | 'warning';
}

function isSafeDistance(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function formatRouteOptimizationDistance(value: unknown): string | null {
  if (!isSafeDistance(value)) return null;
  if (value < 1_000) return `${Math.round(value).toLocaleString('vi-VN')} m`;
  return `${(value / 1_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km`;
}

export function getRouteOptimizationDisplay(metadata: RouteOptimizationMetadata | null | undefined): RouteOptimizationDisplay | null {
  if (!metadata || metadata.reason_codes.includes('INSUFFICIENT_STOPS')) return null;

  const hasInvalidCoordinates = metadata.reason_codes.includes('INVALID_STOP_COORDINATES') || metadata.reason_codes.includes('INVALID_ORIGIN');
  if (hasInvalidCoordinates) {
    return {
      title: 'Đã ưu tiên điểm thu gom',
      message: 'Chưa thể ước tính đầy đủ quãng đường',
      detail: null,
      tone: 'warning',
    };
  }

  if (metadata.reason_codes.includes('ALREADY_OPTIMAL')) {
    return {
      title: 'Tuyến hiện tại đã tối ưu',
      message: 'Không cần thay đổi thứ tự điểm',
      detail: null,
      tone: 'success',
    };
  }

  if (!metadata.optimization_applied) return null;
  const savedDistance = formatRouteOptimizationDistance(metadata.saved_distance_m);
  const before = formatRouteOptimizationDistance(metadata.estimated_distance_before_m);
  const after = formatRouteOptimizationDistance(metadata.estimated_distance_after_m);
  if (isSafeDistance(metadata.saved_distance_m) && metadata.saved_distance_m > 0 && savedDistance) {
    return {
      title: 'AI đã tối ưu tuyến',
      message: `Tiết kiệm khoảng ${savedDistance}`,
      detail: before && after ? `${before} → ${after}` : null,
      tone: 'success',
    };
  }

  return {
    title: 'AI đã sắp xếp lại tuyến',
    message: 'Thứ tự điểm đã được tối ưu theo mức ưu tiên',
    detail: before && after ? `${before} → ${after}` : null,
    tone: 'success',
  };
}

type RouteCapacityRiskLevel = 'OVER_CAPACITY' | 'NEAR_CAPACITY' | 'BALANCED' | 'UNDERUTILIZED' | 'INSUFFICIENT_DATA';
type RouteCapacityRiskConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';

const ROUTE_CAPACITY_RISK_LEVELS: Record<RouteCapacityRiskLevel, { title: string; tone: 'danger' | 'warning' | 'success' | 'neutral' | 'insufficient' }> = {
  OVER_CAPACITY: { title: 'Nguy cơ quá tải', tone: 'danger' },
  NEAR_CAPACITY: { title: 'Xe có thể gần đầy', tone: 'warning' },
  BALANCED: { title: 'Tải xe hợp lý', tone: 'success' },
  UNDERUTILIZED: { title: 'Xe còn nhiều chỗ trống', tone: 'neutral' },
  INSUFFICIENT_DATA: { title: 'Chưa đủ dữ liệu đánh giá tải xe', tone: 'insufficient' },
};

const ROUTE_CAPACITY_RISK_CONFIDENCE: Record<RouteCapacityRiskConfidence, string> = {
  HIGH: 'Tin cậy cao',
  MEDIUM: 'Tin cậy trung bình',
  LOW: 'Tin cậy thấp',
  INSUFFICIENT_DATA: 'Chưa đủ dữ liệu',
};

export interface RouteCapacityRiskDisplay {
  level: RouteCapacityRiskLevel;
  title: string;
  tone: 'danger' | 'warning' | 'success' | 'neutral' | 'insufficient';
  utilizationPct: number | null;
  riskAdjustedTotalLiters: number | null;
  riskAdjustedRemainingLiters: number | null;
  vehicleCapacityLiters: number | null;
  confidenceLabel: string;
  coveragePct: number | null;
  message: string | null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeFinite(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

export function formatRouteCapacityRiskLiters(value: unknown): string | null {
  if (!isNonNegativeFinite(value)) return null;
  return `${value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} lít`;
}

export function getRouteCapacityRiskDisplay(
  metadata: CurrentRouteResponse['route_capacity_risk'] | null | undefined,
  vehicleCapacityLiters: unknown,
): RouteCapacityRiskDisplay | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const reasonCodes = Array.isArray(metadata.reason_codes) ? metadata.reason_codes : [];
  if (reasonCodes.includes('NO_STOPS')) return null;

  const rawLevel = metadata.level as RouteCapacityRiskLevel;
  const level = Object.prototype.hasOwnProperty.call(ROUTE_CAPACITY_RISK_LEVELS, rawLevel) ? rawLevel : 'INSUFFICIENT_DATA';
  const levelDisplay = ROUTE_CAPACITY_RISK_LEVELS[level];
  const confidence = metadata.confidence as RouteCapacityRiskConfidence;
  const confidenceLabel = ROUTE_CAPACITY_RISK_CONFIDENCE[confidence] ?? ROUTE_CAPACITY_RISK_CONFIDENCE.INSUFFICIENT_DATA;
  const coveragePct = isNonNegativeFinite(metadata.forecast_coverage_pct) && metadata.forecast_coverage_pct <= 100
    ? Math.round(metadata.forecast_coverage_pct)
    : null;
  const validVehicleCapacity = isFiniteNumber(vehicleCapacityLiters) && vehicleCapacityLiters > 0 ? vehicleCapacityLiters : null;
  const validRiskTotal = isNonNegativeFinite(metadata.risk_adjusted_total_liters) ? metadata.risk_adjusted_total_liters : null;
  const validRiskRemaining = isFiniteNumber(metadata.risk_adjusted_remaining_liters) ? metadata.risk_adjusted_remaining_liters : null;
  const validUtilization = isNonNegativeFinite(metadata.risk_utilization_pct) ? Math.round(metadata.risk_utilization_pct) : null;
  const hasValidMetrics = validVehicleCapacity !== null && validRiskTotal !== null && validRiskRemaining !== null && validUtilization !== null;

  if (level !== 'INSUFFICIENT_DATA' && !hasValidMetrics) {
    return {
      level: 'INSUFFICIENT_DATA',
      title: ROUTE_CAPACITY_RISK_LEVELS.INSUFFICIENT_DATA.title,
      tone: ROUTE_CAPACITY_RISK_LEVELS.INSUFFICIENT_DATA.tone,
      utilizationPct: null,
      riskAdjustedTotalLiters: null,
      riskAdjustedRemainingLiters: null,
      vehicleCapacityLiters: null,
      confidenceLabel: ROUTE_CAPACITY_RISK_CONFIDENCE.INSUFFICIENT_DATA,
      coveragePct,
      message: null,
    };
  }

  let message: string | null = null;
  if (level === 'OVER_CAPACITY' && validRiskRemaining !== null && validRiskRemaining < 0) {
    message = `Có thể vượt tải khoảng ${formatRouteCapacityRiskLiters(Math.abs(validRiskRemaining))}`;
  } else if (level === 'NEAR_CAPACITY' && validRiskRemaining !== null && validRiskRemaining >= 0) {
    message = `Còn khoảng ${formatRouteCapacityRiskLiters(validRiskRemaining)} dự phòng`;
  } else if (level === 'BALANCED') {
    message = 'Tuyến đang sử dụng sức chứa ở mức phù hợp';
  } else if (level === 'UNDERUTILIZED' && validRiskRemaining !== null && validRiskRemaining >= 0) {
    message = `Còn khoảng ${formatRouteCapacityRiskLiters(validRiskRemaining)} sức chứa`;
  }

  return {
    level,
    title: levelDisplay.title,
    tone: levelDisplay.tone,
    utilizationPct: validUtilization,
    riskAdjustedTotalLiters: validRiskTotal,
    riskAdjustedRemainingLiters: validRiskRemaining,
    vehicleCapacityLiters: validVehicleCapacity,
    confidenceLabel,
    coveragePct,
    message,
  };
}
export function getPickupPriorityDisplay(stop: RouteStop): {
  level: keyof typeof PICKUP_PRIORITY_LEVELS;
  label: string;
  className: string;
  score: number;
  reasons: string[];
} | null {
  const aiStop = stop as RouteStop & {
    pickup_priority_score?: unknown;
    pickup_priority_level?: unknown;
    pickup_priority_reason_codes?: unknown;
  };
  const level = typeof aiStop.pickup_priority_level === 'string' ? aiStop.pickup_priority_level : null;
  const display = level ? PICKUP_PRIORITY_LEVELS[level as keyof typeof PICKUP_PRIORITY_LEVELS] : undefined;
  if (!display || typeof aiStop.pickup_priority_score !== 'number' || !Number.isFinite(aiStop.pickup_priority_score)) {
    return null;
  }

  const reasons = Array.isArray(aiStop.pickup_priority_reason_codes)
    ? aiStop.pickup_priority_reason_codes.filter((reason): reason is string => typeof reason === 'string' && reason.length > 0).map(pickupPriorityReasonLabel)
    : [];
  return { level: level as keyof typeof PICKUP_PRIORITY_LEVELS, ...display, score: aiStop.pickup_priority_score, reasons };
}

export function isValidPhone(phone: unknown): phone is string {
  if (typeof phone !== 'string') return false;
  try {
    normalizeVietnamesePhone(phone);
    return true;
  } catch {
    return false;
  }
}

export type EmptyRouteState = 'none' | 'no-ready' | 'completed' | 'incomplete-active';

export function getEmptyRouteState(
  route: CurrentRouteResponse,
  visibleStopCount: number,
  completedOrderIds: string[],
): EmptyRouteState {
  if (visibleStopCount > 0) return 'none';
  if (route.route_status === 'COMPLETED') return 'completed';
  if (route.route_status === 'PREVIEW') return 'no-ready';
  const completed = new Set(completedOrderIds);
  const allProcessed = route.stops.length > 0 && route.stops.every((stop) =>
    stop.route_stop_status === 'COLLECTED'
    || stop.route_stop_status === 'SKIPPED'
    || completed.has(stop.order_id));
  return allProcessed ? 'completed' : 'incomplete-active';
}
export function findRowForStop(rows: OutboxRecord[], stop: RouteStop): OutboxRecord | undefined {
  return rows.find((row) => row.type === 'collection' && (row.payload as Partial<CollectionCreateRequest>).order_id === stop.order_id);
}
