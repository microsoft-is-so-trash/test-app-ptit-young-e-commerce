import type {
  AdminActiveRoute,
  AdminOperationsMapMerchant,
  AdminOperationsMapResponse,
  AdminOperationsMapStation,
  AdminOperationsMapWard,
  MerchantEfficiencyLevel,
} from '@eco-oil/shared-types';

/**
 * Dữ liệu mẫu cho chế độ demo của bản đồ vận hành.
 * Bốn phường dưới đây trùng với seed thật ở apps/api/src/demo/seed-demo-wards.ts
 * nên bản demo và bản chạy dữ liệu thật nhìn giống nhau.
 */

const WARDS = [
  { id: 'w-hang-bac', code: 'HB-HK-DEMO', name: 'Phường Hàng Bạc', district: 'Quận Hoàn Kiếm', lat: 21.0333, lng: 105.85 },
  { id: 'w-cong-vi', code: 'CV-BD-DEMO', name: 'Phường Cống Vị', district: 'Quận Ba Đình', lat: 21.0358, lng: 105.8118 },
  { id: 'w-nguyen-du', code: 'NT-HBT-DEMO', name: 'Phường Nguyễn Du', district: 'Quận Hai Bà Trưng', lat: 21.0181, lng: 105.8469 },
  { id: 'w-trung-tu', code: 'TD-DD-DEMO', name: 'Phường Trung Tự', district: 'Quận Đống Đa', lat: 21.0104, lng: 105.8291 },
] as const;

type DemoMerchantSeed = {
  name: string;
  ward: number;
  dLat: number;
  dLng: number;
  level: MerchantEfficiencyLevel;
  score: number;
  reasons: string[];
  liters: number | null;
  ready: boolean;
  avgDaily: number | null;
  daysAgo: number | null;
  alerts: number;
  distanceM: number | null;
};

