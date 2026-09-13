import { Inject, Injectable } from '@nestjs/common';
import type {
  AdminActiveRoute,
  AdminActiveRouteStop,
  AdminActiveRoutesResponse,
  AdminOperationsMapMerchant,
  AdminOperationsMapResponse,
  AdminOperationsMapStation,
  AdminOperationsMapWard,
  CollectionRouteStopStatus,
} from '@eco-oil/shared-types';
import type { AdminOperationsMapQueryInput } from '@eco-oil/validation';
import { PrismaService } from '../../prisma/prisma.service';
import { forecastMerchantPickupVolume } from '../orders/merchant-pickup-volume-forecast';
import {
  scoreMerchantEfficiencyRisk,
  summarizeWardEfficiency,
  type MerchantEfficiencyLevel,
} from './merchant-efficiency-risk';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Số quán tối đa vẽ lên bản đồ một lần — đủ cho một thành phố, tránh kéo sập trình duyệt. */
const MERCHANT_LIMIT = 500;

type MerchantMapRow = {
  id: string;
  name: string;
  address: string | null;
  ward_id: string;
  ward_code: string | null;
  ward_name: string | null;
  lat: number | null;
  lng: number | null;
  avg_daily_liters: number | null;
  last_collected_at: Date | null;
  ready_expected_liters: number | null;
  container_capacity_liters: number | null;
  pickup_count: number;
  total_liters: number;
  open_alert_count: number;
  adulteration_count: number;
  distance_m: number | null;
};

type WardRow = {
  id: string;
  code: string;
  name: string;
  district: string;
  center_lat: number | null;
  center_lng: number | null;
};

type StationRow = {
  id: string;
  name: string;
  address: string | null;
  ward_id: string;
  lat: number | null;
  lng: number | null;
  current_volume_l: number;
  capacity_l: number;
};

type RouteRow = {
  id: string;
  collector_id: string;
  collector_name: string;
  started_at: Date;
  origin_lat: number | null;
  origin_lng: number | null;
  vehicle_capacity_l: number;
  total_expected_liters: number;
  remaining_capacity_l: number;
};

type RouteStopRow = {
  route_id: string;
  order_id: string;
  sequence: number;
  status: CollectionRouteStopStatus;
  expected_liters: number | null;
  merchant_name: string | null;
  lat: number | null;
  lng: number | null;
};

/**
 * Dữ liệu cho bản đồ vận hành của quản trị viên: vị trí quán, sản lượng dự kiến theo
 * phường, tuyến đang chạy và mức độ rủi ro hiệu quả của từng điểm.
 */
@Injectable()
export class OperationsMapService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async operationsMap(query: AdminOperationsMapQueryInput): Promise<AdminOperationsMapResponse> {
    const asOf = new Date();
    const wardFilter = query.ward_id ?? null;

    const [merchantRows, wardRows, stationRows, routes] = await Promise.all([
      this.findMerchantRows(wardFilter),
      this.findWardRows(wardFilter),
      this.findStationRows(wardFilter),
      this.findActiveRoutes(),
    ]);

    const historyByMerchant = await this.findHistoryByMerchant(merchantRows.map((row) => row.id));

    const merchants = merchantRows
      .filter((row) => row.lat !== null && row.lng !== null)
      .map((row) => this.toMapMerchant(row, historyByMerchant.get(row.id) ?? [], asOf));

    const visible = query.only_at_risk
      ? merchants.filter((merchant) => merchant.efficiency_level === 'AT_RISK')
      : merchants;

    const wards = this.rollUpWards(wardRows, merchants);

