import { ContainerState, DeliveryStatus, EntityStatus, MassSource, OilGrade, Quality } from '@eco-oil/shared-types';
import type {
  CollectionCreateRequest,
  CollectionTransactionResponse,
  ContainerLookupResponse,
  CurrentRouteResponse,
  RouteStop,
  StationDeliveryResponse,
  StationRecommendation,
  SyncBatchResponse,
} from '@eco-oil/shared-types';

/** Tâm phường Hàng Bài, dùng làm mốc để đặt các điểm thu gom mẫu. */
const WARD_CENTER = { lat: 21.0221, lng: 105.8524 };

interface DemoStopSeed {
  name: string;
  address: string;
  phone: string;
  containerCode: string;
  expectedLiters: number;
  distanceM: number;
  latOffset: number;
  lngOffset: number;
  priorityLevel: RouteStop['pickup_priority_level'];
  priorityScore: number;
  priorityReasons: string[];
  forecastLiters: number;
  forecastConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

const DEMO_STOP_SEEDS: DemoStopSeed[] = [
  {
    name: 'Quán ăn Cô Ba',
    address: '24 Hàng Bài, Hoàn Kiếm, Hà Nội',
    phone: '0908123456',
    containerCode: 'ECO-0142',
    expectedLiters: 26,
    distanceM: 380,
    latOffset: 0.0018,
    lngOffset: 0.0011,
    priorityLevel: 'URGENT',
    priorityScore: 92,
    priorityReasons: ['NEAR_FULL', 'OVERDUE_COLLECTION'],
    forecastLiters: 27.5,
    forecastConfidence: 'HIGH',
  },
  {
    name: 'Bún chả Hàng Than',
    address: '12 Hàng Than, Ba Đình, Hà Nội',
    phone: '0912345678',
    containerCode: 'ECO-0187',
    expectedLiters: 18,
    distanceM: 1240,
    latOffset: -0.0042,
    lngOffset: 0.0026,
    priorityLevel: 'HIGH',
    priorityScore: 74,
    priorityReasons: ['HIGH_FILL', 'WAITING_LONG'],
    forecastLiters: 19.2,
    forecastConfidence: 'MEDIUM',
  },
  {
    name: 'Cơm tấm Sài Gòn',
    address: '88 Lò Đúc, Hai Bà Trưng, Hà Nội',
    phone: '0934567890',
    containerCode: 'ECO-0203',
    expectedLiters: 12,
    distanceM: 2150,
    latOffset: 0.0036,
    lngOffset: -0.0048,
    priorityLevel: 'NORMAL',
    priorityScore: 51,
    priorityReasons: ['MEDIUM_FILL'],
    forecastLiters: 11.4,
    forecastConfidence: 'MEDIUM',
  },
  {
    name: 'Phở gà Nguyệt',
    address: '5 Phủ Doãn, Hoàn Kiếm, Hà Nội',
    phone: '0945678901',
    containerCode: 'ECO-0219',
    expectedLiters: 9,
    distanceM: 2980,
    latOffset: -0.0025,
    lngOffset: -0.0033,
    priorityLevel: 'LOW',
    priorityScore: 28,
    priorityReasons: ['NEARBY', 'ALREADY_SCHEDULED'],
    forecastLiters: 8.6,
    forecastConfidence: 'LOW',
  },
];

function buildStop(seed: DemoStopSeed, index: number): RouteStop {
  return {
    seq: index + 1,
    order_id: `demo-order-${index + 1}`,
    merchant: {
      name: seed.name,
      address: seed.address,
      phone: seed.phone,
      lat: WARD_CENTER.lat + seed.latOffset,
      lng: WARD_CENTER.lng + seed.lngOffset,
    },
    container_code: seed.containerCode,
    expected_liters: seed.expectedLiters,
    priority: DEMO_STOP_SEEDS.length - index,
    distance_m: seed.distanceM,
    pickup_priority_score: seed.priorityScore,
    pickup_priority_level: seed.priorityLevel,
    pickup_priority_reason_codes: seed.priorityReasons,
    pickup_volume_forecast: {
      predicted_liters: seed.forecastLiters,
      confidence: seed.forecastConfidence,
      sample_size: seed.forecastConfidence === 'LOW' ? 2 : 8,
      reason_codes: seed.forecastConfidence === 'LOW' ? ['LIMITED_HISTORY'] : ['HISTORY_WEIGHTED', 'STABLE_HISTORY'],
    },
    route_stop_status: 'PENDING',
    collected_at: null,
    skipped_at: null,
    ward_center: WARD_CENTER,
  };
}

const DEMO_STOPS = DEMO_STOP_SEEDS.map(buildStop);
const VEHICLE_CAPACITY_LITERS = 100;
const DEMO_EXPECTED_TOTAL = DEMO_STOPS.reduce((sum, stop) => sum + stop.expected_liters, 0);

export const DEMO_COLLECTOR_ROUTE: CurrentRouteResponse = {
  stops: DEMO_STOPS,
  total_expected_liters: DEMO_EXPECTED_TOTAL,
  remaining_capacity_l: VEHICLE_CAPACITY_LITERS - DEMO_EXPECTED_TOTAL,
  route_id: null,
  route_status: 'PREVIEW',
  persisted: false,
  client_uuid: null,
  started_at: null,
  route_optimization: {
    estimated_distance_before_m: 9400,
    estimated_distance_after_m: 6750,
    saved_distance_m: 2650,
    optimization_applied: true,
    reason_codes: ['ROUTE_OPTIMIZED'],
  },
  route_capacity_risk: {
    predicted_total_liters: 66.7,
    risk_adjusted_total_liters: 73.4,
    risk_adjusted_remaining_liters: 26.6,
    risk_utilization_pct: 73.4,
    level: 'BALANCED',
    confidence: 'MEDIUM',
    forecast_coverage_pct: 100,
    reason_codes: ['FORECAST_AVAILABLE'],
  },
};

/** Tuyến rỗng để xem trạng thái "chưa có điểm READY". */
export const DEMO_EMPTY_ROUTE: CurrentRouteResponse = {
  stops: [],
  total_expected_liters: 0,
  remaining_capacity_l: VEHICLE_CAPACITY_LITERS,
  route_id: null,
  route_status: 'PREVIEW',
  persisted: false,
  client_uuid: null,
  started_at: null,
};

export function demoRouteForCollector(collectorId: string | null): CurrentRouteResponse {
  return collectorId === 'demo-collector-002' ? DEMO_EMPTY_ROUTE : DEMO_COLLECTOR_ROUTE;
}

export function demoStartedRoute(route: CurrentRouteResponse, clientUuid: string): CurrentRouteResponse {
  return {
    ...route,
    route_id: `demo-route-${clientUuid.slice(0, 8)}`,
    route_status: 'ACTIVE',
    persisted: true,
    client_uuid: clientUuid,
    started_at: new Date().toISOString(),
  };
}

export function demoContainerByQr(code: string): ContainerLookupResponse {
  const stop = DEMO_STOPS.find((item) => item.container_code === code) ?? DEMO_STOPS[0];
  return {
    id: `demo-container-${stop.container_code}`,
    qr_code: code,
    state: ContainerState.AT_MERCHANT,
    status: EntityStatus.ACTIVE,
    capacity_liters: 30,
    merchant: {
      id: `demo-merchant-${stop.seq}`,
      name: stop.merchant.name,
      address: stop.merchant.address,
      lat: stop.merchant.lat,
      lng: stop.merchant.lng,
    },
  };
}

export const DEMO_STATIONS: StationRecommendation[] = [
  {
    id: 'demo-station-01',
    name: 'Trạm Eco Oil Long Biên',
    address: 'KCN Sài Đồng, Long Biên, Hà Nội',
    lat: 21.0405,
    lng: 105.8912,
    capacity_l: 5000,
    current_volume_l: 2870,
    remaining_capacity_l: 2130,
    distance_m: 5400,
  },
  {
    id: 'demo-station-02',
    name: 'Trạm Eco Oil Thanh Trì',
    address: 'Ngũ Hiệp, Thanh Trì, Hà Nội',
    lat: 20.9512,
    lng: 105.8467,
    capacity_l: 3000,
    current_volume_l: 2450,
    remaining_capacity_l: 550,
    distance_m: 9100,
  },
];

export function demoCollectionResponse(payload: CollectionCreateRequest): CollectionTransactionResponse {
  const collectedAt = payload.collected_at ?? new Date().toISOString();
  return {
    ...payload,
    id: `demo-collection-${payload.client_uuid}`,
    actual_liters: payload.actual_liters ?? 0,
    container_id: `demo-container-${payload.container_code ?? 'ECO-0142'}`,
    merchant_id: 'demo-merchant-001',
    collector_id: 'demo-collector-001',
    collected_at: collectedAt,
    created_at: new Date().toISOString(),
    mass_source: payload.actual_kg === undefined || payload.actual_kg === null ? MassSource.ESTIMATED_FROM_VOLUME : MassSource.SCALE,
    density_factor: null,
    grade: payload.grade ?? null,
    grade_photo_url: payload.grade_photo_url ?? null,
    grade_note: payload.grade_note ?? null,
    suspected_adulteration: payload.suspected_adulteration ?? false,
    image_grade_suggestion: payload.image_grade_suggestion ?? null,
    ai_suggested_grade: payload.ai_suggested_grade ?? null,
    collector_selected_grade: payload.collector_selected_grade ?? null,
    collector_grade_confirmed: payload.collector_grade_confirmed ?? false,
    image_grade_confidence: payload.image_grade_confidence ?? null,
    image_grade_model_version: payload.image_grade_model_version ?? null,
    image_grade_analysis: payload.image_grade_analysis ?? null,
    grade_decision_source: payload.grade_decision_source ?? null,
    grade_ai_override_acknowledged: payload.grade_ai_override_acknowledged ?? false,
  };
}

export function demoSyncBatchResponse(items: CollectionCreateRequest[]): SyncBatchResponse {
  return {
    results: items.map((item) => ({ client_uuid: item.client_uuid, status: 'created' as const, id: `demo-collection-${item.client_uuid}` })),
    summary: { created: items.length, duplicate: 0, failed: 0 },
  };
}

export function demoStationDelivery(payload: { client_uuid: string; station_id: string; transaction_ids: string[]; actual_liters: number; actual_kg?: number | null }): StationDeliveryResponse {
  const expectedLiters = payload.actual_liters;
  return {
    client_uuid: payload.client_uuid,
    station_id: payload.station_id,
    transaction_ids: payload.transaction_ids,
    actual_liters: payload.actual_liters,
    id: `demo-delivery-${payload.client_uuid}`,
    collector_id: 'demo-collector-001',
    expected_liters: expectedLiters,
    expected_kg: null,
    actual_kg: payload.actual_kg ?? null,
    variance_kg: null,
    mass_source: MassSource.ESTIMATED_FROM_VOLUME,
    has_estimated_mass: true,
    variance_l: 0,
    variance_pct: 0,
    status: DeliveryStatus.OK,
    created_at: new Date().toISOString(),
  };
}

/** Lịch sử thu gom của người thu gom, dùng cho tab Lịch sử và Thống kê. */
export function demoCollectorHistory(): CollectionTransactionResponse[] {
  const entries = [
    { daysAgo: 0, liters: 26, stop: 0 },
    { daysAgo: 0, liters: 18, stop: 1 },
    { daysAgo: 1, liters: 22, stop: 2 },
    { daysAgo: 1, liters: 15, stop: 3 },
    { daysAgo: 2, liters: 31, stop: 0 },
    { daysAgo: 3, liters: 24, stop: 1 },
    { daysAgo: 5, liters: 19, stop: 2 },
    { daysAgo: 8, liters: 28, stop: 3 },
    { daysAgo: 12, liters: 21, stop: 0 },
    { daysAgo: 20, liters: 25, stop: 1 },
  ];

  return entries.map((entry, index) => {
    const stop = DEMO_STOPS[entry.stop];
    const collectedAt = new Date(Date.now() - entry.daysAgo * 86_400_000 - index * 3_600_000).toISOString();
    const grade = index % 4 === 3 ? OilGrade.B : OilGrade.A;
    return demoCollectionResponse({
      client_uuid: `demo-history-${index + 1}`,
      order_id: stop.order_id,
      container_code: stop.container_code,
      actual_liters: entry.liters,
      grade,
      collector_selected_grade: grade,
      collector_grade_confirmed: true,
      quality: Quality.PASS,
      geo: { lat: stop.merchant.lat, lng: stop.merchant.lng },
      photos: [],
      collected_at: collectedAt,
    });
  });
}
