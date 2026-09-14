import { MerchantApprovalStatus } from '@eco-oil/shared-types';
import type {
  AdminActiveRoute,
  AdminOperationsMapMerchant,
  AdminOperationsMapResponse,
  AdminOperationsMapStation,
  AdminOperationsMapWard,
  MerchantEfficiencyLevel,
} from '@eco-oil/shared-types';
import {
  DEMO_TRANSACTIONS,
  collectorById,
  isoHoursAgo,
  type DemoMerchant,
} from './demo-dataset';
import {
  demoCurrentMerchants,
  demoCurrentStations,
  demoCurrentWards,
  demoOpenAlertCountByMerchant,
} from './demo-admin-store';

/**
 * Bản đồ vận hành ở chế độ demo. Dùng chung đúng các quán, phường, trạm và
 * người thu gom với miniapp qua demo-dataset, nên mở bảng quản trị và mở app
 * của người thu gom sẽ thấy cùng một địa bàn.
 *
 * Cách chấm điểm ở đây phải khớp với apps/api/src/modules/admin/merchant-efficiency-risk.ts
 * để bản demo không nói khác bản chạy dữ liệu thật.
 */

const VERY_LOW_YIELD_LITERS = 5;
const LOW_YIELD_LITERS = 10;
const FAR_FROM_STATION_KM = 15;
const WARD_AT_RISK_SHARE = 1 / 3;
const WARD_WATCH_SHARE = 0.2;

interface MerchantHistory {
  pickupCount: number;
  totalLiters: number;
  adulterationCount: number;
}

function historyFor(merchantId: string): MerchantHistory {
  const rows = DEMO_TRANSACTIONS.filter((txn) => txn.merchant_id === merchantId);
  return {
    pickupCount: rows.length,
    totalLiters: rows.reduce((sum, txn) => sum + txn.liters, 0),
    adulterationCount: rows.filter((txn) => txn.suspected_adulteration).length,
  };
}

