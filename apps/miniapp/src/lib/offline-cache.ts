import type { ContainerLookupResponse, CurrentRouteResponse, GeoPoint, StationRecommendation } from '@eco-oil/shared-types';
import { ApiError, api } from './api';
import {
  cacheContainer,
  cacheRoute,
  cacheStations,
  getCachedContainer,
  getCachedRoute,
  getCachedStations,
} from './outbox-db';
import { recommendFromCachedStations } from './station-cache';

export interface RouteLoadResult {
  route: CurrentRouteResponse;
  fromCache: boolean;
  cachedAt: string | null;
}

export function canUseOfflineCache(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true;
  return error.status === 0
    || error.status === 408
    || error.status === 429
    || error.status >= 500;
}

export interface StationLoadResult {
  stations: StationRecommendation[];
  fromCache: boolean;
  cachedAt: string | null;
}

/** Lúc Bắt đầu ca: lưu mọi trạm đang nhận (chưa biết số lít nên hỏi với 0 lít) để dùng khi mất mạng (I1.3, E5). */
export async function prefetchStations(
  location: GeoPoint,
  ownerId?: string | null,
  fetchStations: (point: GeoPoint) => Promise<StationRecommendation[]> = (point) => api.recommendStations(point, 0),
): Promise<void> {
  try {
    await cacheStations(await fetchStations(location), location, ownerId);
  } catch (error) {
    // Danh sách trạm chỉ là dự phòng khi mất mạng; không được chặn việc bắt đầu ca.
    console.warn('[collector-stations] prefetch failed', error instanceof Error ? error.message : error);
  }
}

/**
 * Gợi ý trạm khi nộp: có mạng thì lấy từ máy chủ và cập nhật bản lưu; mất mạng thì dùng
 * danh sách lưu lúc Bắt đầu ca, khoảng cách đường chim bay tính trên máy.
 */
export async function loadStationsWithCache(
  location: GeoPoint,
  liters: number,
  ownerId?: string | null,
  fetchStations: () => Promise<StationRecommendation[]> = () => api.recommendStations(location, liters),
): Promise<StationLoadResult> {
  try {
    const stations = await fetchStations();
    const cached = await getCachedStations(ownerId);
    const freshIds = new Set(stations.map((station) => station.id));
    const merged = [...stations, ...(cached?.stations ?? []).filter((station) => !freshIds.has(station.id))];
    await cacheStations(merged, location, ownerId);
    return { stations, fromCache: false, cachedAt: null };
  } catch (error) {
    if (!canUseOfflineCache(error)) {
      throw error;
    }
    const cached = await getCachedStations(ownerId);
    if (!cached) {
      throw error;
    }
    return { stations: recommendFromCachedStations(cached.stations, location, liters), fromCache: true, cachedAt: cached.updated_at };
  }
}

function stationPrefetchLocation(route: CurrentRouteResponse, location: GeoPoint | null): GeoPoint | null {
  return location ?? route.stops.find((stop) => stop.ward_center)?.ward_center ?? null;
}

export async function prefetchRouteData(route: CurrentRouteResponse, location: GeoPoint | null, ownerId?: string | null): Promise<void> {
  await cacheRoute(route, location, ownerId);
  const stationLocation = stationPrefetchLocation(route, location);
  if (stationLocation) {
    await prefetchStations(stationLocation, ownerId);
  }
  await Promise.all(route.stops.map(async (stop) => {
    try {
      await cacheContainer(await api.containerByQr(stop.container_code));
    } catch {
      // A route remains useful offline even when one optional container prefetch fails.
    }
  }));
}

export async function loadRouteWithCache(location?: GeoPoint, ownerId?: string | null): Promise<RouteLoadResult> {
  try {
    const route = await api.currentRoute(location);
    await cacheRoute(route, location ?? null, ownerId);
    void Promise.all(route.stops.map(async (stop) => {
      try {
        await cacheContainer(await api.containerByQr(stop.container_code));
      } catch {
        // Container details are optional for displaying the recovered route.
      }
    }));
    console.info('[collector-route]', {
      collector_id: ownerId ?? null,
      route_id: route.route_id,
      route_status: route.route_status,
      order_statuses: route.stops.map((stop) => ({
        order_id: stop.order_id,
        status: stop.route_stop_status ?? 'READY',
      })),
      source: 'server',
    });
    return { route, fromCache: false, cachedAt: null };
  } catch (error) {
    if (!canUseOfflineCache(error)) {
      throw error;
    }
    const cached = await getCachedRoute(ownerId);
    if (!cached) {
      throw error;
    }
    console.info('[collector-route]', {
      collector_id: ownerId ?? null,
      route_id: cached.payload.route_id,
      route_status: cached.payload.route_status,
      order_statuses: cached.payload.stops.map((stop) => ({
        order_id: stop.order_id,
        status: stop.route_stop_status ?? 'READY',
      })),
      source: 'cache',
    });
    return { route: cached.payload, fromCache: true, cachedAt: cached.updated_at };
  }
}

export async function lookupContainerWithCache(code: string): Promise<{ container: ContainerLookupResponse; fromCache: boolean; cachedAt: string | null }> {
  try {
    const container = await api.containerByQr(code);
    await cacheContainer(container);
    return { container, fromCache: false, cachedAt: null };
  } catch (error) {
    if (!canUseOfflineCache(error)) {
      throw error;
    }
    const cached = await getCachedContainer(code);
    if (!cached) {
      throw error;
    }
    return { container: cached.payload, fromCache: true, cachedAt: cached.updated_at };
  }
}
