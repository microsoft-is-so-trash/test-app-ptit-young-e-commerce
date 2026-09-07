import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PaymentRecord } from '@eco-oil/shared-types';
import { api, ApiError } from '../lib/api';
import { formatCurrency, formatDate, formatLiters } from '../lib/formatters';
import { StatusView } from '../components/StatusView';
import { useAuthStore } from '../stores/auth-store';
import { Icon } from '../components/Icon';

const statusLabel = { PENDING: 'Chờ thanh toán', PAID: 'Đã thanh toán', CANCELLED: 'Đã huỷ' } as const;

type Segment = 'current' | 'history';

export function PaymentsPage() {
  const userId = useAuthStore((state) => state.user?.id ?? 'unknown');
  const payments = useQuery({ queryKey: ['merchant-payments', userId], queryFn: () => api.payments() });
  const [segment, setSegment] = useState<Segment>('current');

  if (payments.isPending) return <StatusView title="Đang tải thanh toán…" />;
  if (payments.isError) return <StatusView title="Chưa tải được thanh toán" message={payments.error instanceof ApiError ? payments.error.message : 'Vui lòng kiểm tra kết nối và thử lại.'} action={{ label: 'Thử lại', onClick: () => { void payments.refetch(); } }} />;
  if (!payments.data.data.length) return <StatusView title="Chưa có kỳ thanh toán" message="Sau khi ECOllect chốt kỳ, số tiền và trạng thái thanh toán sẽ xuất hiện tại đây." />;

  const periods = payments.data.data.reduce<Map<string, PaymentRecord[]>>((groups, payment) => {
    const rows = groups.get(payment.period) ?? [];
    rows.push(payment);
    groups.set(payment.period, rows);
    return groups;
  }, new Map());

  const periodEntries = Array.from(periods.entries());
  const totalAccumulated = payments.data.data.reduce((sum, p) => sum + p.amount, 0);
  const totalLiters = payments.data.data.reduce((sum, p) => sum + p.liters, 0);

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <span className="section-eyebrow">Minh bạch theo kỳ</span>
        <h1 className="page-title">Tiền dầu của quán</h1>
      </div>

      {/* Hero Overview Card */}
      <div className="hero-card">
        <div className="hero-card-ambient" />
        <div className="hero-card-content">
          <span className="hero-card-period">
            TỔNG THU NHẬP TÍCH LUỸ
          </span>
          <div className="hero-card-amount">
            {formatCurrency(totalAccumulated)}
          </div>
          <div className="hero-card-footer">
            <span>{formatLiters(totalLiters)} tổng cộng</span>
            <span className="hero-dot">·</span>
            <span>{periodEntries.length} kỳ chốt</span>
          </div>
        </div>
      </div>

      {/* Segment Tabs */}
      <div className="segment-tabs">
        <button
          className={`segment-tab ${segment === 'current' ? 'active' : ''}`}
          onClick={() => setSegment('current')}
        >
          Tuần này
        </button>
        <button
          className={`segment-tab ${segment === 'history' ? 'active' : ''}`}
          onClick={() => setSegment('history')}
        >
          Lịch sử các tuần
        </button>
      </div>

      {/* Payment Periods */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {(segment === 'current' ? periodEntries.slice(0, 1) : periodEntries).map(([period, rows]) => {
          const periodTotal = rows.reduce((sum, row) => sum + row.amount, 0);
          const periodLiters = rows.reduce((sum, row) => sum + row.liters, 0);
          const allPaid = rows.every((r) => r.status === 'PAID');

          return (
            <div className="payment-card" key={period}>
              {/* Period Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 'var(--space-sm)',
                borderBottom: '1px solid var(--surface-container)',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>
                    Kỳ {period}
                  </span>
                  <span className="text-headline-md" style={{ color: 'var(--primary)' }}>
                    {formatCurrency(periodTotal)}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <span className={`badge ${allPaid ? 'badge-success' : 'badge-warning'}`}>
                    {allPaid ? 'ĐÃ CHỐT' : 'ĐANG XỬ LÝ'}
                  </span>
                  <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)' }}>
                    {formatLiters(periodLiters)}
                  </span>
                </div>
              </div>

              {/* Payment Lines */}
              {rows.map((payment) => (
                <div key={payment.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--surface-container-low)',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span className="text-label-lg" style={{ fontWeight: 700, color: 'var(--on-surface)' }}>
                      {formatLiters(payment.liters)} × {formatCurrency(payment.unit_price)}
                    </span>
                    <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)' }}>
                      {formatDate(payment.collected_at)}
                    </span>
                  </div>
                  <span className={`badge ${paymentBadgeClass(payment.status)}`}>
                    {statusLabel[payment.status]}
                  </span>
                </div>
              ))}

              {/* VietQR info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', padding: '8px 0 0', opacity: 0.7 }}>
                <Icon name="flash_on" size={14} style={{ color: 'var(--secondary)' }} />
                <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)' }}>
                  VietQR 247 · MB Bank
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function paymentBadgeClass(status: string): string {
  switch (status) {
    case 'PAID':
      return 'badge-success';
    case 'PENDING':
      return 'badge-warning';
    case 'CANCELLED':
      return 'badge-error';
    default:
      return 'badge-outline';
  }
}