const MERCHANTS: DemoMerchantSeed[] = [
  // Hàng Bạc — khu phố cổ, quán đông, vận hành tốt
  { name: 'Bún Chả Phố Cổ', ward: 0, dLat: 0.0008, dLng: -0.0011, level: 'HEALTHY', score: 0, reasons: [], liters: 24, ready: true, avgDaily: 3.4, daysAgo: 2, alerts: 0, distanceM: 2400 },
  { name: 'Nem Rán Hàng Bạc', ward: 0, dLat: -0.0014, dLng: 0.0009, level: 'HEALTHY', score: 0, reasons: [], liters: 18.5, ready: true, avgDaily: 2.8, daysAgo: 1, alerts: 0, distanceM: 2650 },
  { name: 'Chả Cá Lã Vọng', ward: 0, dLat: 0.0021, dLng: 0.0015, level: 'HEALTHY', score: 10, reasons: ['DUE_NOW'], liters: 31.2, ready: false, avgDaily: 4.1, daysAgo: 8, alerts: 0, distanceM: 2100 },
  { name: 'Xôi Gà Hàng Đào', ward: 0, dLat: -0.0019, dLng: -0.0022, level: 'WATCH', score: 30, reasons: ['VERY_LOW_YIELD'], liters: 4.2, ready: false, avgDaily: 0.6, daysAgo: 4, alerts: 0, distanceM: 2800 },
  { name: 'Cà Phê Trứng Giảng', ward: 0, dLat: 0.0031, dLng: -0.0004, level: 'HEALTHY', score: 0, reasons: [], liters: 12.8, ready: false, avgDaily: 1.9, daysAgo: 3, alerts: 0, distanceM: 2250 },

  // Cống Vị — vận hành trung bình, có vài điểm cần để mắt
  { name: 'Lẩu Nướng Cống Vị', ward: 1, dLat: 0.0012, dLng: 0.0018, level: 'HEALTHY', score: 0, reasons: [], liters: 42.5, ready: true, avgDaily: 6.2, daysAgo: 2, alerts: 0, distanceM: 3100 },
  { name: 'Cơm Bình Dân Đội Cấn', ward: 1, dLat: -0.0023, dLng: 0.0011, level: 'WATCH', score: 32, reasons: ['OVERDUE', 'OPEN_ALERT'], liters: 27.4, ready: true, avgDaily: 3.8, daysAgo: 12, alerts: 1, distanceM: 3400 },
  { name: 'Bánh Mì Chảo Liễu Giai', ward: 1, dLat: 0.0027, dLng: -0.0016, level: 'HEALTHY', score: 0, reasons: [], liters: 15.6, ready: false, avgDaily: 2.2, daysAgo: 3, alerts: 0, distanceM: 2900 },
  { name: 'Quán Nhậu Vạn Bảo', ward: 1, dLat: -0.0009, dLng: -0.0028, level: 'WATCH', score: 48, reasons: ['SEVERELY_OVERDUE', 'LOW_YIELD'], liters: 8.9, ready: false, avgDaily: 1.1, daysAgo: 26, alerts: 0, distanceM: 3600 },
  { name: 'Phở Gà Ngọc Hà', ward: 1, dLat: 0.0035, dLng: 0.0007, level: 'HEALTHY', score: 0, reasons: [], liters: 21.3, ready: true, avgDaily: 3.1, daysAgo: 1, alerts: 0, distanceM: 3250 },
  { name: 'Quán Mới Khai Trương', ward: 1, dLat: -0.0031, dLng: 0.0024, level: 'INSUFFICIENT_DATA', score: 0, reasons: ['NO_COLLECTION_HISTORY'], liters: null, ready: false, avgDaily: null, daysAgo: null, alerts: 0, distanceM: 3800 },

  // Nguyễn Du — khu vực có vấn đề, nhiều điểm đỏ
  { name: 'Nhà Hàng Nguyễn Du', ward: 2, dLat: 0.0016, dLng: 0.0013, level: 'AT_RISK', score: 72, reasons: ['SEVERELY_OVERDUE', 'VERY_LOW_YIELD', 'OPEN_ALERT'], liters: 3.8, ready: false, avgDaily: 0.4, daysAgo: 34, alerts: 2, distanceM: 6200 },
  { name: 'Quán Ốc Trần Nhân Tông', ward: 2, dLat: -0.0018, dLng: 0.0021, level: 'AT_RISK', score: 63, reasons: ['SUSPECTED_ADULTERATION', 'OVERDUE', 'LOW_YIELD'], liters: 9.4, ready: false, avgDaily: 1.3, daysAgo: 17, alerts: 3, distanceM: 5900 },
  { name: 'Bia Hơi Nguyễn Bỉnh Khiêm', ward: 2, dLat: 0.0029, dLng: -0.0019, level: 'AT_RISK', score: 65, reasons: ['SEVERELY_OVERDUE', 'VERY_LOW_YIELD'], liters: 4.6, ready: false, avgDaily: 0.5, daysAgo: 41, alerts: 0, distanceM: 16400 },
  { name: 'Cháo Sườn Tuệ Tĩnh', ward: 2, dLat: -0.0025, dLng: -0.0012, level: 'WATCH', score: 38, reasons: ['OVERDUE', 'LOW_YIELD'], liters: 7.2, ready: false, avgDaily: 1.0, daysAgo: 15, alerts: 0, distanceM: 6050 },
  { name: 'Cơm Văn Phòng Thái Phiên', ward: 2, dLat: 0.0011, dLng: 0.0032, level: 'HEALTHY', score: 0, reasons: [], liters: 19.8, ready: true, avgDaily: 2.9, daysAgo: 2, alerts: 0, distanceM: 5700 },

  // Trung Tự — vận hành ổn
  { name: 'Bún Đậu Trung Tự', ward: 3, dLat: 0.0014, dLng: 0.0016, level: 'HEALTHY', score: 0, reasons: [], liters: 33.7, ready: true, avgDaily: 4.8, daysAgo: 1, alerts: 0, distanceM: 4100 },
  { name: 'Gà Rán Phạm Ngọc Thạch', ward: 3, dLat: -0.0021, dLng: 0.0008, level: 'HEALTHY', score: 0, reasons: [], liters: 51.2, ready: true, avgDaily: 7.4, daysAgo: 2, alerts: 0, distanceM: 4350 },
  { name: 'Quán Bia Kim Liên', ward: 3, dLat: 0.0026, dLng: -0.0023, level: 'WATCH', score: 30, reasons: ['VERY_LOW_YIELD'], liters: 4.9, ready: false, avgDaily: 0.7, daysAgo: 5, alerts: 0, distanceM: 4600 },
  { name: 'Miến Lươn Đặng Văn Ngữ', ward: 3, dLat: -0.0013, dLng: -0.0017, level: 'HEALTHY', score: 0, reasons: [], liters: 16.4, ready: false, avgDaily: 2.4, daysAgo: 3, alerts: 0, distanceM: 4250 },
  { name: 'Nướng Ngói Xã Đàn', ward: 3, dLat: 0.0033, dLng: 0.0011, level: 'HEALTHY', score: 0, reasons: [], liters: 28.1, ready: true, avgDaily: 4.0, daysAgo: 2, alerts: 0, distanceM: 3950 },
];

