import { createHash } from 'node:crypto';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';

/**
 * Gợi ý trạm theo quãng đường (I1.2). Dùng Routes API Compute Route Matrix gói Essentials
 * (DRIVE + TRAFFIC_UNAWARE, 10.000 phần tử miễn phí/tháng) thay cho TWO_WHEELER (gói Enterprise
 * có phí) — quyết định Q26. Mọi lỗi đều quay về khoảng cách đường chim bay (ST_Distance), không
 * làm hỏng việc nộp trạm (E3, E4).
 */
export const ROUTE_MATRIX_URL = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';
export const ROUTE_MATRIX_FIELD_MASK = 'originIndex,destinationIndex,distanceMeters,condition';
/** Số trạm gần nhất (theo đường chim bay) đưa vào ma trận mỗi lần (Q26). */
export const ROUTE_MATRIX_MAX_STATIONS = 5;
/** Tự dừng gọi Google khi số phần tử trong tháng chạm mức này (mức miễn phí là 10.000) — Q26. */
export const ROUTE_MATRIX_MONTHLY_ELEMENT_LIMIT = 8000;
export const ROUTE_MATRIX_TIMEOUT_MS = 3000;
export const ROUTE_MATRIX_MAX_RETRIES = 2;
export const ROUTE_MATRIX_CACHE_TTL_SECONDS = 600;
/** Bộ đếm giữ hơn một tháng để không mất số liệu cuối tháng. */
const MONTHLY_COUNTER_TTL_SECONDS = 40 * 24 * 60 * 60;
const RETRY_BASE_DELAY_MS = 200;

export type DistanceSource = 'road' | 'straight';

export interface GeoPointInput {
  lat: number;
  lng: number;
}

export interface StraightStation {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  capacity_l: number;
  current_volume_l: number;
  remaining_capacity_l: number;
  distance_m: number;
}

export type RankedStation = StraightStation & { distance_source: DistanceSource };

interface HttpResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export interface RouteMatrixHttp {
  fetch(url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }): Promise<HttpResponseLike>;
  sleep(ms: number): Promise<void>;
}

export const ROUTE_MATRIX_HTTP = Symbol('ROUTE_MATRIX_HTTP');

