import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CollectionTransactionResponse, RouteStop } from '@eco-oil/shared-types';
import { ApiError, api } from '../../lib/api';
import { formatLiters } from '../../lib/formatters';
import { formatDistance, formatTime } from '../../lib/collector-format';
import { vietnamDateKey } from '../../lib/collector-stats';
import { CollectorNotice } from '../../components/CollectorNotice';
import { StatusView } from '../../components/StatusView';
import { Icon } from '../../components/Icon';
import { useAuthStore } from '../../stores/auth-store';

type Segment = 'today' | 'history';

export function CollectorSchedulePage() {
  const collectorId = useAuthStore((state) => state.user?.collectorId ?? state.user?.id ?? 'unknown');
  const [segment, setSegment] = useState<Segment>('today');

  const route = useQuery({ queryKey: ['collector-schedule-route', collectorId], queryFn: () => api.currentRoute() });
  const history = useQuery({ queryKey: ['collector-history', collectorId], queryFn: () => api.myCollections(1, 100) });

  const pendingStops = (route.data?.stops ?? []).filter((stop) => stop.route_stop_status !== 'COLLECTED' && stop.route_stop_status !== 'SKIPPED');
  const transactions = history.data?.data ?? [];

  return (
    <div className="page-content collector-content collector-schedule-screen">
      <header className="collector-screen-heading">
        <p className="eyebrow">LỊCH THU GOM</p>
        <h1>Việc hôm nay và đã xong</h1>
      </header>

      <div className="segment-tabs">
        <button className={`segment-tab ${segment === 'today' ? 'active' : ''}`} onClick={() => setSegment('today')}>
          Cần thu hôm nay {pendingStops.length > 0 ? `(${pendingStops.length})` : ''}
        </button>
        <button className={`segment-tab ${segment === 'history' ? 'active' : ''}`} onClick={() => setSegment('history')}>
          Đã thu
        </button>
      </div>

      {segment === 'today' ? (
        <TodaySection isPending={route.isPending} isError={route.isError} stops={pendingStops} onRetry={() => { void route.refetch(); }} />
      ) : (
        <HistorySection
          isPending={history.isPending}
          error={history.error}
          transactions={transactions}
          onRetry={() => { void history.refetch(); }}
        />
      )}
    </div>
  );
}

function TodaySection({ isPending, isError, stops, onRetry }: { isPending: boolean; isError: boolean; stops: RouteStop[]; onRetry: () => void }) {
  if (isPending) return <StatusView title="Đang tải tuyến hôm nay…" />;
  if (isError) {
    return <StatusView title="Chưa tải được tuyến" message="Kiểm tra kết nối rồi thử lại." action={{ label: 'Thử lại', onClick: onRetry }} />;
  }
  if (stops.length === 0) {
    return <StatusView title="Không còn điểm nào chờ thu" message="Toàn bộ điểm trong tuyến hôm nay đã được xử lý." />;
  }

  const totalLiters = stops.reduce((sum, stop) => sum + stop.expected_liters, 0);
  return (
    <>
      <CollectorNotice icon="event_upcoming" title={`Còn ${stops.length} điểm cần thu`}>
        Tổng dự kiến khoảng {formatLiters(totalLiters)}. Vào tab Tuyến để bắt đầu thu gom.
      </CollectorNotice>
      <section className="collector-schedule-list">
        {stops.map((stop) => (
          <article className="schedule-row" key={stop.order_id}>
            <div className="schedule-row-seq">{stop.seq}</div>
            <div className="schedule-row-body">
              <strong>{stop.merchant.name}</strong>
              <span>{stop.merchant.address ?? 'Chưa có địa chỉ'}</span>
              <span className="schedule-row-meta">
                {formatLiters(stop.expected_liters)} dự kiến · cách {formatDistance(stop.distance_m)}
              </span>
            </div>
          </article>
        ))}
      </section>
    </>
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
