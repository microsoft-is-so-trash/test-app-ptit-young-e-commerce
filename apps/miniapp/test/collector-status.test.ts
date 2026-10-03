import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRouteStatusItems } from '../src/lib/collector-status';
import type { RouteStatusInput } from '../src/lib/collector-status';

const calm: RouteStatusInput = {
  online: true,
  loadError: false,
  refreshNotice: null,
  locating: false,
  locationDenied: false,
  cachedAt: null,
  unsynced: 0,
  syncError: null,
  receiptId: null,
  shiftStarted: false,
  shiftStartedAt: null,
  canCancelShift: false,
};

const keys = (input: Partial<RouteStatusInput>) => buildRouteStatusItems({ ...calm, ...input }).map((item) => item.key);

test('no status when nothing needs attention', () => {
  assert.deepEqual(keys({}), []);
});

test('items follow the agreed priority: errors, offline, queue, GPS, cache, receipt, shift, refresh success', () => {
  assert.deepEqual(
    keys({
      online: false,
      loadError: true,
      unsynced: 2,
      locationDenied: true,
      cachedAt: '2026-10-03T01:00:00.000Z',
      receiptId: 'r1',
      shiftStarted: true,
      refreshNotice: { kind: 'success', message: 'ok' },
    }),
    ['load-error', 'offline', 'queue', 'gps-fallback', 'cache', 'receipt', 'shift-ready', 'refresh-success'],
  );
});

test('a sync error outranks being offline and replaces the plain queue item', () => {
  const result = keys({ online: false, unsynced: 3, syncError: 'HTTP 500' });

  assert.deepEqual(result, ['sync-error', 'offline']);
});

test('GPS shows locating while waiting and the ward-centre fallback once it failed', () => {
  assert.deepEqual(keys({ locating: true }), ['gps-locating']);
  assert.deepEqual(keys({ locationDenied: true }), ['gps-fallback']);
});

test('refresh notices map onto the matching priority group', () => {
  assert.deepEqual(keys({ refreshNotice: { kind: 'error', message: 'x' } }), ['refresh-error']);
  assert.deepEqual(keys({ refreshNotice: { kind: 'warning', message: 'x' } }), ['refresh-warning']);
  assert.deepEqual(keys({ refreshNotice: { kind: 'cache', message: 'x' } }), ['refresh-cache']);
});

test('the queue item keeps its action to open the outbox', () => {
  const [queue] = buildRouteStatusItems({ ...calm, unsynced: 1 });

  assert.equal(queue.action?.id, 'open-outbox');
  assert.match(queue.title, /1 giao dịch chưa đồng bộ/);
});

test('cancel shift is offered only while it is allowed', () => {
  const allowed = buildRouteStatusItems({ ...calm, shiftStarted: true, canCancelShift: true })[0];
  const blocked = buildRouteStatusItems({ ...calm, shiftStarted: true, canCancelShift: false })[0];

  assert.equal(allowed.action?.id, 'cancel-shift');
  assert.equal(allowed.action?.disabled, false);
  assert.equal(blocked.action?.disabled, true);
});
