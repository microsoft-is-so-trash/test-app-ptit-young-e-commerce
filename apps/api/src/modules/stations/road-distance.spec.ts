import type { ConfigService } from '@nestjs/config';
import type { RedisService } from '../../redis/redis.service';
import {
  buildRouteMatrixRequest,
  mergeRoadDistances,
  monthlyElementsKeys,
  parseRouteMatrixResponse,
  ROUTE_MATRIX_MAX_STATIONS,
  ROUTE_MATRIX_MONTHLY_ELEMENT_LIMIT,
  RoadDistanceService,
  type RouteMatrixHttp,
  type StraightStation,
} from './road-distance';

const origin = { lat: 21.0333, lng: 105.85 };

function station(id: string, distanceM: number): StraightStation {
  return { id, name: `Trạm ${id}`, address: null, lat: 21 + distanceM / 100000, lng: 105.85, capacity_l: 1000, current_volume_l: 0, remaining_capacity_l: 1000, distance_m: distanceM };
}

class FakeRedis {
  readonly values = new Map<string, string>();
  configured = true;
  reserved = 0;
  allowReserve = true;
  isConfigured(): boolean { return this.configured; }
  async getValue(key: string): Promise<string | null> { return this.values.get(key) ?? null; }
  async setExpiring(key: string, value: string): Promise<void> { this.values.set(key, value); }
  async reserveWithinLimit(_keys: ReadonlyArray<string>, amount: number, limit: number): Promise<boolean> {
    if (!this.allowReserve || this.reserved + amount > limit) return false;
    this.reserved += amount;
    return true;
  }
}

function config(key: string | null): ConfigService {
  return { get: (name: string) => (name === 'GOOGLE_MAPS_SERVER_KEY' ? key ?? undefined : undefined) } as unknown as ConfigService;
}

function okResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

function matrixFor(distances: number[]) {
  return distances.map((distanceMeters, destinationIndex) => ({ originIndex: 0, destinationIndex, distanceMeters, duration: '60s', condition: 'ROUTE_EXISTS' }));
}

function service(redis: FakeRedis, fetch: RouteMatrixHttp['fetch'], key: string | null = 'server-key') {
  return new RoadDistanceService(config(key), redis as unknown as RedisService, { fetch, sleep: async () => undefined });
}

describe('road distance helpers (I1.2)', () => {
  it('builds an Essentials request: DRIVE, TRAFFIC_UNAWARE, one origin', () => {
    const body = buildRouteMatrixRequest(origin, [{ lat: 21.03, lng: 105.85 }]);
    expect(body).toEqual({
      origins: [{ waypoint: { location: { latLng: { latitude: 21.0333, longitude: 105.85 } } } }],
      destinations: [{ waypoint: { location: { latLng: { latitude: 21.03, longitude: 105.85 } } } }],
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_UNAWARE',
    });
  });

  it('maps destination indexes to station ids and ignores elements without a route', () => {
    const parsed = parseRouteMatrixResponse(
      [
        { originIndex: 0, destinationIndex: 1, distanceMeters: 900, condition: 'ROUTE_EXISTS' },
        { originIndex: 0, destinationIndex: 0, condition: 'ROUTE_NOT_FOUND' },
        { originIndex: 0, destinationIndex: 2, distanceMeters: -1, condition: 'ROUTE_EXISTS' },
      ],
      ['a', 'b', 'c'],
    );
    expect([...parsed.entries()]).toEqual([['b', 900]]);
  });

  it('returns an empty map for a malformed response', () => {
    expect(parseRouteMatrixResponse({ error: 'x' }, ['a']).size).toBe(0);
  });

  it('re-sorts the nearest candidates by road distance and labels the rest as straight line', () => {
    const rows = [station('a', 100), station('b', 200), station('c', 300)];
    const merged = mergeRoadDistances(rows, new Map([['a', 900], ['b', 400]]), 2);
    expect(merged.map((row) => [row.id, row.distance_m, row.distance_source])).toEqual([
      ['b', 400, 'road'],
      ['a', 900, 'road'],
      ['c', 300, 'straight'],
    ]);
  });

  it('keeps a candidate without a road route on its straight line distance', () => {
    const merged = mergeRoadDistances([station('a', 100), station('b', 200)], new Map([['b', 150]]), 2);
    expect(merged.map((row) => [row.id, row.distance_source])).toEqual([['b', 'road'], ['a', 'straight']]);
  });

  it('counts against both the UTC and the Pacific billing month, so either Google convention stays under the limit', () => {
    // 05:00 UTC ngày 1/11 vẫn là 31/10 ở Los Angeles.
    expect(monthlyElementsKeys(new Date('2026-11-01T05:00:00Z'))).toEqual(['maps:route-matrix:elements:utc:2026-11', 'maps:route-matrix:elements:pt:2026-10']);
  });

  it('counts elements per calendar month under the maps: prefix', () => {
    expect(monthlyElementsKeys(new Date('2026-10-03T12:00:00Z'))).toEqual(['maps:route-matrix:elements:utc:2026-10', 'maps:route-matrix:elements:pt:2026-10']);
  });
});

