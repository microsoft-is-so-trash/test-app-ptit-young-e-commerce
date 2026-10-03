import assert from 'node:assert/strict';
import test from 'node:test';
import { estimateReadyLiters, orderLitersField } from '../src/lib/order-liters';

test('estimate is the container estimated liters rounded to one decimal', () => {
  assert.equal(estimateReadyLiters({ estimated_liters: 21.04, capacity_l: 30 }), 21);
  assert.equal(estimateReadyLiters({ estimated_liters: 18.46, capacity_l: 30 }), 18.5);
});

test('estimate never exceeds the container capacity', () => {
  assert.equal(estimateReadyLiters({ estimated_liters: 34.2, capacity_l: 30 }), 30);
});

test('no estimate when the container is empty or missing', () => {
  assert.equal(estimateReadyLiters({ estimated_liters: 0, capacity_l: 30 }), null);
  assert.equal(estimateReadyLiters(undefined), null);
});

test('without a manual entry the field shows the estimate marked as auto-calculated', () => {
  assert.deepEqual(orderLitersField(null, 21), { text: '21', isAuto: true });
});

test('a manual entry is kept as typed and no longer marked auto', () => {
  assert.deepEqual(orderLitersField('19.5', 21), { text: '19.5', isAuto: false });
  assert.deepEqual(orderLitersField('', 21), { text: '', isAuto: false });
});

test('without an estimate the field starts empty', () => {
  assert.deepEqual(orderLitersField(null, null), { text: '', isAuto: false });
});
