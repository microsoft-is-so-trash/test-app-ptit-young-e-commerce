import { ContainerState, PaymentStatus, PriceUnit } from '@eco-oil/shared-types';
import type { MerchantDashboardResponse, OilPriceRecord, PaymentListResponse } from '@eco-oil/shared-types';
import { fillPercent, formatCurrency, formatDate } from './formatters';

/** Nhắc báo thu gom khi can ở quán ước tính đầy từ mức này (%). */
export const CONTAINER_FULL_REMINDER_PERCENT = 85;

export interface NotificationItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  time: string;
  /** Khoá lưu trạng thái đã đọc: đổi khi có sự kiện mới cùng loại. */
  readKey: string;
}

export interface NotificationSources {
  dashboard?: MerchantDashboardResponse;
  payments?: PaymentListResponse;
  oilPrice?: OilPriceRecord | null;
}

export function buildNotifications(sources: NotificationSources, now: Date = new Date()): NotificationItem[] {
  const items: Array<Omit<NotificationItem, 'readKey'> & { readKey?: string }> = [];

  if (sources.dashboard) {
    if (sources.dashboard.pending_orders === 0) {
      for (const container of sources.dashboard.containers) {
        if (container.state !== ContainerState.AT_MERCHANT || !container.capacity_l) continue;
        const percent = fillPercent(container.estimated_liters, container.capacity_l);
        if (percent < CONTAINER_FULL_REMINDER_PERCENT) continue;
        items.push({
          id: `container-full-${container.code}`,
          icon: 'propane_tank',
          title: 'Can sắp đầy',
          description: `Can ${container.code} ước tính đầy ${percent}%. Bấm "Sẵn sàng thu gom" ở mục Hôm nay để báo thu gom.`,
          time: now.toISOString(),
          readKey: `container-full-${container.code}@${sources.dashboard.last_collected_at ?? 'never'}`,
        });
      }
    }
    if (sources.dashboard.pending_orders > 0) {
      items.push({
        id: 'pending-orders',
        icon: 'local_shipping',
        title: 'Đơn đang chờ thu gom',
        description: `Bạn có ${sources.dashboard.pending_orders} đơn đang chờ người thu gom xử lý.`,
        time: sources.dashboard.last_collected_at ?? now.toISOString(),
        readKey: `pending-orders-${sources.dashboard.pending_orders}@${sources.dashboard.last_collected_at ?? 'never'}`,
      });
    }
    if (sources.dashboard.last_collected_at) {
      items.push({
        id: 'last-collected',
        icon: 'check_circle',
        title: 'Đã thu gom thành công',
        description: `Lần thu gom gần nhất: ${formatDate(sources.dashboard.last_collected_at)}.`,
        time: sources.dashboard.last_collected_at,
        readKey: `last-collected@${sources.dashboard.last_collected_at}`,
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

  return items
    // Thông báo thanh toán và giá dầu đã có id riêng theo từng bản ghi nên dùng luôn id làm khoá đã đọc.
    .map((item) => ({ ...item, readKey: item.readKey ?? item.id }))
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}
