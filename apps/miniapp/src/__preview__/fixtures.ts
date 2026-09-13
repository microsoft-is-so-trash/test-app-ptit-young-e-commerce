/**
 * Dữ liệu giả dùng chung cho preview harness.
 *
 * Nguyên tắc: mọi giá trị phải khớp kiểu thật và dùng đúng mã mà backend thực sự phát ra
 * (xem apps/api/src/modules/orders/merchant-pickup-priority.ts). Tên quán / địa chỉ / số
 * điện thoại lấy theo đúng dữ liệu đã seed trong scripts/seed-demo.ts để preview sát thật.
 */
import { ContainerState, EntityStatus, OilGrade, Quality } from '@eco-oil/shared-types';
import type {
  CollectionCreateRequest,
  ContainerLookupResponse,
  CurrentRouteResponse,
  RouteStop,
  StationRecommendation,
} from '@eco-oil/shared-types';
import type { CompletedStop } from '../lib/collector-metrics';
import type { OutboxRecord, OutboxStats, StoredStationReceipt } from '../lib/outbox-db';

function makeStop(
  seq: number,
  name: string,
  address: string,
  phone: string,
  lat: number,
  lng: number,
  expected: number,
  distance: number,
  level: RouteStop['pickup_priority_level'],
  reasons: string[],
  forecast: RouteStop['pickup_volume_forecast'],
): RouteStop {
  return {
    seq,
    order_id: `order-${seq}`,
    merchant: { name, address, phone, lat, lng },
    container_code: `ECO-${1000 + seq}`,
    expected_liters: expected,
    priority: seq,
    distance_m: distance,
    pickup_priority_score: 100 - seq * 7,
    pickup_priority_level: level,
    pickup_priority_reason_codes: reasons,
    pickup_volume_forecast: forecast,
  };
}

export const stops: RouteStop[] = [
  makeStop(1, 'Bếp Xanh Cống Vị', '52 Đội Cấn, Ba Đình, Hà Nội', '0901000002', 21.0352, 105.8151, 24, 850, 'URGENT',
    ['NEAR_FULL', 'OVERDUE_COLLECTION'],
    { predicted_liters: 26.5, confidence: 'HIGH', sample_size: 12, reason_codes: ['HISTORY_WEIGHTED', 'STABLE_HISTORY'] }),
  makeStop(2, 'Phở Nguyễn Du', '40 Nguyễn Du, Hai Bà Trưng, Hà Nội', '0901000003', 21.0187, 105.8458, 18, 2100, 'HIGH',
    ['HIGH_FILL', 'NEARBY'],
    { predicted_liters: 17.2, confidence: 'MEDIUM', sample_size: 5, reason_codes: ['LIMITED_HISTORY'] }),
  makeStop(3, 'Cơm Nhà Hồ Gươm', '8 Đinh Tiên Hoàng, Hoàn Kiếm, Hà Nội', '0901000004', 21.0288, 105.8524, 12, 3400, 'NORMAL',
    ['MEDIUM_FILL'],
    { predicted_liters: null, confidence: 'INSUFFICIENT_DATA', sample_size: 0, reason_codes: ['DECLARED_ESTIMATE_ONLY'] }),
  makeStop(4, 'Bún Riêu Trung Tự', '16 Phạm Ngọc Thạch, Đống Đa, Hà Nội', '0901000005', 21.0097, 105.8302, 9, 5200, 'LOW',
    ['ALREADY_SCHEDULED', 'MISSING_DISTANCE'],
    { predicted_liters: 8.4, confidence: 'LOW', sample_size: 3, reason_codes: ['VOLATILE_HISTORY'] }),
];

export const route: CurrentRouteResponse = {
  stops,
  total_expected_liters: 63,
  remaining_capacity_l: 17,
  route_id: 'route-demo-1',
  route_status: 'ACTIVE',
  persisted: true,
  started_at: new Date().toISOString(),
  route_optimization: {
    estimated_distance_before_m: 14200,
    estimated_distance_after_m: 11550,
    saved_distance_m: 2650,
    optimization_applied: true,
    reason_codes: ['ROUTE_OPTIMIZED'],
  },
  route_capacity_risk: {
    predicted_total_liters: 68,
    risk_adjusted_total_liters: 74,
    risk_adjusted_remaining_liters: 6,
    risk_utilization_pct: 92,
    level: 'NEAR_CAPACITY',
    confidence: 'MEDIUM',
    forecast_coverage_pct: 75,
    reason_codes: ['FORECAST_ABOVE_DECLARED'],
  },
};

