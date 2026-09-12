import assert from 'node:assert/strict';
import test from 'node:test';
import { MassSource, Quality } from '@eco-oil/shared-types';
import type { MerchantTransaction } from '@eco-oil/shared-types';
import { buildMonthlyTrend } from '../src/lib/monthly-trend';

function makeTransaction(collectedAt: string, liters: number): MerchantTransaction {
  return {
    id: `txn-${collectedAt}-${liters}`,
    client_uuid: 'uuid',
    order_id: null,
    container_id: 'container-1',
    container_code: 'ECO-0001',
    merchant_id: 'merchant-1',
    collector_id: 'collector-1',
    collector_name: null,
    actual_liters: liters,
    actual_kg: null,
    mass_source: MassSource.ESTIMATED_FROM_VOLUME,
    density_factor: null,
    grade: null,
    grade_photo_url: null,
    grade_note: null,
    suspected_adulteration: false,
    quality: Quality.PASS,
    geo: null,
    photos: null,
    collected_at: collectedAt,
    created_at: collectedAt,
  };
}

test('produces one zero-filled bucket per month even with no transactions', () => {
  const points = buildMonthlyTrend([], 3, 2.5, new Date('2026-03-15T00:00:00.000Z'));
  assert.equal(points.length, 3);
  assert.deepEqual(points.map((p) => p.monthKey), ['2026-01', '2026-02', '2026-03']);
  assert.ok(points.every((p) => p.liters === 0 && p.co2Kg === 0));
});

test('sums liters per month and converts to CO2 using the given coefficient', () => {
  const transactions = [
    makeTransaction('2026-03-05T00:00:00.000Z', 20),
    makeTransaction('2026-03-20T00:00:00.000Z', 30),
    makeTransaction('2026-02-10T00:00:00.000Z', 50),
  ];
  const points = buildMonthlyTrend(transactions, 2, 2.5, new Date('2026-03-15T00:00:00.000Z'));

  const feb = points.find((p) => p.monthKey === '2026-02');
  const mar = points.find((p) => p.monthKey === '2026-03');
  assert.equal(feb?.liters, 50);
  assert.equal(feb?.co2Kg, 125);
  assert.equal(mar?.liters, 50);
  assert.equal(mar?.co2Kg, 125);
});

test('ignores transactions collected outside the requested month window', () => {
  const transactions = [makeTransaction('2025-01-01T00:00:00.000Z', 999)];
  const points = buildMonthlyTrend(transactions, 2, 2.5, new Date('2026-03-15T00:00:00.000Z'));
  assert.ok(points.every((p) => p.liters === 0));
});