    return {
      generated_at: asOf.toISOString(),
      totals: {
        merchants_mapped: visible.length,
        expected_liters: round(wards.reduce((sum, ward) => sum + ward.expected_liters, 0)),
        ready_order_liters: round(wards.reduce((sum, ward) => sum + ward.ready_order_liters, 0)),
        forecast_liters: round(wards.reduce((sum, ward) => sum + ward.forecast_liters, 0)),
        active_routes: routes.length,
        at_risk_merchants: merchants.filter((item) => item.efficiency_level === 'AT_RISK').length,
      },
      merchants: visible,
      wards,
      stations: stationRows.map(toMapStation),
      routes,
    };
  }

  async activeRoutes(): Promise<AdminActiveRoutesResponse> {
    return { data: await this.findActiveRoutes() };
  }

  private toMapMerchant(
    row: MerchantMapRow,
    history: Array<{ actual_liters: number; collected_at: Date }>,
    asOf: Date,
  ): AdminOperationsMapMerchant {
    const daysSinceLastCollection = row.last_collected_at
      ? Math.max(0, (asOf.getTime() - row.last_collected_at.getTime()) / DAY_MS)
      : null;

    const risk = scoreMerchantEfficiencyRisk({
      days_since_last_collection: daysSinceLastCollection,
      avg_daily_liters: row.avg_daily_liters,
      container_capacity_liters: row.container_capacity_liters,
      pickup_count: row.pickup_count,
      total_liters: row.total_liters,
      open_alert_count: row.open_alert_count,
      suspected_adulteration_count: row.adulteration_count,
      distance_km: row.distance_m === null ? null : row.distance_m / 1000,
    });

    // Quán đã bấm "sẵn sàng" thì tin số quán khai; còn lại mới nhờ AI đoán.
    const forecast =
      row.ready_expected_liters === null
        ? forecastMerchantPickupVolume({
            container_capacity_liters: row.container_capacity_liters,
            declared_estimated_liters: null,
            history,
            as_of: asOf,
          })
        : null;

    const expectedLiters = row.ready_expected_liters ?? forecast?.predicted_liters ?? null;

    return {
      id: row.id,
      name: row.name,
      address: row.address,
      ward_id: row.ward_id,
      ward_code: row.ward_code,
      ward_name: row.ward_name,
      lat: row.lat as number,
      lng: row.lng as number,
      efficiency_level: risk.level,
      efficiency_score: risk.score,
      efficiency_reasons: risk.reason_codes,
      expected_liters: expectedLiters,
      expected_liters_source:
        row.ready_expected_liters !== null
          ? 'READY_ORDER'
          : forecast?.predicted_liters !== null && forecast !== null
            ? 'FORECAST'
            : 'NONE',
      forecast_confidence: forecast?.confidence ?? null,
      avg_daily_liters: row.avg_daily_liters,
      last_collected_at: row.last_collected_at?.toISOString() ?? null,
      open_alert_count: row.open_alert_count,
      distance_m: row.distance_m,
    };
  }

  private rollUpWards(
    wardRows: WardRow[],
    merchants: AdminOperationsMapMerchant[],
  ): AdminOperationsMapWard[] {
    const byWard = new Map<string, AdminOperationsMapMerchant[]>();
    for (const merchant of merchants) {
      byWard.set(merchant.ward_id, [...(byWard.get(merchant.ward_id) ?? []), merchant]);
    }

    return wardRows.map((ward) => {
      const inWard = byWard.get(ward.id) ?? [];
      const readyLiters = sumBy(inWard, (item) =>
        item.expected_liters_source === 'READY_ORDER' ? item.expected_liters : null,
      );
      const forecastLiters = sumBy(inWard, (item) =>
        item.expected_liters_source === 'FORECAST' ? item.expected_liters : null,
      );
      const summary = summarizeWardEfficiency(
        inWard.map((item) => item.efficiency_level as MerchantEfficiencyLevel),
      );

      return {
        id: ward.id,
        code: ward.code,
        name: ward.name,
        district: ward.district,
        center_lat: ward.center_lat,
        center_lng: ward.center_lng,
        merchant_count: inWard.length,
        expected_liters: round(readyLiters + forecastLiters),
        ready_order_liters: round(readyLiters),
        forecast_liters: round(forecastLiters),
        efficiency_level: summary.level,
        at_risk_count: summary.at_risk_count,
        watch_count: summary.watch_count,
        healthy_count: summary.healthy_count,
        scored_count: summary.scored_count,
      };
    });
  }

  private async findMerchantRows(wardId: string | null): Promise<MerchantMapRow[]> {
    return this.prisma.$queryRaw<MerchantMapRow[]>`
      WITH nearest_station AS (
        SELECT m."id" AS merchant_id,
          MIN(ST_Distance(m."location", s."location"))::float8 AS distance_m
        FROM "merchants" m
        JOIN "stations" s
          ON s."deleted_at" IS NULL AND s."is_active" = true AND s."location" IS NOT NULL
        WHERE m."deleted_at" IS NULL AND m."location" IS NOT NULL
        GROUP BY m."id"
      ),
      ready_orders AS (
        SELECT DISTINCT ON (o."merchant_id")
          o."merchant_id",
          o."expected_liters"::float8 AS expected_liters
        FROM "collection_orders" o
        WHERE o."deleted_at" IS NULL AND o."status" = 'READY'
        ORDER BY o."merchant_id", o."requested_at" DESC
      ),
      merchant_history AS (
        SELECT ct."merchant_id",
          COUNT(*)::int AS pickup_count,
          COALESCE(SUM(ct."actual_liters"), 0)::float8 AS total_liters,
          COUNT(*) FILTER (WHERE ct."suspected_adulteration")::int AS adulteration_count
        FROM "collection_transactions" ct
        WHERE ct."deleted_at" IS NULL
        GROUP BY ct."merchant_id"
      ),
      merchant_alerts AS (
        SELECT ct."merchant_id", COUNT(a."id")::int AS open_alert_count
        FROM "alerts" a
        JOIN "collection_transactions" ct ON ct."id" = a."transaction_id"
        WHERE a."resolved_at" IS NULL AND ct."deleted_at" IS NULL
        GROUP BY ct."merchant_id"
      ),
      merchant_container AS (
        SELECT c."merchant_id",
          MAX(c."capacity_liters")::float8 AS container_capacity_liters
        FROM "containers" c
        WHERE c."deleted_at" IS NULL AND c."is_active" = true AND c."merchant_id" IS NOT NULL
        GROUP BY c."merchant_id"
      )
      SELECT m."id",
        m."business_name" AS name,
        m."address",
        m."ward_id",
        w."code" AS ward_code,
        w."name" AS ward_name,
        ST_Y(m."location"::geometry)::float8 AS lat,
        ST_X(m."location"::geometry)::float8 AS lng,
        m."avg_daily_liters"::float8 AS avg_daily_liters,
        m."last_collected_at",
        ro.expected_liters AS ready_expected_liters,
        mc.container_capacity_liters,
        COALESCE(mh.pickup_count, 0) AS pickup_count,
        COALESCE(mh.total_liters, 0) AS total_liters,
        COALESCE(ma.open_alert_count, 0) AS open_alert_count,
        COALESCE(mh.adulteration_count, 0) AS adulteration_count,
        ns.distance_m
      FROM "merchants" m
      JOIN "wards" w ON w."id" = m."ward_id"
      LEFT JOIN nearest_station ns ON ns.merchant_id = m."id"
      LEFT JOIN ready_orders ro ON ro."merchant_id" = m."id"
      LEFT JOIN merchant_history mh ON mh."merchant_id" = m."id"
      LEFT JOIN merchant_alerts ma ON ma."merchant_id" = m."id"
      LEFT JOIN merchant_container mc ON mc."merchant_id" = m."id"
      WHERE m."deleted_at" IS NULL
        AND m."is_active" = true
        AND m."approval_status" = 'APPROVED'
        AND m."location" IS NOT NULL
        AND (${wardId}::uuid IS NULL OR m."ward_id" = ${wardId}::uuid)
      ORDER BY m."business_name"
      LIMIT ${MERCHANT_LIMIT}
    `;
  }

  private async findWardRows(wardId: string | null): Promise<WardRow[]> {
    return this.prisma.$queryRaw<WardRow[]>`
      SELECT w."id", w."code", w."name", w."district",
        w."center_lat"::float8 AS center_lat,
        w."center_lng"::float8 AS center_lng
      FROM "wards" w
      WHERE w."deleted_at" IS NULL
        AND w."is_active" = true
        AND (${wardId}::uuid IS NULL OR w."id" = ${wardId}::uuid)
      ORDER BY w."district", w."name"
    `;
  }

  private async findStationRows(wardId: string | null): Promise<StationRow[]> {
    return this.prisma.$queryRaw<StationRow[]>`
      SELECT s."id", s."name", s."address", s."ward_id",
        ST_Y(s."location"::geometry)::float8 AS lat,
        ST_X(s."location"::geometry)::float8 AS lng,
        s."current_volume_l"::float8 AS current_volume_l,
        s."capacity_l"::float8 AS capacity_l
      FROM "stations" s
      WHERE s."deleted_at" IS NULL
        AND s."is_active" = true
        AND (${wardId}::uuid IS NULL OR s."ward_id" = ${wardId}::uuid)
      ORDER BY s."name"
    `;
  }

  private async findActiveRoutes(): Promise<AdminActiveRoute[]> {
    const routes = await this.prisma.$queryRaw<RouteRow[]>`
      SELECT r."id",
        r."collector_id",
        c."display_name" AS collector_name,
        r."started_at",
        r."origin_lat"::float8 AS origin_lat,
        r."origin_lng"::float8 AS origin_lng,
        r."vehicle_capacity_l"::float8 AS vehicle_capacity_l,
        r."total_expected_liters"::float8 AS total_expected_liters,
        r."remaining_capacity_l"::float8 AS remaining_capacity_l
      FROM "collection_routes" r
      JOIN "collectors" c ON c."id" = r."collector_id"
      WHERE r."status" = 'ACTIVE'
      ORDER BY r."started_at" DESC
    `;
    if (routes.length === 0) return [];

    const routeIds = routes.map((route) => route.id);
    const stops = await this.prisma.$queryRaw<RouteStopRow[]>`
      SELECT rs."route_id",
        rs."order_id",
        rs."sequence",
        rs."status",
        rs."expected_liters"::float8 AS expected_liters,
        m."business_name" AS merchant_name,
        ST_Y(m."location"::geometry)::float8 AS lat,
        ST_X(m."location"::geometry)::float8 AS lng
      FROM "collection_route_stops" rs
      JOIN "collection_orders" o ON o."id" = rs."order_id"
      JOIN "merchants" m ON m."id" = o."merchant_id"
      WHERE rs."route_id" = ANY(${routeIds}::uuid[])
      ORDER BY rs."route_id", rs."sequence"
    `;

    const stopsByRoute = new Map<string, AdminActiveRouteStop[]>();
    for (const stop of stops) {
      const mapped: AdminActiveRouteStop = {
        order_id: stop.order_id,
        sequence: stop.sequence,
        status: stop.status,
        merchant_name: stop.merchant_name ?? 'Không rõ quán',
        lat: stop.lat,
        lng: stop.lng,
        expected_liters: stop.expected_liters,
      };
      stopsByRoute.set(stop.route_id, [...(stopsByRoute.get(stop.route_id) ?? []), mapped]);
    }

    return routes.map((route) => {
      const routeStops = stopsByRoute.get(route.id) ?? [];
      return {
        id: route.id,
        collector_id: route.collector_id,
        collector_name: route.collector_name,
        started_at: route.started_at.toISOString(),
        origin_lat: route.origin_lat,
        origin_lng: route.origin_lng,
        vehicle_capacity_l: route.vehicle_capacity_l,
        total_expected_liters: route.total_expected_liters,
        remaining_capacity_l: route.remaining_capacity_l,
        stop_count: routeStops.length,
        completed_stop_count: routeStops.filter((stop) => stop.status !== 'PENDING').length,
        stops: routeStops,
      };
    });
  }

  private async findHistoryByMerchant(
    merchantIds: string[],
  ): Promise<Map<string, Array<{ actual_liters: number; collected_at: Date }>>> {
    const rows = await this.prisma.findRecentCollectionHistoryByMerchantIds(merchantIds);
    const byMerchant = new Map<string, Array<{ actual_liters: number; collected_at: Date }>>();
    for (const row of rows) {
      const history = byMerchant.get(row.merchantId) ?? [];
      history.push({ actual_liters: row.actualLiters, collected_at: row.collectedAt });
      byMerchant.set(row.merchantId, history);
    }
    return byMerchant;
  }
}

function toMapStation(row: StationRow): AdminOperationsMapStation {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    ward_id: row.ward_id,
    lat: row.lat,
    lng: row.lng,
    current_volume_l: row.current_volume_l,
    capacity_l: row.capacity_l,
    fill_pct: row.capacity_l > 0 ? round((row.current_volume_l / row.capacity_l) * 100) : 0,
  };
}

function sumBy<T>(items: T[], pick: (item: T) => number | null): number {
  return items.reduce((total, item) => total + (pick(item) ?? 0), 0);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
