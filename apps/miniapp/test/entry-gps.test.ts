import assert from 'node:assert/strict';
import test from 'node:test';
import { entryGpsStatus, requestEntryGps } from '../src/lib/entry-gps';

const point = { lat: 21.03, lng: 105.85 };

test('a valid GPS fix is returned without error', async () => {
  assert.deepEqual(await requestEntryGps(async () => point), { point, error: null });
});

test('a missing or invalid fix explains how to fix it', async () => {
  const empty = await requestEntryGps(async () => null);
  const invalid = await requestEntryGps(async () => ({ lat: 999, lng: 0 }));

  assert.equal(empty.point, null);
  assert.match(empty.error ?? '', /GPS/);
  assert.equal(invalid.point, null);
});

test('a thrown location error keeps its message', async () => {
  const result = await requestEntryGps(async () => { throw new Error('Quyền vị trí đã bị từ chối.'); });

  assert.equal(result.error, 'Quyền vị trí đã bị từ chối.');
});

test('the retry button is shown only after GPS failed or fell back to the ward centre', () => {
  assert.equal(entryGpsStatus({ locating: true, hasGeo: false, error: null, usedFallback: false }).showRetry, false);
  assert.equal(entryGpsStatus({ locating: false, hasGeo: true, error: null, usedFallback: false }).showRetry, false);
  assert.equal(entryGpsStatus({ locating: false, hasGeo: false, error: 'x', usedFallback: false }).showRetry, true);
  assert.equal(entryGpsStatus({ locating: false, hasGeo: true, error: null, usedFallback: true }).showRetry, true);
});
