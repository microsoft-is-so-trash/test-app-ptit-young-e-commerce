import { PaymentStatus, PriceUnit } from '@eco-oil/shared-types';
import type { MerchantDashboardResponse, OilPriceRecord, PaymentListResponse } from '@eco-oil/shared-types';
import { formatCurrency, formatDate } from './formatters';

export interface NotificationItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  time: string;
}

export interface NotificationSources {
  dashboard?: MerchantDashboardResponse;
  payments?: PaymentListResponse;
  oilPrice?: OilPriceRecord | null;
}

export function buildNotifications(sources: NotificationSources): NotificationItem[] {
  const items: NotificationItem[] = [];

  if (sources.dashboard) {
    if (sources.dashboard.pending_orders > 0) {
      items.push({
        id: 'pending-orders',
        icon: 'local_shipping',
        title: 'Đơn đang chờ thu gom',
        description: `Bạn có ${sources.dashboard.pending_orders} đơn đang chờ người thu gom xử lý.`,
        time: sources.dashboard.last_collected_at ?? new Date().toISOString(),
      });
    }
    if (sources.dashboard.last_collected_at) {
      items.push({
        id: 'last-collected',
        icon: 'check_circle',
        title: 'Đã thu gom thành công',
        description: `Lần thu gom gần nhất: ${formatDate(sources.dashboard.last_collected_at)}.`,
        time: sources.dashboard.last_collected_at,
      });
    }
  }

  if (sources.payments) {
    const pendingPayment = sources.payments.data.find((payment) => payment.status === PaymentStatus.PENDING);
    if (pendingPayment) {
      items.push({
        id: `payment-pending-${pendingPayment.id}`,
        icon: 'hourglass_top',
        title: 'Kỳ thanh toán đang xử lý',
        description: `Kỳ ${pendingPayment.period}: ${formatCurrency(pendingPayment.amount)} đang chờ chốt.`,
        time: pendingPayment.created_at,
      });
    }
    const recentPaid = sources.payments.data.find((payment) => payment.status === PaymentStatus.PAID && payment.paid_at);
    if (recentPaid?.paid_at) {
      items.push({
        id: `payment-paid-${recentPaid.id}`,
        icon: 'payments',
        title: 'Đã nhận thanh toán',
        description: `Kỳ ${recentPaid.period}: ${formatCurrency(recentPaid.amount)} đã được chuyển khoản.`,
        time: recentPaid.paid_at,
      });
    }
  }

  if (sources.oilPrice) {
    items.push({
      id: `oil-price-${sources.oilPrice.id}`,
      icon: 'price_check',
      title: 'Giá dầu cập nhật',
      description: `Giá thu mua hiện tại: ${formatCurrency(sources.oilPrice.unit_price)}/${sources.oilPrice.unit === PriceUnit.PER_KG ? 'kg' : 'lít'}.`,
      time: sources.oilPrice.effective_from,
    });
  }

  return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}