describe('RoadDistanceService (I1.2)', () => {
  const rows = [station('a', 100), station('b', 200), station('c', 300), station('d', 400), station('e', 500), station('f', 600), station('g', 700)];

  it('does not call Google without a server key and returns straight line distances', async () => {
    const fetch = jest.fn();
    const result = await service(new FakeRedis(), fetch, null).enrich(origin, rows);
    expect(fetch).not.toHaveBeenCalled();
    expect(result.every((row) => row.distance_source === 'straight')).toBe(true);
    expect(result.map((row) => row.id)).toEqual(rows.map((row) => row.id));
  });

  it('does not call Google when Redis is not configured, because the monthly budget cannot be enforced', async () => {
    const redis = new FakeRedis();
    redis.configured = false;
    const fetch = jest.fn();
    const result = await service(redis, fetch).enrich(origin, rows);
    expect(fetch).not.toHaveBeenCalled();
    expect(result.every((row) => row.distance_source === 'straight')).toBe(true);
  });

  it('does not call Google when the monthly element budget would be exceeded', async () => {
    const redis = new FakeRedis();
    redis.reserved = ROUTE_MATRIX_MONTHLY_ELEMENT_LIMIT - 1;
    const fetch = jest.fn();
    const result = await service(redis, fetch).enrich(origin, rows);
    expect(fetch).not.toHaveBeenCalled();
    expect(result.every((row) => row.distance_source === 'straight')).toBe(true);
  });

  it(`sends at most ${ROUTE_MATRIX_MAX_STATIONS} stations with the key and field mask, then caches the result`, async () => {
    const redis = new FakeRedis();
    const fetch = jest.fn().mockResolvedValue(okResponse(matrixFor([500, 400, 300, 200, 100])));
    const svc = service(redis, fetch);
    const first = await svc.enrich(origin, rows);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix');
    expect(init.headers['X-Goog-Api-Key']).toBe('server-key');
    expect(init.headers['X-Goog-FieldMask']).toBe('originIndex,destinationIndex,distanceMeters,condition');
    expect(JSON.parse(init.body).destinations).toHaveLength(ROUTE_MATRIX_MAX_STATIONS);
    expect(redis.reserved).toBe(ROUTE_MATRIX_MAX_STATIONS);
    expect(first.slice(0, 5).map((row) => row.id)).toEqual(['e', 'd', 'c', 'b', 'a']);
    expect(first.slice(5).every((row) => row.distance_source === 'straight')).toBe(true);

    const second = await svc.enrich(origin, rows);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(second.map((row) => row.id)).toEqual(first.map((row) => row.id));
    expect(redis.reserved).toBe(ROUTE_MATRIX_MAX_STATIONS);
  });

  it('retries a 503 at most twice and then uses the road result', async () => {
    const fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) })
      .mockResolvedValueOnce(okResponse(matrixFor([50])));
    const result = await service(new FakeRedis(), fetch).enrich(origin, [station('a', 100)]);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(result[0]).toMatchObject({ id: 'a', distance_m: 50, distance_source: 'road' });
  });

  it('falls back to straight line distances after network errors without throwing', async () => {
    const fetch = jest.fn().mockRejectedValue(new Error('network down'));
    const result = await service(new FakeRedis(), fetch).enrich(origin, rows.slice(0, 2));
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(result.map((row) => [row.id, row.distance_source])).toEqual([['a', 'straight'], ['b', 'straight']]);
  });

  it('does not retry a rejected key (403) and falls back', async () => {
    const fetch = jest.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) });
    const result = await service(new FakeRedis(), fetch).enrich(origin, rows.slice(0, 1));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result[0].distance_source).toBe('straight');
  });

  it('returns an empty list without calling Google when there are no stations', async () => {
    const fetch = jest.fn();
    expect(await service(new FakeRedis(), fetch).enrich(origin, [])).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
});
