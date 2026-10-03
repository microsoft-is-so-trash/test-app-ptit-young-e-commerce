import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import test from 'node:test';
import type { StationRecommendation } from '@eco-oil/shared-types';
import { ApiError } from '../src/lib/api';
import { cacheStations, EcoOilDatabase, getCachedStations } from '../src/lib/outbox-db';
import { loadStationsWithCache, prefetchStations } from '../src/lib/offline-cache';
import { recommendFromCachedStations, stationDistanceLabel, straightLineMeters } from '../src/lib/station-cache';

function station(id: string, lat: number, lng: number, remaining: number): StationRecommendation {
  return {
    id,
    name: `Trạm ${id}`,
    address: null,
    lat,
    lng,
    capacity_l: 1000,
    current_volume_l: 1000 - remaining,
    remaining_capacity_l: remaining,
    distance_m: 0,
  };
}

const here = { lat: 21.0285, lng: 105.8542 };
const near = station('near', 21.0385, 105.8542, 500);
const far = station('far', 21.1285, 105.8542, 500);
const full = station('full', 21.0295, 105.8542, 10);

test('straight line distance is about 1.11 km per 0.01 degree of latitude', () => {
  const meters = straightLineMeters(here, { lat: 21.0385, lng: 105.8542 });
  assert.ok(Math.abs(meters - 1112) < 5, `got ${meters}`);
  assert.equal(straightLineMeters(here, here), 0);
});

test('cached stations are re-ranked by straight line distance from the current position', () => {
  const result = recommendFromCachedStations([far, near], here, 20);
  assert.deepEqual(result.map((item) => item.id), ['near', 'far']);
  assert.ok(Math.abs(result[0].distance_m - 1112) < 5);
});

test('cached stations are labelled as straight line distances', () => {
  const result = recommendFromCachedStations([{ ...near, distance_source: 'road' }], here, 20);
  assert.equal(result[0].distance_source, 'straight');
});

test('station distance label tells road distance from straight line distance', () => {
  assert.equal(stationDistanceLabel({ distance_m: 850, distance_source: 'road' }), '850 m · đường ô tô');
  assert.equal(stationDistanceLabel({ distance_m: 5400, distance_source: 'straight' }), '5.4 km · đường chim bay');
  assert.equal(stationDistanceLabel({ distance_m: 5400 }), '5.4 km');
});

test('cached stations without enough remaining capacity are left out, like the server filter', () => {
  const result = recommendFromCachedStations([full, near], here, 20);
  assert.deepEqual(result.map((item) => item.id), ['near']);
});

test('cached stations with invalid coordinates are left out', () => {
  const broken = { ...near, id: 'broken', lat: Number.NaN };
  assert.deepEqual(recommendFromCachedStations([broken, far], here, 20).map((item) => item.id), ['far']);
});

test('shift start stores the station list for this collector only', async () => {
  await prefetchStations(here, 'collector-a', async () => [near, far]);
  const cached = await getCachedStations('collector-a');
  assert.deepEqual(cached?.stations.map((item) => item.id), ['near', 'far']);
  assert.equal(await getCachedStations('collector-b'), undefined);
});

test('shift start keeps going when the station list cannot be fetched', async () => {
  await assert.doesNotReject(prefetchStations(here, 'collector-c', async () => { throw new ApiError(0, { code: 'NETWORK', message: 'offline', details: null }); }));
  assert.equal(await getCachedStations('collector-c'), undefined);
});

test('online station search returns server results and refreshes the stored list', async () => {
  const result = await loadStationsWithCache(here, 20, 'collector-d', async () => [far]);
  assert.equal(result.fromCache, false);
  assert.deepEqual(result.stations.map((item) => item.id), ['far']);
  assert.deepEqual((await getCachedStations('collector-d'))?.stations.map((item) => item.id), ['far']);
});

test('offline station search falls back to the stored list with straight line distances', async () => {
  await cacheStations([far, near, full], here, 'collector-e');
  const result = await loadStationsWithCache(here, 20, 'collector-e', async () => { throw new ApiError(0, { code: 'NETWORK', message: 'offline', details: null }); });
  assert.equal(result.fromCache, true);
  assert.ok(result.cachedAt);
  assert.deepEqual(result.stations.map((item) => item.id), ['near', 'far']);
});

test('offline station search without a stored list reports the original error', async () => {
  await assert.rejects(
    loadStationsWithCache(here, 20, 'collector-f', async () => { throw new ApiError(503, { code: 'UNAVAILABLE', message: 'down', details: null }); }),
    (error: unknown) => error instanceof ApiError && error.status === 503,
  );
});

test('a rejected request (4xx) is not hidden behind the stored list', async () => {
  await cacheStations([near], here, 'collector-g');
  await assert.rejects(
    loadStationsWithCache(here, 20, 'collector-g', async () => { throw new ApiError(400, { code: 'VALIDATION_ERROR', message: 'bad', details: null }); }),
    (error: unknown) => error instanceof ApiError && error.status === 400,
  );
});

test('the database upgrade keeps existing tables and adds the station cache', async () => {
  const db = new EcoOilDatabase();
  await db.open();
  assert.ok(db.tables.some((table) => table.name === 'stationCache'));
  assert.ok(db.tables.some((table) => table.name === 'outbox'));
  assert.ok(db.tables.some((table) => table.name === 'stationReceipts'));
  db.close();
});
