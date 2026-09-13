import type { GeoPoint } from '@eco-oil/shared-types';
import { ApiError } from './api';
import { formatTime } from './collector-format';
import type { RouteLoadResult } from './offline-cache';
import { isValidGeoPoint } from './zalo-client';

export interface RouteRefreshNotice {
  kind: 'success' | 'cache' | 'warning' | 'error';
  message: string;
}

export interface RouteRefreshResult {
  data?: RouteLoadResult;
  error?: unknown;
  gpsFallback?: boolean;
  gpsUpdated?: boolean;
}

export function getRouteRefreshNotice(
  result: RouteRefreshResult,
  updatedAt: Date = new Date(),
): RouteRefreshNotice {
  if (result.error || !result.data) {
    return { kind: 'error', message: 'Không thể tải lại tuyến. Vui lòng kiểm tra mạng và thử lại.' };
  }
  if (result.gpsFallback) {
    return { kind: 'warning', message: 'Chưa lấy được GPS, tuyến đang dùng vị trí trung tâm phường.' };
  }
  if (result.data.fromCache) {
    return { kind: 'cache', message: 'Không kết nối được máy chủ, đang dùng tuyến đã lưu.' };
  }
  if (result.gpsUpdated) {
    return { kind: 'success', message: `Đã cập nhật GPS và tuyến lúc ${formatTime(updatedAt.toISOString())}` };
  }
  return { kind: 'success', message: `Đã cập nhật tuyến lúc ${formatTime(updatedAt.toISOString())}` };
}

export interface LocationAttemptResult {
  point: GeoPoint | null;
  failed: boolean;
  error?: unknown;
}

export interface CollectionLocationResult {
  point: GeoPoint | null;
  usedFallback: boolean;
}

export const COLLECTION_LOCATION_TIMEOUT_MS = 12_000;

export async function resolveCollectionLocation(
  getLocation: () => Promise<GeoPoint | null>,
  fallback: GeoPoint | null,
  timeoutMs = COLLECTION_LOCATION_TIMEOUT_MS,
): Promise<CollectionLocationResult> {
  const point = await new Promise<GeoPoint | null>((resolve) => {
    let settled = false;
    const finish = (value: GeoPoint | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value && isValidGeoPoint(value) ? value : null);
    };
    const timer = globalThis.setTimeout(() => finish(null), timeoutMs);
    void getLocation().then(finish, () => finish(null));
  });

  if (point) return { point, usedFallback: false };
  const safeFallback = fallback && isValidGeoPoint(fallback) ? fallback : null;
  return { point: safeFallback, usedFallback: safeFallback !== null };
}

export function createLocationAttemptRunner(
  getLocation: () => Promise<GeoPoint | null>,
  onError: (error: unknown) => void = logLocationFailure,
): () => Promise<LocationAttemptResult> {
  let inFlight: Promise<LocationAttemptResult> | null = null;

  async function attempt(): Promise<LocationAttemptResult> {
    if (inFlight) return inFlight;
    const request = (async () => {
      try {
        const point = await getLocation();
        return { point, failed: point === null };
      } catch (error) {
        onError(error);
        return { point: null, failed: true, error };
      } finally {
        inFlight = null;
      }
    })();
    inFlight = request;
    return request;
  }

  return attempt;
}

function logLocationFailure(error: unknown): void {
  const details: { code?: string; api?: string; message?: string } = { api: 'zalo.location' };
  if (error instanceof ApiError) {
    details.code = error.code;
    details.message = error.message;
  } else if (error instanceof Error) {
    details.message = error.message;
  } else if (typeof error === 'object' && error !== null) {
    const candidate = error as { code?: unknown; api?: unknown; message?: unknown };
    if (typeof candidate.code === 'string') details.code = candidate.code;
    if (typeof candidate.api === 'string') details.api = candidate.api;
    if (typeof candidate.message === 'string') details.message = candidate.message;
  }
  console.warn('[zalo] Không lấy được vị trí', details);
}

export interface LocationAwareRouteRefreshResult extends RouteRefreshResult {
  point: GeoPoint | null;
}

export async function refreshRouteWithLocation(
  getLocation: () => Promise<GeoPoint | null>,
  loadRoute: (location?: GeoPoint) => Promise<RouteLoadResult>,
  fallback: GeoPoint | null,
): Promise<LocationAwareRouteRefreshResult> {
  let point: GeoPoint | null = null;
  let gpsFallback = false;
  try {
    point = await getLocation();
    if (!point) gpsFallback = true;
  } catch {
    gpsFallback = true;
  }
  if (gpsFallback) point = fallback;

  try {
    return { point, gpsFallback, gpsUpdated: !gpsFallback, data: await loadRoute(point ?? undefined) };
  } catch (error) {
    return { point, gpsFallback, gpsUpdated: !gpsFallback, error };
  }
}

interface RouteRefreshState {
  busy: boolean;
  notice: RouteRefreshNotice | null;
}

export function createRouteRefreshRunner(
  refetch: () => Promise<RouteRefreshResult>,
  onStateChange: (state: RouteRefreshState) => void,
): () => Promise<void> {
  let inFlight: Promise<void> | null = null;

  async function refreshRoute(): Promise<void> {
    if (inFlight) return inFlight;
    const request = (async () => {
      onStateChange({ busy: true, notice: null });
      try {
        const result = await refetch();
        onStateChange({ busy: false, notice: getRouteRefreshNotice(result) });
      } catch (error) {
        onStateChange({ busy: false, notice: getRouteRefreshNotice({ error }) });
      } finally {
        inFlight = null;
      }
    })();
    inFlight = request;
    return request;
  }

  return refreshRoute;
}
export async function runCollectorAction(
  action: () => Promise<void>,
  errorMessage: string,
  setBusy: (busy: boolean) => void,
  setError: (error: string | null) => void,
): Promise<boolean> {
  setBusy(true);
  setError(null);
  try {
    await action();
    return true;
  } catch (error) {
    setError(error instanceof Error ? error.message : errorMessage);
    return false;
  } finally {
    setBusy(false);
  }
}

export async function completeCollectorShiftSafely(options: {
  persisted: boolean;
  online: boolean;
  completeRemote: () => Promise<void>;
  clearLocal: () => void;
}): Promise<boolean> {
  if (options.persisted && !options.online) return false;
  if (options.persisted) await options.completeRemote();
  options.clearLocal();
  return true;
}
