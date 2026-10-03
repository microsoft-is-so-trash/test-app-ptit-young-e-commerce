import assert from 'node:assert/strict';
import test from 'node:test';
import { ContainerState, PaymentStatus, PriceUnit } from '@eco-oil/shared-types';
import type { MerchantContainerSummary } from '@eco-oil/shared-types';
import { buildNotifications } from '../src/lib/notifications';

test('returns an empty list when no sources are provided', () => {
  assert.deepEqual(buildNotifications({}), []);
});

test('surfaces a pending-orders notification when the dashboard has open orders', () => {
  const items = buildNotifications({
    dashboard: { containers: [], pending_orders: 2, liters_this_month: 0, last_collected_at: null },
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].id, 'pending-orders');
  assert.match(items[0].description, /2 đơn/);
});

test('surfaces both a pending and a paid payment notification, newest first', () => {
  const items = buildNotifications({
    payments: {
      data: [
        {
          id: 'p1',
          merchant_id: 'm1',
          merchant_name: 'Quán A',
          transaction_id: 't1',
          liters: 10,
          kilograms: null,
          unit_price: 6000,
          unit: PriceUnit.PER_LITER,
          amount: 60000,
          period: '2026-W10',
          status: PaymentStatus.PENDING,
          paid_at: null,
          created_at: '2026-03-05T00:00:00.000Z',
          collected_at: '2026-03-04T00:00:00.000Z',
        },
        {
          id: 'p2',
          merchant_id: 'm1',
          merchant_name: 'Quán A',
          transaction_id: 't2',
          liters: 20,
          kilograms: null,
          unit_price: 6000,
          unit: PriceUnit.PER_LITER,
          amount: 120000,
          period: '2026-W09',
          status: PaymentStatus.PAID,
          paid_at: '2026-03-10T00:00:00.000Z',
          created_at: '2026-02-26T00:00:00.000Z',
          collected_at: '2026-02-25T00:00:00.000Z',
        },
      ],
      meta: { page: 1, limit: 50, total: 2 },
      totals: { liters: 30, amount: 180000 },
    },
  });

  assert.equal(items.length, 2);
  assert.equal(items[0].id, 'payment-paid-p2');
  assert.equal(items[1].id, 'payment-pending-p1');
});

test('ignores an unavailable oil price without throwing', () => {
  const items = buildNotifications({ oilPrice: null });
  assert.deepEqual(items, []);
});

test('surfaces the current oil price with the correct unit label', () => {
  const items = buildNotifications({
    oilPrice: {
      id: 'price-1',
      unit_price: 6000,
      unit: PriceUnit.PER_LITER,
      effective_from: '2026-03-01T00:00:00.000Z',
      effective_to: null,
      note: null,
      created_at: '2026-03-01T00:00:00.000Z',
    },
  });

  assert.equal(items.length, 1);
  assert.match(items[0].description, /\/lít/);
});

const NOW = new Date('2026-10-03T08:00:00.000Z');
const container = (overrides: Partial<MerchantContainerSummary> = {}): MerchantContainerSummary => ({
  code: 'ECO-0142',
  state: ContainerState.AT_MERCHANT,
  capacity_l: 30,
  estimated_liters: 26,
  ...overrides,
});
const dashboardWith = (containers: MerchantContainerSummary[], pendingOrders = 0) => ({
  dashboard: { containers, pending_orders: pendingOrders, liters_this_month: 0, last_collected_at: null },
});

test('reminds the shop to report when a container at the shop is estimated at least 85% full', () => {
  const items = buildNotifications(dashboardWith([container({ estimated_liters: 25.5 })]), NOW);

  assert.equal(items.length, 1);
  assert.equal(items[0].id, 'container-full-ECO-0142');
  assert.match(items[0].description, /85%/);
  assert.match(items[0].description, /Sẵn sàng thu gom/);
});

test('does not remind below 85%', () => {
  assert.deepEqual(buildNotifications(dashboardWith([container({ estimated_liters: 25 })]), NOW), []);
});

test('does not remind when the container capacity is unknown', () => {
  assert.deepEqual(buildNotifications(dashboardWith([container({ capacity_l: null })]), NOW), []);
});

test('does not remind when the container is not at the shop', () => {
  assert.deepEqual(buildNotifications(dashboardWith([container({ state: ContainerState.IN_TRANSIT })]), NOW), []);
});

test('does not remind when the shop already has an open order', () => {
  const items = buildNotifications(dashboardWith([container()], 1), NOW);

  assert.equal(items.some((item) => item.id.startsWith('container-full')), false);
});
