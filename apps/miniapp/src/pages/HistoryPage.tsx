import { useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { DEFAULT_DENSITY_KG_PER_LITER } from '@eco-oil/shared-types';
import { api } from '../lib/api';
import { formatDate, formatLiters } from '../lib/formatters';
import { StatusView } from '../components/StatusView';
import { useAuthStore } from '../stores/auth-store';
import { Icon } from '../components/Icon';

export function HistoryPage() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const userId = useAuthStore((state) => state.user?.id ?? 'unknown');
  const history = useInfiniteQuery({
    queryKey: ['merchant-transactions', userId],
    queryFn: ({ pageParam }) => api.transactions(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.meta.page * lastPage.meta.limit < lastPage.meta.total ? lastPage.meta.page + 1 : undefined,
  });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !history.hasNextPage) {
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !history.isFetchingNextPage) {
        void history.fetchNextPage();
      }
    }, { rootMargin: '240px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [history]);

  if (history.isPending) {
    return <StatusView title="Đang tải lịch sử…" />;
  }
  if (history.isError) {
    return <StatusView title="Chưa tải được lịch sử" message="Vui lòng kiểm tra kết nối và thử lại." action={{ label: 'Thử lại', onClick: () => { void history.refetch(); } }} />;
  }
  const transactions = history.data.pages.flatMap((page) => page.data);
  if (transactions.length === 0) {
    return <StatusView title="Chưa có lần thu gom nào" message="Khi dầu được thu gom, lịch sử sẽ hiện ở đây." />;
  }

  // KPI calculations
  const totalLiters = transactions.reduce((sum, t) => sum + t.actual_liters, 0);
  const totalCount = transactions.length;
  const totalCO2 = totalLiters * 2.65; // approx kg CO2e per liter UCO

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <span className="section-eyebrow">Theo dõi</span>
        <h1 className="page-title">Lịch sử thu gom</h1>
      </div>

      {/* KPI Summary Banner */}
      <div className="info-card" style={{ background: '#ffffff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span className="text-headline-sm" style={{ color: 'var(--primary)', fontWeight: 700 }}>{formatLiters(totalLiters)}</span>
            <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)', fontWeight: 600 }}>Tổng lít</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, borderLeft: '1px solid var(--outline-variant)', borderRight: '1px solid var(--outline-variant)' }}>
            <span className="text-headline-sm" style={{ color: 'var(--primary)', fontWeight: 700 }}>{totalCount}</span>
            <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)', fontWeight: 600 }}>Lượt thu gom</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span className="text-headline-sm" style={{ color: 'var(--secondary)', fontWeight: 700 }}>{totalCO2.toFixed(1)}</span>
            <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)', fontWeight: 600 }}>kg CO₂e giảm</span>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {transactions.map((transaction) => (
          <article className="history-card" key={transaction.id}>
            {/* Top row: date + status */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <Icon name="schedule" size={16} style={{ color: 'var(--on-surface-variant)' }} />
                <strong className="text-label-lg" style={{ color: 'var(--on-surface)' }}>
                  {formatDate(transaction.collected_at)}
                </strong>
              </div>
              <span className={`badge ${transaction.quality === 'PASS' ? 'badge-success' : 'badge-warning'}`}>
                {transaction.quality === 'PASS' ? 'Đạt' : 'Cần kiểm tra'}
              </span>
            </div>

            {/* Container */}
            <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="propane_tank" size={14} />
              {transaction.container_code}
            </span>

            {/* Measurement grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-sm)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)' }}>Thể tích</span>
                <span className="text-headline-sm" style={{ color: 'var(--primary)' }}>
                  {formatLiters(transaction.actual_liters)}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)' }}>Khối lượng</span>
                <span className="text-headline-sm" style={{ color: 'var(--on-surface)' }}>
                  {transaction.actual_kg === null
                    ? `~${(transaction.actual_liters * DEFAULT_DENSITY_KG_PER_LITER).toFixed(1)} kg`
                    : `${transaction.actual_kg.toFixed(1)} kg`}
                </span>
              </div>
            </div>

            {/* Collector info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--surface-container)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--on-surface-variant)',
              }}>
                {(transaction.collector_name ?? 'N')[0]}
              </div>
              <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)' }}>
                Người thu gom: <span style={{ fontWeight: 700, color: 'var(--on-surface)' }}>
                  {transaction.collector_name ?? 'Đang cập nhật'}
                </span>
              </span>
            </div>
          </article>
        ))}
      </div>

      {/* Scroll sentinel */}
      <div
        ref={sentinelRef}
        style={{ minHeight: 50, padding: '20px 0', color: 'var(--on-surface-variant)', textAlign: 'center', fontSize: 12 }}
      >
        {history.isFetchingNextPage ? 'Đang tải thêm…' : history.hasNextPage ? ' ' : 'Đã hiển thị hết lịch sử'}
      </div>
    </div>
  );
}