const STATIONS: AdminOperationsMapStation[] = [
  { id: 's-hoan-kiem', name: 'Trạm Hoàn Kiếm', address: '42 Trần Quang Khải, Hoàn Kiếm', ward_id: 'w-hang-bac', lat: 21.0361, lng: 105.8572, current_volume_l: 1840, capacity_l: 2500, fill_pct: 73.6 },
  { id: 's-dong-da', name: 'Trạm Đống Đa', address: '128 Tây Sơn, Đống Đa', ward_id: 'w-trung-tu', lat: 21.0067, lng: 105.8236, current_volume_l: 2210, capacity_l: 2400, fill_pct: 92.1 },
];

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function buildMerchants(): AdminOperationsMapMerchant[] {
  return MERCHANTS.map((seed, index) => {
    const ward = WARDS[seed.ward];
    return {
      id: `demo-merchant-${index + 1}`,
      name: seed.name,
      address: `${ward.name}, ${ward.district}, Hà Nội`,
      ward_id: ward.id,
      ward_code: ward.code,
      ward_name: ward.name,
      lat: ward.lat + seed.dLat,
      lng: ward.lng + seed.dLng,
      efficiency_level: seed.level,
      efficiency_score: seed.score,
      efficiency_reasons: seed.reasons,
      expected_liters: seed.liters,
      expected_liters_source: seed.liters === null ? 'NONE' : seed.ready ? 'READY_ORDER' : 'FORECAST',
      forecast_confidence: seed.liters === null ? null : seed.ready ? null : 'MEDIUM',
      avg_daily_liters: seed.avgDaily,
      last_collected_at: seed.daysAgo === null ? null : isoDaysAgo(seed.daysAgo),
      open_alert_count: seed.alerts,
      distance_m: seed.distanceM,
    };
  });
}

function buildWards(merchants: AdminOperationsMapMerchant[]): AdminOperationsMapWard[] {
  return WARDS.map((ward) => {
    const inWard = merchants.filter((merchant) => merchant.ward_id === ward.id);
    const sum = (source: 'READY_ORDER' | 'FORECAST') =>
      round(inWard.reduce((total, item) => total + (item.expected_liters_source === source ? item.expected_liters ?? 0 : 0), 0));
    const count = (level: MerchantEfficiencyLevel) =>
      inWard.filter((item) => item.efficiency_level === level).length;

    const atRisk = count('AT_RISK');
    const watch = count('WATCH');
    const healthy = count('HEALTHY');
    const scored = atRisk + watch + healthy;
    const level: MerchantEfficiencyLevel =
      scored === 0 ? 'INSUFFICIENT_DATA'
        : atRisk / scored >= 1 / 3 ? 'AT_RISK'
          : (atRisk + watch) / scored >= 0.2 ? 'WATCH'
            : 'HEALTHY';

    return {
      id: ward.id,
      code: ward.code,
      name: ward.name,
      district: ward.district,
      center_lat: ward.lat,
      center_lng: ward.lng,
      merchant_count: inWard.length,
      expected_liters: round(sum('READY_ORDER') + sum('FORECAST')),
      ready_order_liters: sum('READY_ORDER'),
      forecast_liters: sum('FORECAST'),
      efficiency_level: level,
      at_risk_count: atRisk,
      watch_count: watch,
      healthy_count: healthy,
      scored_count: scored,
    };
  });
}