function distanceKm(merchant: DemoMerchant): number | null {
  const stations = demoCurrentStations();
  if (stations.length === 0) return null;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const distances = stations.map((station) => {
    const dLat = toRad(station.lat - merchant.lat);
    const dLng = toRad(station.lng - merchant.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(merchant.lat)) * Math.cos(toRad(station.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(a));
  });
  return Math.min(...distances);
}

interface RiskResult {
  score: number;
  level: MerchantEfficiencyLevel;
  reasons: string[];
}

/** Cùng thang điểm với backend: quá hạn 35 · sản lượng 30 · cảnh báo 25 · khoảng cách 10. */
function scoreMerchant(merchant: DemoMerchant, openAlerts: number): RiskResult {
  const history = historyFor(merchant.id);
  const daysSince = merchant.last_collected_days_ago;

  if (history.pickupCount === 0 && daysSince === null && openAlerts === 0 && history.adulterationCount === 0) {
    return { score: 0, level: 'INSUFFICIENT_DATA', reasons: ['NO_COLLECTION_HISTORY'] };
  }

  const reasons: string[] = [];
  let score = 0;

  // Quá hạn: mốc suy ra từ sức chứa can chia sản lượng mỗi ngày.
  if (daysSince !== null) {
    const refillDays =
      merchant.avg_daily_liters && merchant.container_capacity_l
        ? merchant.container_capacity_l / merchant.avg_daily_liters
        : null;
    if (refillDays === null) {
      reasons.push('NO_CADENCE_BASELINE');
      if (daysSince >= 21) {
        score += 35;
        reasons.push('SEVERELY_OVERDUE');
      } else if (daysSince >= 14) {
        score += 20;
        reasons.push('OVERDUE');
      }
    } else {
      const ratio = daysSince / refillDays;
      if (ratio >= 2) {
        score += 35;
        reasons.push('SEVERELY_OVERDUE');
      } else if (ratio >= 1.25) {
        score += 20;
        reasons.push('OVERDUE');
      } else if (ratio >= 1) {
        score += 10;
        reasons.push('DUE_NOW');
      }
    }
  }

  if (history.pickupCount > 0) {
    const perPickup = history.totalLiters / history.pickupCount;
    if (perPickup < VERY_LOW_YIELD_LITERS) {
      score += 30;
      reasons.push('VERY_LOW_YIELD');
    } else if (perPickup < LOW_YIELD_LITERS) {
      score += 18;
      reasons.push('LOW_YIELD');
    }
  }

  if (history.adulterationCount > 0) {
    score += 25;
    reasons.push('SUSPECTED_ADULTERATION');
  } else if (openAlerts >= 3) {
    score += 20;
    reasons.push('MULTIPLE_OPEN_ALERTS');
  } else if (openAlerts >= 1) {
    score += 12;
    reasons.push('OPEN_ALERT');
  }

  const km = distanceKm(merchant);
  if (km === null) {
    reasons.push('MISSING_DISTANCE');
  } else if (km >= FAR_FROM_STATION_KM) {
    score += 10;
    reasons.push('FAR_FROM_STATION');
  }

  const bounded = Math.round(Math.min(Math.max(score, 0), 100));
  const level: MerchantEfficiencyLevel = bounded >= 60 ? 'AT_RISK' : bounded >= 30 ? 'WATCH' : 'HEALTHY';
  return { score: bounded, level, reasons };
}

function toMapMerchant(merchant: DemoMerchant): AdminOperationsMapMerchant {
  const ward = demoCurrentWards().find((item) => item.id === merchant.ward_id);
  const openAlerts = demoOpenAlertCountByMerchant(merchant.id);
  const risk = scoreMerchant(merchant, openAlerts);
  const history = historyFor(merchant.id);

  // Quán đang giữ can coi như đã báo sẵn sàng; còn lại là số AI dự báo.
  const hasReadyOrder = merchant.container_code !== null;
  const averagePerPickup =
    history.pickupCount === 0 ? null : history.totalLiters / history.pickupCount;
  const expected = hasReadyOrder
    ? Number((averagePerPickup ?? merchant.avg_daily_liters ?? 0).toFixed(1))
    : averagePerPickup === null
      ? null
      : Number((averagePerPickup * 0.9).toFixed(1));

  return {
    id: merchant.id,
    name: merchant.name,
    address: merchant.address,
    ward_id: merchant.ward_id,
    ward_code: ward?.code ?? null,
    ward_name: ward?.name ?? null,
    lat: merchant.lat,
    lng: merchant.lng,
    efficiency_level: risk.level,
    efficiency_score: risk.score,
    efficiency_reasons: risk.reasons,
    expected_liters: expected,
    expected_liters_source: expected === null ? 'NONE' : hasReadyOrder ? 'READY_ORDER' : 'FORECAST',
    forecast_confidence: expected === null || hasReadyOrder ? null : history.pickupCount >= 3 ? 'MEDIUM' : 'LOW',
    avg_daily_liters: merchant.avg_daily_liters,
    last_collected_at:
      merchant.last_collected_days_ago === null ? null : isoHoursAgo(merchant.last_collected_days_ago * 24),
    open_alert_count: openAlerts,
    distance_m: (() => {
      const km = distanceKm(merchant);
      return km === null ? null : Math.round(km * 1000);
    })(),
  };
}

function buildWards(merchants: AdminOperationsMapMerchant[]): AdminOperationsMapWard[] {
  return demoCurrentWards().map((ward) => {
    const inWard = merchants.filter((merchant) => merchant.ward_id === ward.id);
    const sumBySource = (source: 'READY_ORDER' | 'FORECAST') =>
      round(
        inWard.reduce(
          (total, item) => total + (item.expected_liters_source === source ? item.expected_liters ?? 0 : 0),
          0,
        ),
      );
    const count = (level: MerchantEfficiencyLevel) =>
      inWard.filter((item) => item.efficiency_level === level).length;

    const atRisk = count('AT_RISK');
    const watch = count('WATCH');
    const healthy = count('HEALTHY');
    const scored = atRisk + watch + healthy;
    const level: MerchantEfficiencyLevel =
      scored === 0
        ? 'INSUFFICIENT_DATA'
        : atRisk / scored >= WARD_AT_RISK_SHARE
          ? 'AT_RISK'
          : (atRisk + watch) / scored >= WARD_WATCH_SHARE
            ? 'WATCH'
            : 'HEALTHY';

    return {
      id: ward.id,
      code: ward.code,
      name: ward.name,
      district: ward.district,
      center_lat: ward.center_lat,
      center_lng: ward.center_lng,
      merchant_count: inWard.length,
      expected_liters: round(sumBySource('READY_ORDER') + sumBySource('FORECAST')),
      ready_order_liters: sumBySource('READY_ORDER'),
      forecast_liters: sumBySource('FORECAST'),
      efficiency_level: level,
      at_risk_count: atRisk,
      watch_count: watch,
      healthy_count: healthy,
      scored_count: scored,
    };
  });
}

function buildStations(wardId?: string): AdminOperationsMapStation[] {
  return demoCurrentStations()
    .filter((station) => !wardId || station.ward_id === wardId)
    .map((station) => ({
      id: station.id,
      name: station.name,
      address: station.address,
      ward_id: station.ward_id,
      lat: station.lat,
      lng: station.lng,
      current_volume_l: station.current_volume_l,
      capacity_l: station.capacity_l,
      fill_pct: round((station.current_volume_l / station.capacity_l) * 100),
    }));
}

/**
 * Hai tuyến đang chạy của đúng hai người thu gom trong dữ liệu demo:
 * Nguyễn Văn Thu đi bốn điểm trong tuyến, Trần Thị Hằng đi ba điểm ngoài tuyến.
 */
function buildRoutes(merchants: AdminOperationsMapMerchant[]): AdminActiveRoute[] {
  const plans: Array<{ collectorId: string; merchantIds: string[]; startedHoursAgo: number; done: number }> = [
    {
      collectorId: 'demo-collector-001',
      merchantIds: ['demo-merchant-001', 'demo-merchant-003', 'demo-merchant-004', 'demo-merchant-005'],
      startedHoursAgo: 2.5,
      done: 2,
    },
    {
      collectorId: 'demo-collector-002',
      merchantIds: ['demo-merchant-006', 'demo-merchant-007', 'demo-merchant-008'],
      startedHoursAgo: 0.9,
      done: 1,
    },
  ];

  return plans.map((plan, index) => {
    const collector = collectorById(plan.collectorId);
    const stops = plan.merchantIds
      .map((merchantId) => merchants.find((item) => item.id === merchantId))
      .filter((item): item is AdminOperationsMapMerchant => item !== undefined)
      .map((merchant, stopIndex) => ({
        order_id: `demo-order-${merchant.id}`,
        sequence: stopIndex + 1,
        status: (stopIndex < plan.done ? 'COLLECTED' : 'PENDING') as 'COLLECTED' | 'PENDING',
        merchant_name: merchant.name,
        lat: merchant.lat,
        lng: merchant.lng,
        expected_liters: merchant.expected_liters,
      }));

    const expected = round(stops.reduce((sum, stop) => sum + (stop.expected_liters ?? 0), 0));
    const capacity = collector?.max_capacity_l ?? 100;
    const origin = demoCurrentStations()[index % Math.max(demoCurrentStations().length, 1)];

    return {
      id: `demo-route-0${index + 1}`,
      collector_id: plan.collectorId,
      collector_name: collector?.display_name ?? 'Người thu gom',
      started_at: isoHoursAgo(plan.startedHoursAgo),
      origin_lat: origin?.lat ?? null,
      origin_lng: origin?.lng ?? null,
      vehicle_capacity_l: capacity,
      total_expected_liters: expected,
      remaining_capacity_l: round(Math.max(capacity - expected, 0)),
      stop_count: stops.length,
      completed_stop_count: stops.filter((stop) => stop.status === 'COLLECTED').length,
      stops,
    };
  });
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function demoOperationsMap(wardId?: string, onlyAtRisk = false): AdminOperationsMapResponse {
  // Chỉ vẽ quán đã duyệt — quán chờ duyệt chưa có địa bàn chính thức.
  const approved = demoCurrentMerchants().filter(
    (merchant) => merchant.approval_status === MerchantApprovalStatus.APPROVED,
  );
  const mapped = approved.map(toMapMerchant);
  const scoped = wardId ? mapped.filter((merchant) => merchant.ward_id === wardId) : mapped;
  const visible = onlyAtRisk ? scoped.filter((merchant) => merchant.efficiency_level === 'AT_RISK') : scoped;
  const wards = buildWards(scoped).filter((ward) => !wardId || ward.id === wardId);
  const routes = buildRoutes(mapped);

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
    stations: buildStations(wardId),
    routes,
  };
}

export function demoActiveRoutes(): AdminActiveRoute[] {
  const approved = demoCurrentMerchants().filter(
    (merchant) => merchant.approval_status === MerchantApprovalStatus.APPROVED,
  );
  return buildRoutes(approved.map(toMapMerchant));
}