const defaultHttp: RouteMatrixHttp = {
  fetch: (url, init) => fetch(url, init),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

function waypoint(point: GeoPointInput) {
  return { waypoint: { location: { latLng: { latitude: point.lat, longitude: point.lng } } } };
}

export function buildRouteMatrixRequest(origin: GeoPointInput, destinations: ReadonlyArray<GeoPointInput>) {
  return {
    origins: [waypoint(origin)],
    destinations: destinations.map(waypoint),
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_UNAWARE',
  };
}

/** Trả về khoảng cách đường đi (mét) theo id trạm; phần tử không có tuyến thì bỏ qua. */
export function parseRouteMatrixResponse(body: unknown, stationIds: ReadonlyArray<string>): Map<string, number> {
  const distances = new Map<string, number>();
  if (!Array.isArray(body)) return distances;
  for (const element of body as Array<Record<string, unknown>>) {
    const index = element.destinationIndex;
    const meters = element.distanceMeters;
    const routeExists = element.condition === undefined || element.condition === 'ROUTE_EXISTS';
    if (typeof index !== 'number' || typeof meters !== 'number' || !routeExists) continue;
    const stationId = stationIds[index];
    if (stationId && Number.isFinite(meters) && meters >= 0) distances.set(stationId, meters);
  }
  return distances;
}

/**
 * Các trạm gần nhất có quãng đường thì xếp lại theo quãng đường và ghi nguồn "road"; các trạm
 * còn lại giữ khoảng cách đường chim bay ("straight") và đứng sau.
 */
export function mergeRoadDistances(
  rows: ReadonlyArray<StraightStation>,
  roadDistances: ReadonlyMap<string, number>,
  candidateCount: number,
): RankedStation[] {
  const candidates = rows.slice(0, candidateCount);
  const rest = rows.slice(candidateCount).map((row) => ({ ...row, distance_source: 'straight' as const }));
  const withRoad = candidates
    .filter((row) => roadDistances.has(row.id))
    .map((row) => ({ ...row, distance_m: roadDistances.get(row.id) as number, distance_source: 'road' as const }))
    .sort((a, b) => a.distance_m - b.distance_m || a.id.localeCompare(b.id));
  const withoutRoad = candidates
    .filter((row) => !roadDistances.has(row.id))
    .map((row) => ({ ...row, distance_source: 'straight' as const }));
  return [...withRoad, ...withoutRoad, ...rest];
}

export function monthlyElementsKey(now: Date): string {
  return `maps:route-matrix:elements:${now.toISOString().slice(0, 7)}`;
}

export function routeMatrixCacheKey(origin: GeoPointInput, stationIds: ReadonlyArray<string>): string {
  const digest = createHash('sha256').update([...stationIds].sort().join(',')).digest('hex').slice(0, 16);
  return `maps:route-matrix:cache:${origin.lat.toFixed(3)},${origin.lng.toFixed(3)}:${digest}`;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 503 || status === 502 || status === 504;
}

@Injectable()
export class RoadDistanceService {
  private readonly logger = new Logger(RoadDistanceService.name);
  private readonly http: RouteMatrixHttp;

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Optional() @Inject(ROUTE_MATRIX_HTTP) http?: RouteMatrixHttp,
  ) {
    this.http = http ?? defaultHttp;
  }

  async enrich(origin: GeoPointInput, rows: ReadonlyArray<StraightStation>): Promise<RankedStation[]> {
    const candidates = rows.slice(0, ROUTE_MATRIX_MAX_STATIONS);
    const roadDistances = candidates.length > 0 ? await this.roadDistances(origin, candidates) : new Map<string, number>();
    return mergeRoadDistances(rows, roadDistances, ROUTE_MATRIX_MAX_STATIONS);
  }

  private async roadDistances(origin: GeoPointInput, candidates: ReadonlyArray<StraightStation>): Promise<Map<string, number>> {
    const apiKey = this.config.get<string>('GOOGLE_MAPS_SERVER_KEY')?.trim();
    // Không có Redis thì không đếm được hạn mức tháng, nên không gọi Google để giữ chi phí bằng 0.
    if (!apiKey || !this.redis.isConfigured()) return new Map();
    const stationIds = candidates.map((row) => row.id);
    const cacheKey = routeMatrixCacheKey(origin, stationIds);
    try {
      const cached = await this.redis.getValue(cacheKey);
      if (cached) return new Map(JSON.parse(cached) as Array<[string, number]>);
      const reserved = await this.redis.reserveWithinLimit(
        monthlyElementsKey(new Date()),
        stationIds.length,
        ROUTE_MATRIX_MONTHLY_ELEMENT_LIMIT,
        MONTHLY_COUNTER_TTL_SECONDS,
      );
      if (!reserved) {
        this.logger.warn('Route matrix monthly element budget reached; using straight line distances');
        return new Map();
      }
      const body = await this.requestMatrix(apiKey, origin, candidates);
      if (!body) return new Map();
      const distances = parseRouteMatrixResponse(body, stationIds);
      await this.redis.setExpiring(cacheKey, JSON.stringify([...distances.entries()]), ROUTE_MATRIX_CACHE_TTL_SECONDS);
      return distances;
    } catch (error) {
      this.logger.warn(`Route matrix unavailable; using straight line distances: ${error instanceof Error ? error.message : String(error)}`);
      return new Map();
    }
  }

  private async requestMatrix(apiKey: string, origin: GeoPointInput, candidates: ReadonlyArray<StraightStation>): Promise<unknown | null> {
    const body = JSON.stringify(buildRouteMatrixRequest(origin, candidates));
    for (let attempt = 0; attempt <= ROUTE_MATRIX_MAX_RETRIES; attempt += 1) {
      if (attempt > 0) await this.http.sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1) + Math.floor(Math.random() * RETRY_BASE_DELAY_MS));
      try {
        const response = await this.http.fetch(ROUTE_MATRIX_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': ROUTE_MATRIX_FIELD_MASK },
          body,
          signal: AbortSignal.timeout(ROUTE_MATRIX_TIMEOUT_MS),
        });
        if (response.ok) return await response.json();
        if (!isRetryableStatus(response.status)) {
          this.logger.warn(`Route matrix rejected with status ${response.status}`);
          return null;
        }
      } catch (error) {
        if (attempt === ROUTE_MATRIX_MAX_RETRIES) {
          this.logger.warn(`Route matrix request failed: ${error instanceof Error ? error.message : String(error)}`);
          return null;
        }
      }
    }
    return null;
  }
}
