import { useQuery } from '@tanstack/react-query';
import { ApiError, api } from '../../lib/api';
import { formatLiters } from '../../lib/formatters';
import { summarizeCollectorStats } from '../../lib/collector-stats';
import { buildMonthlyTrend } from '../../lib/monthly-trend';
import { MonthlyTrendChart } from '../../components/MonthlyTrendChart';
import { StatusView } from '../../components/StatusView';
import { Icon } from '../../components/Icon';
import { useAuthStore } from '../../stores/auth-store';

const CO2_KG_PER_LITER = 2.5;
const TREND_MONTHS_BACK = 6;

export function CollectorStatsPage() {
  const collectorId = useAuthStore((state) => state.user?.collectorId ?? state.user?.id ?? 'unknown');
  const history = useQuery({ queryKey: ['collector-history', collectorId], queryFn: () => api.myCollections(1, 100) });

  if (history.isPending) return <StatusView title="Đang tải thống kê…" />;
  if (history.isError) {
    return (
      <StatusView
        title="Chưa tải được thống kê"
        message={history.error instanceof ApiError ? history.error.message : 'Kiểm tra kết nối rồi thử lại.'}
        action={{ label: 'Thử lại', onClick: () => { void history.refetch(); } }}
      />
    );
  }

  const transactions = history.data.data;
  if (transactions.length === 0) {
    return <StatusView title="Chưa có dữ liệu" message="Thống kê sẽ xuất hiện sau lần thu gom đầu tiên của bạn." />;
  }

  const summary = summarizeCollectorStats(transactions, CO2_KG_PER_LITER);
  const monthly = buildMonthlyTrend(
    transactions.map((txn) => ({ ...txn, actual_liters: txn.actual_liters })),
    TREND_MONTHS_BACK,
    CO2_KG_PER_LITER,
  );

  return (
    <div className="page-content collector-content collector-stats-screen">
      <header className="collector-screen-heading">
        <p className="eyebrow">THỐNG KÊ CỦA TÔI</p>
        <h1>Kết quả thu gom</h1>
      </header>

      <section className="collector-stats-hero">
        <span>Tổng dầu đã thu</span>
        <strong>{formatLiters(summary.totalLiters)}</strong>
        <small>Giảm ước tính {summary.co2Kg.toFixed(0)} kg CO₂ theo hệ số {CO2_KG_PER_LITER} kg/lít</small>
      </section>

      <section className="collector-stats-grid">
        <StatCell icon="local_shipping" label="Số ca đã chạy" value={`${summary.shiftCount}`} note="Đếm theo mã tuyến" />
        <StatCell icon="event_available" label="Số ngày làm việc" value={`${summary.workingDays}`} note="Ngày có phát sinh thu gom" />
        <StatCell icon="storefront" label="Lượt thu gom" value={`${summary.totalPickups}`} note="Tổng số điểm đã thu" />
        <StatCell
          icon="water_drop"
          label="Trung bình mỗi lượt"
          value={formatLiters(Number(summary.averageLitersPerPickup.toFixed(1)))}
          note="Lít trên một điểm"
        />
      </section>

      {summary.busiestDay ? (
        <section className="info-card collector-stats-note">
          <div className="section-heading-left">
            <div className="section-icon">
              <Icon name="trending_up" size={20} />
            </div>
            <h3 className="section-title">Ngày thu nhiều nhất</h3>
          </div>
          <p>
            {formatDay(summary.busiestDay.date)} với {formatLiters(summary.busiestDay.liters)}.
          </p>
        </section>
      ) : null}

      <section className="info-card">
        <div className="section-heading-left">
          <div className="section-icon">
            <Icon name="bar_chart" size={20} />
          </div>
          <h3 className="section-title">Sản lượng {TREND_MONTHS_BACK} tháng gần nhất</h3>
        </div>
        <MonthlyTrendChart points={monthly} />
      </section>
    </div>
  );
}

function StatCell({ icon, label, value, note }: { icon: string; label: string; value: string; note: string }) {
  return (
    <article className="collector-stat-cell">
      <div className="collector-stat-cell-top">
        <Icon name={icon} size={18} />
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function formatDay(dayKey: string): string {
  const [year, month, day] = dayKey.split('-');
  return `${day}/${month}/${year}`;
}