function buildRoutes(merchants: AdminOperationsMapMerchant[]): AdminActiveRoute[] {
  const stopFrom = (merchant: AdminOperationsMapMerchant, sequence: number, status: 'PENDING' | 'COLLECTED') => ({
    order_id: `demo-order-${merchant.id}`,
    sequence,
    status,
    merchant_name: merchant.name,
    lat: merchant.lat,
    lng: merchant.lng,
    expected_liters: merchant.expected_liters,
  });

  const hoanKiem = merchants.filter((item) => item.ward_id === 'w-hang-bac').slice(0, 4);
  const dongDa = merchants.filter((item) => item.ward_id === 'w-trung-tu').slice(0, 3);

  return [
    {
      id: 'demo-route-01',
      collector_id: 'demo-collector-01',
      collector_name: 'Nguyễn Văn Thu (ca sáng)',
      started_at: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
      origin_lat: 21.0361,
      origin_lng: 105.8572,
      vehicle_capacity_l: 150,
      total_expected_liters: 86.5,
      remaining_capacity_l: 63.5,
      stop_count: hoanKiem.length,
      completed_stop_count: 2,
      stops: hoanKiem.map((merchant, index) => stopFrom(merchant, index + 1, index < 2 ? 'COLLECTED' : 'PENDING')),
    },
    {
      id: 'demo-route-02',
      collector_id: 'demo-collector-02',
      collector_name: 'Trần Thị Bình (ca chiều)',
      started_at: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
      origin_lat: 21.0067,
      origin_lng: 105.8236,
      vehicle_capacity_l: 200,
      total_expected_liters: 113.2,
      remaining_capacity_l: 158.4,
      stop_count: dongDa.length,
      completed_stop_count: 1,
      stops: dongDa.map((merchant, index) => stopFrom(merchant, index + 1, index < 1 ? 'COLLECTED' : 'PENDING')),
    },
  ];
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function demoOperationsMap(wardId?: string, onlyAtRisk = false): AdminOperationsMapResponse {
  const allMerchants = buildMerchants();
  const scoped = wardId ? allMerchants.filter((merchant) => merchant.ward_id === wardId) : allMerchants;
  const visible = onlyAtRisk ? scoped.filter((merchant) => merchant.efficiency_level === 'AT_RISK') : scoped;
  const wards = buildWards(scoped).filter((ward) => !wardId || ward.id === wardId);
  const routes = buildRoutes(allMerchants);

  return {
    generated_at: new Date().toISOString(),
    totals: {
      merchants_mapped: visible.length,
      expected_liters: round(wards.reduce((total, ward) => total + ward.expected_liters, 0)),
      ready_order_liters: round(wards.reduce((total, ward) => total + ward.ready_order_liters, 0)),
      forecast_liters: round(wards.reduce((total, ward) => total + ward.forecast_liters, 0)),
      active_routes: routes.length,
      at_risk_merchants: scoped.filter((merchant) => merchant.efficiency_level === 'AT_RISK').length,
    },
    merchants: visible,
    wards,
    stations: wardId ? STATIONS.filter((station) => station.ward_id === wardId) : STATIONS,
    routes,
  };
}

export function demoActiveRoutes(): AdminActiveRoute[] {
  return buildRoutes(buildMerchants());
}

export const demoWardOptions = WARDS.map((ward) => ({
  id: ward.id,
  name: ward.name,
  district: ward.district,
}));
