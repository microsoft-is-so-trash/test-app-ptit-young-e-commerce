import assert from 'node:assert/strict';
import test from 'node:test';
import { MassSource, Quality } from '@eco-oil/shared-types';
import type { CollectionTransactionResponse } from '@eco-oil/shared-types';
import { summarizeCollectorStats, vietnamDateKey } from '../src/lib/collector-stats';

function txn(collectedAt: string, liters: number, routeId: string | null = null): CollectionTransactionResponse {
  return {
    id: `t-${collectedAt}-${liters}`,
    client_uuid: 'uuid',
    order_id: 'order',
    container_id: 'container',
    container_code: 'ECO-0001',
    merchant_id: 'merchant',
    collector_id: 'collector',
    actual_liters: liters,
    actual_kg: null,
    mass_source: MassSource.ESTIMATED_FROM_VOLUME,
    density_factor: null,
    grade: null,
    grade_photo_url: null,
    grade_note: null,
    suspected_adulteration: false,
    image_grade_suggestion: null,
    ai_suggested_grade: null,
    collector_selected_grade: null,
    collector_grade_confirmed: false,
    image_grade_confidence: null,
    image_grade_model_version: null,
    image_grade_analysis: null,
    grade_decision_source: null,
    grade_ai_override_acknowledged: false,
    quality: Quality.PASS,
    geo: { lat: 21, lng: 105 },
    photos: [],
    collected_at: collectedAt,
    created_at: collectedAt,
    route_id: routeId,
  };
}

test('trả về số 0 an toàn khi chưa có giao dịch nào', () => {
  const summary = summarizeCollectorStats([], 2.5);
  assert.equal(summary.totalLiters, 0);
  assert.equal(summary.totalPickups, 0);
  assert.equal(summary.workingDays, 0);
  assert.equal(summary.averageLitersPerPickup, 0);
  assert.equal(summary.busiestDay, null);
});

test('cộng dồn lít, đếm lượt thu và quy đổi CO2', () => {
  const summary = summarizeCollectorStats([
    txn('2026-03-10T03:00:00.000Z', 20),
    txn('2026-03-10T08:00:00.000Z', 30),
  ], 2.5);

  assert.equal(summary.totalLiters, 50);
  assert.equal(summary.totalPickups, 2);
  assert.equal(summary.co2Kg, 125);
  assert.equal(summary.averageLitersPerPickup, 25);
});

test('đếm số ca theo mã tuyến, bỏ qua giao dịch không gắn tuyến', () => {
  const summary = summarizeCollectorStats([
    txn('2026-03-10T03:00:00.000Z', 10, 'route-a'),
    txn('2026-03-10T04:00:00.000Z', 10, 'route-a'),
    txn('2026-03-11T03:00:00.000Z', 10, 'route-b'),
    txn('2026-03-12T03:00:00.000Z', 10, null),
  ], 2.5);

  assert.equal(summary.shiftCount, 2);
  assert.equal(summary.totalPickups, 4);
});

test('gom ngày làm việc theo giờ Việt Nam chứ không theo UTC', () => {
  // 23:30 UTC ngày 09/03 là 06:30 ngày 10/03 giờ Việt Nam.
  assert.equal(vietnamDateKey('2026-03-09T23:30:00.000Z'), '2026-03-10');

  const summary = summarizeCollectorStats([
    txn('2026-03-09T23:30:00.000Z', 10),
    txn('2026-03-10T02:00:00.000Z', 10),
  ], 2.5);

  assert.equal(summary.workingDays, 1);
});

test('tìm đúng ngày thu được nhiều nhất', () => {
  const summary = summarizeCollectorStats([
    txn('2026-03-10T03:00:00.000Z', 12),
    txn('2026-03-11T03:00:00.000Z', 40),
    txn('2026-03-12T03:00:00.000Z', 8),
  ], 2.5);

  assert.equal(summary.busiestDay?.date, '2026-03-11');
  assert.equal(summary.busiestDay?.liters, 40);
});
