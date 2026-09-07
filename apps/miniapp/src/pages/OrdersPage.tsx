import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OrderStatus } from '@eco-oil/shared-types';
import { api } from '../lib/api';
import { formatDate, formatLiters } from '../lib/formatters';
import { StatusView } from '../components/StatusView';
import { useAuthStore } from '../stores/auth-store';
import { Icon } from '../components/Icon';

type Filter = 'all' | 'ready' | 'assigned' | 'collected';

export function OrdersPage() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id ?? 'unknown');
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const orders = useQuery({ queryKey: ['merchant-orders', userId], queryFn: api.orders });
  const cancelOrder = useMutation({
    mutationFn: (id: string) => api.cancelOrder(id),
    onSuccess: async () => {
      setCancelId(null);
      await queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['merchant-dashboard'] });
    },
  });

  if (orders.isPending) {
    return <StatusView title="Đang tải đơn của quán…" />;
  }
  if (orders.isError) {
    return <StatusView title="Chưa tải được đơn" message="Vui lòng kiểm tra kết nối và thử lại." action={{ label: 'Thử lại', onClick: () => { void orders.refetch(); } }} />;
  }

  const list = orders.data.data;

  // Filter counts
  const readyCount = list.filter((o) => o.status === OrderStatus.READY).length;
  const assignedCount = list.filter((o) => o.status === OrderStatus.ASSIGNED).length;
  const collectedCount = list.filter((o) => o.status === OrderStatus.COLLECTED).length;

  const filteredList = filter === 'all' ? list : list.filter((o) => {
    if (filter === 'ready') return o.status === OrderStatus.READY;
    if (filter === 'assigned') return o.status === OrderStatus.ASSIGNED;
    if (filter === 'collected') return o.status === OrderStatus.COLLECTED || o.status === OrderStatus.CANCELLED;
    return true;
  });

  const FILTERS: { key: Filter; label: string; count?: number }[] = [
    { key: 'all', label: 'Tất cả', count: list.length },
    { key: 'ready', label: 'Chờ xử lý', count: readyCount },
    { key: 'assigned', label: 'Đã phân công', count: assignedCount },
    { key: 'collected', label: 'Hoàn tất', count: collectedCount },
  ];

  if (list.length === 0) {
    return (
      <div className="page-content">
        <div className="page-header">
          <span className="section-eyebrow">Quản lý</span>
          <h1 className="page-title">Đơn của tôi</h1>
        </div>
        <StatusView title="Quán chưa có đơn nào" message='Bấm "Sẵn sàng thu gom" ở trang chủ khi can đã đầy nhé.' />
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <span className="section-eyebrow">Quản lý</span>
        <h1 className="page-title">Đơn của tôi</h1>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`filter-tab ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.count !== undefined && f.count > 0 ? (
              <span className="filter-tab-count">{f.count}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {filteredList.map((order) => {
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
            <div className="sheet-actions">
              <button className="btn btn-secondary" onClick={() => setCancelId(null)} disabled={cancelOrder.isPending}>Để lại</button>
              <button className="btn btn-danger" onClick={() => void cancelOrder.mutateAsync(cancelId)} disabled={cancelOrder.isPending}>
                {cancelOrder.isPending ? 'Đang huỷ…' : 'Huỷ đơn'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
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
