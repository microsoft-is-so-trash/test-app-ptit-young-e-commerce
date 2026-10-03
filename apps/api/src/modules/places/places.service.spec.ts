import type { ConfigService } from '@nestjs/config';
import type { RedisService } from '../../redis/redis.service';
import type { GoogleHttp } from '../google/google-http';
import {
  PLACE_DETAILS_FIELD_MASK,
  PLACES_AUTOCOMPLETE_URL,
  PLACES_MONTHLY_REQUEST_LIMIT,
  PlacesService,
  placesBudgetKey,
} from './places.service';

class FakeRedis {
  configured = true;
  readonly counters = new Map<string, number>();
  isConfigured(): boolean { return this.configured; }
  async reserveWithinLimit(key: string, amount: number, limit: number): Promise<boolean> {
    const next = (this.counters.get(key) ?? 0) + amount;
    if (next > limit) return false;
    this.counters.set(key, next);
    return true;
  }
}

function config(key: string | null): ConfigService {
  return { get: (name: string) => (name === 'GOOGLE_MAPS_SERVER_KEY' ? key ?? undefined : undefined) } as unknown as ConfigService;
}

function service(redis: FakeRedis, fetch: GoogleHttp['fetch'], key: string | null = 'server-key') {
  return new PlacesService(config(key), redis as unknown as RedisService, { fetch, sleep: async () => undefined });
}

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const session = '3f1c2a9e-0d7b-4c55-9a8e-2f6b1d0c7e11';

describe('PlacesService (I1.1)', () => {
  it('does not call Google without a server key', async () => {
    const fetch = jest.fn();
    await expect(service(new FakeRedis(), fetch, null).autocomplete('22 Hàng Bạc', session)).rejects.toMatchObject({ response: { code: 'PLACES_UNAVAILABLE' } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not call Google without Redis, because the monthly budget cannot be enforced', async () => {
    const redis = new FakeRedis();
    redis.configured = false;
    const fetch = jest.fn();
    await expect(service(redis, fetch).autocomplete('22 Hàng Bạc', session)).rejects.toMatchObject({ response: { code: 'PLACES_UNAVAILABLE' } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('stops calling Google when the monthly autocomplete budget is used up', async () => {
    const redis = new FakeRedis();
    redis.counters.set(placesBudgetKey('autocomplete', new Date()), PLACES_MONTHLY_REQUEST_LIMIT);
    const fetch = jest.fn();
    await expect(service(redis, fetch).autocomplete('22 Hàng Bạc', session)).rejects.toMatchObject({ response: { code: 'PLACES_UNAVAILABLE' } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends a Vietnam-only autocomplete request with the session token and maps predictions', async () => {
    const redis = new FakeRedis();
    const fetch = jest.fn().mockResolvedValue(ok({
      suggestions: [
        { placePrediction: { placeId: 'place-1', text: { text: '22 Hàng Bạc, Hoàn Kiếm, Hà Nội' }, structuredFormat: { mainText: { text: '22 Hàng Bạc' }, secondaryText: { text: 'Hoàn Kiếm, Hà Nội' } } } },
        { queryPrediction: { text: { text: 'Hàng Bạc' } } },
      ],
    }));
    const result = await service(redis, fetch).autocomplete('22 Hàng Bạc', session);
    expect(result).toEqual([{ place_id: 'place-1', text: '22 Hàng Bạc, Hoàn Kiếm, Hà Nội', main_text: '22 Hàng Bạc', secondary_text: 'Hoàn Kiếm, Hà Nội' }]);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(PLACES_AUTOCOMPLETE_URL);
    expect(init.method).toBe('POST');
    expect(init.headers['X-Goog-Api-Key']).toBe('server-key');
    expect(JSON.parse(init.body)).toEqual({ input: '22 Hàng Bạc', sessionToken: session, languageCode: 'vi', includedRegionCodes: ['vn'] });
    expect(redis.counters.get(placesBudgetKey('autocomplete', new Date()))).toBe(1);
  });

  it('reports PLACES_UNAVAILABLE when Google rejects the request', async () => {
    const fetch = jest.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) });
    await expect(service(new FakeRedis(), fetch).autocomplete('22 Hàng Bạc', session)).rejects.toMatchObject({ response: { code: 'PLACES_UNAVAILABLE' } });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('fetches only Essentials fields for place details and ends the session with the same token', async () => {
    const redis = new FakeRedis();
    const fetch = jest.fn().mockResolvedValue(ok({ id: 'place-1', formattedAddress: '22 Hàng Bạc, Hoàn Kiếm, Hà Nội, Việt Nam', location: { latitude: 21.0341, longitude: 105.8522 } }));
    const result = await service(redis, fetch).details('place-1', session);
    expect(result).toEqual({ place_id: 'place-1', address: '22 Hàng Bạc, Hoàn Kiếm, Hà Nội, Việt Nam', lat: 21.0341, lng: 105.8522 });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`https://places.googleapis.com/v1/places/place-1?sessionToken=${session}&languageCode=vi`);
    expect(init.method).toBe('GET');
    expect(init.headers['X-Goog-FieldMask']).toBe(PLACE_DETAILS_FIELD_MASK);
    expect(PLACE_DETAILS_FIELD_MASK).toBe('id,formattedAddress,location');
    expect(redis.counters.get(placesBudgetKey('details', new Date()))).toBe(1);
  });

  it('reports PLACES_UNAVAILABLE when the place has no coordinates', async () => {
    const fetch = jest.fn().mockResolvedValue(ok({ id: 'place-1', formattedAddress: 'Hà Nội' }));
    await expect(service(new FakeRedis(), fetch).details('place-1', session)).rejects.toMatchObject({ response: { code: 'PLACES_UNAVAILABLE' } });
  });

  it('keeps separate monthly counters per SKU under the maps: prefix', () => {
    const now = new Date('2026-10-03T00:00:00Z');
    expect(placesBudgetKey('autocomplete', now)).toBe('maps:places:autocomplete:2026-10');
    expect(placesBudgetKey('details', now)).toBe('maps:places:details:2026-10');
  });
});