export const container: ContainerLookupResponse = {
  id: 'container-1',
  qr_code: 'ECO-1001',
  state: ContainerState.AT_MERCHANT,
  status: EntityStatus.ACTIVE,
  capacity_liters: 30,
  merchant: {
    id: 'merchant-1',
    name: 'Bếp Xanh Cống Vị',
    address: '52 Đội Cấn, Ba Đình, Hà Nội',
    lat: 21.0352,
    lng: 105.8151,
  },
};

export const outboxRows: OutboxRecord[] = [
  {
    client_uuid: 'uuid-pending-1',
    type: 'collection',
    payload: { order_id: 'order-1' },
    status: 'pending',
    attempts: 1,
    last_error: null,
    next_attempt_at: null,
    created_at: new Date().toISOString(),
    synced_at: null,
  },
];

export const outboxStats: OutboxStats = {
  pending: 1,
  syncing: 0,
  failed: 0,
  synced: 3,
  bytes: 2048,
  over_limit: false,
};

export const completed: Record<string, CompletedStop> = {
  'order-1': { liters: 23.5, kilograms: 21.2, clientUuid: 'uuid-done-1', stop: stops[0] },
  'order-2': { liters: 17, kilograms: 15.3, clientUuid: 'uuid-done-2', stop: stops[1] },
};

export const station: StationRecommendation = {
  id: 'station-1',
  name: 'Trạm ECollect Hồ Gươm',
  address: '22 Hàng Bạc, Hoàn Kiếm, Hà Nội',
  lat: 21.0333,
  lng: 105.8524,
  capacity_l: 1000,
  current_volume_l: 640,
  remaining_capacity_l: 360,
  distance_m: 2400,
};

export const stations: StationRecommendation[] = [
  station,
  {
    id: 'station-2',
    name: 'Trạm ECollect Cống Vị',
    address: '80 Đội Cấn, Ba Đình, Hà Nội',
    lat: 21.0355,
    lng: 105.8148,
    capacity_l: 1500,
    current_volume_l: 1320,
    remaining_capacity_l: 180,
    distance_m: 5600,
  },
];

function makeCollection(orderId: string, clientUuid: string, liters: number, kg: number): CollectionCreateRequest {
  return {
    client_uuid: clientUuid,
    order_id: orderId,
    container_code: 'ECO-1001',
    actual_liters: liters,
    actual_kg: kg,
    grade: OilGrade.A,
    collector_selected_grade: OilGrade.A,
    collector_grade_confirmed: true,
    quality: Quality.PASS,
    geo: { lat: 21.0352, lng: 105.8151 },
    photos: [],
    collected_at: new Date().toISOString(),
  };
}

export const candidates = Object.values(completed).map((item, index) => ({
  ...item,
  record: {
    client_uuid: item.clientUuid,
    type: 'collection' as const,
    payload: {},
    status: 'synced' as const,
    attempts: 1,
    last_error: null,
    next_attempt_at: null,
    created_at: new Date().toISOString(),
    synced_at: new Date().toISOString(),
  } satisfies OutboxRecord,
  collection: makeCollection(`order-${index + 1}`, item.clientUuid, item.liters, item.kilograms ?? 0),
}));

export const receipt: StoredStationReceipt = {
  receipt_id: 'RC-2026-0912-001',
  client_uuid: 'uuid-receipt-1',
  station_id: 'station-1',
  station_name: 'Trạm ECollect Hồ Gươm',
  collector_id: 'collector-1',
  created_at: new Date().toISOString(),
  expected_liters: 40.5,
  expected_kg: 36.5,
  actual_liters: 39,
  actual_kg: 35.1,
  variance_liters: -1.5,
  variance_kg: -1.4,
  variance_pct: -3.7,
  units: { volume: 'lít', mass: 'kg' },
  transactions: [
    { transaction_id: 'tx-1', merchant_name: 'Bếp Xanh Cống Vị', liters: 23.5, kilograms: 21.2, collected_at: new Date().toISOString() },
    { transaction_id: 'tx-2', merchant_name: 'Phở Nguyễn Du', liters: 17, kilograms: 15.3, collected_at: new Date().toISOString() },
  ],
};

export const noop = (): void => undefined;
