import {
  ContainerState,
  MassSource,
  OrderSource,
  OrderStatus,
  PaymentStatus,
  PriceUnit,
  Quality,
  type AuthUser,
  type CollectionOrderResponse,
  type MerchantDashboardResponse,
  type MerchantGreenJourneyResponse,
  type MerchantTransaction,
  type OilPriceRecord,
  type PagedResponse,
  type PaymentListResponse,
} from '@eco-oil/shared-types';
import { currentVietnamWeek } from './formatters';
import { DEMO_ACCOUNTS, isDemoOfflineMode } from './demo-accounts';

export { isDemoOfflineMode };

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function isoMonthsAgo(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString();
}

function isoMonthsAgoOnDay(months: number, day: number): string {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - months);
  date.setDate(Math.min(day, 28));
  return date.toISOString();
}

/** Quán mẫu đã được duyệt; toàn bộ dữ liệu Merchant bên dưới thuộc về tài khoản này. */
export const DEMO_MERCHANT_USER: AuthUser = DEMO_ACCOUNTS[0].user;

export const DEMO_DASHBOARD: MerchantDashboardResponse = {
  containers: [
    { code: 'ECO-0142', state: ContainerState.AT_MERCHANT, capacity_l: 30, estimated_liters: 21 },
  ],
  pending_orders: 0,
  liters_this_month: 400,
  last_collected_at: isoDaysAgo(3),
};

export const DEMO_GREEN_JOURNEY: MerchantGreenJourneyResponse = {
  joined_at: isoMonthsAgo(8),
  total_liters: 1250,
  total_collections: 35,
  liters_this_month: 400,
  rank: 15,
  total_merchants: 300,
  rank_change: 5,
};

export const DEMO_OIL_PRICE: OilPriceRecord = {
  id: 'demo-price-001',
  unit_price: 6000,
  unit: PriceUnit.PER_LITER,
  effective_from: isoDaysAgo(2),
  effective_to: null,
  note: 'Giá tham khảo khu vực Hà Nội',
  created_at: isoDaysAgo(2),
};

const RECENT_TRANSACTIONS: Array<{ daysAgo: number; liters: number }> = [
  { daysAgo: 1, liters: 34 },
  { daysAgo: 2, liters: 31 },
  { daysAgo: 3, liters: 28 },
  { daysAgo: 4, liters: 25 },
];

const OLDER_TRANSACTIONS: Array<{ monthsAgo: number; day: number; liters: number }> = [
  { monthsAgo: 1, day: 24, liters: 120 },
  { monthsAgo: 1, day: 9, liters: 95 },
  { monthsAgo: 2, day: 22, liters: 110 },
  { monthsAgo: 2, day: 8, liters: 90 },
  { monthsAgo: 3, day: 20, liters: 105 },
  { monthsAgo: 3, day: 7, liters: 85 },
  { monthsAgo: 4, day: 18, liters: 100 },
  { monthsAgo: 4, day: 6, liters: 80 },
  { monthsAgo: 5, day: 16, liters: 95 },
  { monthsAgo: 5, day: 5, liters: 75 },
];

function buildDemoTransaction(id: string, liters: number, collectedAt: string): MerchantTransaction {
  return {
    id,
    client_uuid: `${id}-uuid`,
    order_id: `${id}-order`,
    container_id: 'demo-container-001',
    container_code: 'ECO-0142',
    merchant_id: DEMO_MERCHANT_USER.id,
    collector_id: 'demo-collector-001',
    collector_name: 'Nguyễn Văn Thu',
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

export const DEMO_TRANSACTIONS: MerchantTransaction[] = [
  ...RECENT_TRANSACTIONS.map((entry, index) =>
    buildDemoTransaction(`demo-txn-recent-${index + 1}`, entry.liters, isoDaysAgo(entry.daysAgo)),
  ),
  ...OLDER_TRANSACTIONS.map((entry, index) =>
    buildDemoTransaction(`demo-txn-older-${index + 1}`, entry.liters, isoMonthsAgoOnDay(entry.monthsAgo, entry.day)),
  ),
];

export const DEMO_PAYMENTS: PaymentListResponse = {
  data: DEMO_TRANSACTIONS.map((txn, index) => ({
    id: `demo-payment-${index + 1}`,
    merchant_id: DEMO_MERCHANT_USER.id,
    merchant_name: DEMO_MERCHANT_USER.name ?? 'Quán demo',
    transaction_id: txn.id,
    liters: txn.actual_liters,
    kilograms: null,
    unit_price: DEMO_OIL_PRICE.unit_price,
    unit: DEMO_OIL_PRICE.unit,
    amount: txn.actual_liters * DEMO_OIL_PRICE.unit_price,
    period: currentVietnamWeek(new Date(txn.collected_at)).period,
    status: index === 0 ? PaymentStatus.PENDING : PaymentStatus.PAID,
    paid_at: index === 0 ? null : txn.collected_at,
    created_at: txn.created_at,
    collected_at: txn.collected_at,
  })),
  meta: { page: 1, limit: 50, total: DEMO_TRANSACTIONS.length },
  totals: {
    liters: DEMO_TRANSACTIONS.reduce((sum, txn) => sum + txn.actual_liters, 0),
    amount: DEMO_TRANSACTIONS.reduce((sum, txn) => sum + txn.actual_liters * DEMO_OIL_PRICE.unit_price, 0),
  },
};

export const DEMO_REFERRAL_STATS = {
  invitedCount: 3,
  redeemedCount: 2,
};

export const DEMO_ORDERS: PagedResponse<CollectionOrderResponse> = {
  data: [
    {
      id: 'demo-order-ready-1',
      merchant_id: DEMO_MERCHANT_USER.id,
      container_id: 'demo-container-001',
      container_code: 'ECO-0142',
      expected_liters: 20,
      collector_available: true,
      priority: 1,
      status: OrderStatus.COLLECTED,
      source: OrderSource.MANUAL,
      note: null,
      requested_at: isoDaysAgo(3),
      cancelled_at: null,
      container_state: ContainerState.AT_MERCHANT,
      capacity_l: 30,
    },
  ],
  meta: { page: 1, limit: 50, total: 1 },
};

export function demoReadyOrder(expectedLiters?: number): CollectionOrderResponse {
  return {
    id: `demo-order-${Date.now()}`,
    merchant_id: DEMO_MERCHANT_USER.id,
    container_id: 'demo-container-001',
    container_code: 'ECO-0142',
    expected_liters: expectedLiters ?? null,
    collector_available: true,
    priority: 1,
    status: OrderStatus.READY,
    source: OrderSource.MANUAL,
    note: null,
    requested_at: new Date().toISOString(),
    cancelled_at: null,
    container_state: ContainerState.AT_MERCHANT,
    capacity_l: 30,
  };
}
