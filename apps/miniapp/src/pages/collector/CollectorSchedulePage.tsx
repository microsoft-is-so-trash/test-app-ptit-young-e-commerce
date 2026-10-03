import { useQuery } from '@tanstack/react-query';
import type { CollectionTransactionResponse } from '@eco-oil/shared-types';
import { ApiError, api } from '../../lib/api';
import { formatLiters } from '../../lib/formatters';
import { formatTime } from '../../lib/collector-format';
import { vietnamDateKey } from '../../lib/collector-stats';
import { StatusView } from '../../components/StatusView';
import { Icon } from '../../components/Icon';
import { useAuthStore } from '../../stores/auth-store';

/** Mục "Đã thu" trong "Của tôi": các lần thu gom đã xong, nhóm theo ngày. */
export function CollectorCollectedHistory() {
  const collectorId = useAuthStore((state) => state.user?.collectorId ?? state.user?.id ?? 'unknown');
  const history = useQuery({ queryKey: ['collector-history', collectorId], queryFn: () => api.myCollections(1, 100) });

  return (
    <HistorySection
      isPending={history.isPending}
      error={history.error}
      transactions={history.data?.data ?? []}
      onRetry={() => { void history.refetch(); }}
    />
  );
}

function HistorySection({
  isPending,
  error,
  transactions,
  onRetry,
}: {
  isPending: boolean;
  error: unknown;
  transactions: CollectionTransactionResponse[];
  onRetry: () => void;
}) {
  if (isPending) return <StatusView title="Đang tải lịch sử thu gom…" />;
  if (error) {
    return (
      <StatusView
        title="Chưa tải được lịch sử"
        message={error instanceof ApiError ? error.message : 'Kiểm tra kết nối rồi thử lại.'}
        action={{ label: 'Thử lại', onClick: onRetry }}
      />
    );
  }
  if (transactions.length === 0) {
    return <StatusView title="Chưa có giao dịch nào" message="Các lần thu gom của bạn sẽ xuất hiện tại đây." />;
  }

  const byDay = new Map<string, CollectionTransactionResponse[]>();
  for (const txn of transactions) {
    const day = vietnamDateKey(txn.collected_at);
    byDay.set(day, [...(byDay.get(day) ?? []), txn]);
  }

  return (
    <section className="collector-schedule-list">
      {[...byDay.entries()].map(([day, rows]) => {
        const dayLiters = rows.reduce((sum, row) => sum + row.actual_liters, 0);
        return (
          <div key={day}>
            <div className="schedule-day-heading">
              <strong>{formatVietnamDay(day)}</strong>
              <span>{rows.length} lượt · {formatLiters(dayLiters)}</span>
            </div>
            {rows.map((row) => (
              <article className="schedule-row" key={row.id}>
                <div className="schedule-row-icon">
                  <Icon name="check_circle" size={20} />
                </div>
                <div className="schedule-row-body">
                  <strong>{formatLiters(row.actual_liters)}</strong>
                  <span>Can {row.container_code} · {formatTime(row.collected_at)}</span>
                  {row.grade ? <span className="schedule-row-meta">Hạng {row.grade}</span> : null}
                </div>
              </article>
            ))}
          </div>
        );
      })}
    </section>
  );
}

function formatVietnamDay(dayKey: string): string {
  const [year, month, day] = dayKey.split('-');
  return `Ngày ${day}/${month}/${year}`;
}
