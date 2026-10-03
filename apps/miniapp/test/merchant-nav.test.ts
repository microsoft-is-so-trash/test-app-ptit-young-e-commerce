import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderStatus } from '@eco-oil/shared-types';
import { MERCHANT_MINE_SECTIONS, MERCHANT_TABS, splitMerchantOrders, toggleMineSection } from '../src/lib/merchant-nav';

test('merchant has exactly two labelled tabs: Hôm nay and Của tôi', () => {
  assert.deepEqual(MERCHANT_TABS.map((tab) => tab.label), ['Hôm nay', 'Của tôi']);
});

test('Của tôi lists every former tab and account block in the agreed order', () => {
  assert.deepEqual(MERCHANT_MINE_SECTIONS.map((section) => section.title), [
    'Lịch sử thu gom',
    'Tiền theo kỳ',
    'Hành trình xanh',
    'Hồ sơ quán',
    'Can chuẩn được cấp',
    'Mời bạn',
    'Cài đặt chung',
  ]);
});

test('opening a section closes the one that was open', () => {
  assert.equal(toggleMineSection(null, 'history'), 'history');
  assert.equal(toggleMineSection('history', 'payments'), 'payments');
});

test('tapping the open section closes it', () => {
  assert.equal(toggleMineSection('payments', 'payments'), null);
});

const order = (id: string, status: OrderStatus) => ({ id, status });

test('open orders are the ready and assigned ones; cancelled go to history; collected are left to transactions', () => {
  const result = splitMerchantOrders([
    order('a', OrderStatus.READY),
    order('b', OrderStatus.ASSIGNED),
    order('c', OrderStatus.COLLECTED),
    order('d', OrderStatus.CANCELLED),
  ]);

  assert.deepEqual(result.open.map((item) => item.id), ['a', 'b']);
  assert.deepEqual(result.cancelled.map((item) => item.id), ['d']);
});
