import assert from 'node:assert/strict';
import test from 'node:test';
import { ContainerState } from '@eco-oil/shared-types';
import { addReadKeys, parseReadKeys, READ_KEYS_LIMIT, readStorageKey } from '../src/lib/notification-read';
import { buildNotifications } from '../src/lib/notifications';

test('read keys are stored per user', () => {
  assert.equal(readStorageKey('u1'), 'eco_oil.notifications_read.u1');
});

test('parsing tolerates empty or corrupted storage', () => {
  assert.deepEqual(parseReadKeys(null), []);
  assert.deepEqual(parseReadKeys('not json'), []);
  assert.deepEqual(parseReadKeys('{"a":1}'), []);
  assert.deepEqual(parseReadKeys('["a", 3, "b"]'), ['a', 'b']);
});

test('adding read keys keeps them unique and newest last', () => {
  assert.deepEqual(addReadKeys(['a', 'b'], ['b', 'c']), ['a', 'b', 'c']);
});

test('only the most recent read keys are kept', () => {
  const many = Array.from({ length: READ_KEYS_LIMIT }, (_, index) => `k${index}`);
  const result = addReadKeys(many, ['new']);

  assert.equal(result.length, READ_KEYS_LIMIT);
  assert.equal(result.at(-1), 'new');
  assert.equal(result.includes('k0'), false);
});

test('a later event with the same notification id is unread again', () => {
  const first = buildNotifications({ dashboard: { containers: [], pending_orders: 0, liters_this_month: 0, last_collected_at: '2026-10-01T00:00:00.000Z' } });
  const second = buildNotifications({ dashboard: { containers: [], pending_orders: 0, liters_this_month: 0, last_collected_at: '2026-10-02T00:00:00.000Z' } });

  assert.equal(first[0].id, second[0].id);
  assert.notEqual(first[0].readKey, second[0].readKey);
});

test('the container-full reminder keeps the same read key until the next collection', () => {
  const sources = {
    dashboard: {
      containers: [{ code: 'C1', state: ContainerState.AT_MERCHANT, capacity_l: 10, estimated_liters: 9 }],
      pending_orders: 0,
      liters_this_month: 0,
      last_collected_at: '2026-10-01T00:00:00.000Z',
    },
  };
  const morning = buildNotifications(sources, new Date('2026-10-03T01:00:00.000Z'));
  const evening = buildNotifications(sources, new Date('2026-10-03T12:00:00.000Z'));

  assert.equal(morning[0].readKey, evening[0].readKey);
});
