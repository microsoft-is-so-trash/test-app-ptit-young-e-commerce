import { OrderStatus } from '@eco-oil/shared-types';

export type MerchantTab = 'today' | 'mine';

export const MERCHANT_TABS: ReadonlyArray<{ key: MerchantTab; icon: string; label: string }> = [
  { key: 'today', icon: 'today', label: 'Hôm nay' },
  { key: 'mine', icon: 'person', label: 'Của tôi' },
];

export type MineSectionKey = 'history' | 'payments' | 'green-journey' | 'profile' | 'containers' | 'referral' | 'settings';

export const MERCHANT_MINE_SECTIONS: ReadonlyArray<{ key: MineSectionKey; icon: string; title: string }> = [
  { key: 'history', icon: 'receipt_long', title: 'Lịch sử thu gom' },
  { key: 'payments', icon: 'account_balance_wallet', title: 'Tiền theo kỳ' },
  { key: 'green-journey', icon: 'eco', title: 'Hành trình xanh' },
  { key: 'profile', icon: 'storefront', title: 'Hồ sơ quán' },
  { key: 'containers', icon: 'propane_tank', title: 'Can chuẩn được cấp' },
  { key: 'referral', icon: 'group_add', title: 'Mời bạn' },
  { key: 'settings', icon: 'tune', title: 'Cài đặt chung' },
];

/** Chỉ một mục mở tại một thời điểm; bấm lại mục đang mở thì đóng. */
export function toggleMineSection<K extends string = MineSectionKey>(current: K | null, key: K): K | null {
  return current === key ? null : key;
}

/**
 * Đơn đang mở (chờ, đã phân công) hiện ở "Hôm nay"; đơn đã huỷ hiện trong "Lịch sử thu gom".
 * Đơn đã thu gom không lấy ở đây vì đã có giao dịch tương ứng trong lịch sử.
 */
export function splitMerchantOrders<T extends { status: OrderStatus }>(orders: ReadonlyArray<T>): { open: T[]; cancelled: T[] } {
  return {
    open: orders.filter((order) => order.status === OrderStatus.READY || order.status === OrderStatus.ASSIGNED),
    cancelled: orders.filter((order) => order.status === OrderStatus.CANCELLED),
  };
}
