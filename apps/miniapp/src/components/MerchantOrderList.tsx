import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { OrderStatus } from '@eco-oil/shared-types';
import type { CollectionOrderResponse } from '@eco-oil/shared-types';
import { ApiError, api } from '../lib/api';
import { formatDate, formatLiters } from '../lib/formatters';
import { Icon } from './Icon';

interface MerchantOrderListProps {
  orders: ReadonlyArray<CollectionOrderResponse>;
}

export function MerchantOrderList({ orders }: MerchantOrderListProps) {
  const queryClient = useQueryClient();
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const cancelOrder = useMutation({
    onMutate: () => setCancelError(null),
    onError: (error) => setCancelError(error instanceof ApiError ? error.message : 'Chưa huỷ được đơn. Kiểm tra kết nối rồi thử lại.'),
    mutationFn: (id: string) => api.cancelOrder(id),
    onSuccess: async () => {
      setCancelId(null);
      await queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['merchant-dashboard'] });
    },
  });

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {orders.map((order) => {
          const canCancel = order.status === OrderStatus.READY;
          const stripeClass = order.status === OrderStatus.ASSIGNED
            ? 'order-card-stripe-assigned'
            : order.status === OrderStatus.READY
              ? 'order-card-stripe-pending'
              : 'order-card-stripe-completed';

          return (
            <article className="order-card" key={order.id}>
              <div className={`order-card-stripe ${stripeClass}`} />
              <div style={{ paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <strong style={{ fontFamily: 'var(--font-label)', fontSize: 14, fontWeight: 700, color: 'var(--on-surface)' }}>
                    {order.container_code ?? 'Chưa gắn can'}
                  </strong>
                  <span className={`badge ${statusBadgeClass(order.status)}`}>
                    {statusLabel(order.status)}
                  </span>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="water_drop" size={14} />
                    {formatLiters(order.expected_liters)}
                  </span>
                  <span style={{ color: 'var(--outline-variant)' }}>·</span>
                  <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="schedule" size={14} />
                    {formatDate(order.requested_at)}
                  </span>
                </div>

                {/* Actions */}
                {canCancel ? (
                  <button
                    className="btn-ghost"
                    style={{ alignSelf: 'flex-start', color: 'var(--error)', fontSize: 12, fontWeight: 700 }}
                    onClick={() => setCancelId(order.id)}
                  >
                    <Icon name="cancel" size={16} />
                    <span style={{ marginLeft: 4 }}>Huỷ đơn</span>
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {/* Cancel Dialog */}
      {cancelId ? (
        <div className="sheet-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
            <h2 id="cancel-title">Huỷ yêu cầu thu gom?</h2>
            <p>Đơn này sẽ chuyển sang trạng thái đã huỷ. Bạn có chắc muốn tiếp tục?</p>
            {cancelError ? <p className="error-text" role="alert">{cancelError}</p> : null}
            <div className="sheet-actions">
              <button className="btn btn-secondary" onClick={() => { setCancelId(null); setCancelError(null); }} disabled={cancelOrder.isPending}>Để lại</button>
              <button className="btn btn-danger" onClick={() => cancelOrder.mutate(cancelId)} disabled={cancelOrder.isPending}>
                {cancelOrder.isPending ? 'Đang huỷ…' : 'Huỷ đơn'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function statusLabel(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.READY:
      return 'Đang chờ';
    case OrderStatus.ASSIGNED:
      return 'Đã phân công';
    case OrderStatus.COLLECTED:
      return 'Đã thu gom';
    case OrderStatus.CANCELLED:
      return 'Đã huỷ';
  }
}

function statusBadgeClass(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.READY:
      return 'badge-warning';
    case OrderStatus.ASSIGNED:
      return 'badge-primary';
    case OrderStatus.COLLECTED:
      return 'badge-success';
    case OrderStatus.CANCELLED:
      return 'badge-error';
  }
}
