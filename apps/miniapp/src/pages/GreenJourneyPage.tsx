import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import { formatLiters } from '../lib/formatters';
import { StatusView } from '../components/StatusView';
import { useAuthStore } from '../stores/auth-store';
import { Icon } from '../components/Icon';
import { MonthlyTrendChart } from '../components/MonthlyTrendChart';
import { buildMonthlyTrend } from '../lib/monthly-trend';
import { generateCo2ReportPdf } from '../lib/co2-report-pdf';

const CO2_KG_PER_LITER = 2.5;
const MONTHLY_GOAL_LITERS = 500;
const BEP_XANH_LITERS_THRESHOLD = 500;
const LONG_TERM_PARTNER_MONTHS_THRESHOLD = 6;
const TREND_MONTHS_BACK = 6;

interface Badge {
  key: string;
  label: string;
  description: string;
  icon: string;
  earned: boolean;
}

function monthsSince(isoDate: string): number {
  const start = new Date(isoDate);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
}

function rankChangeLabel(rankChange: number | null): { text: string; icon: string; tone: 'up' | 'down' | 'flat' } {
  if (rankChange === null) return { text: 'Chưa đủ dữ liệu tháng trước', icon: 'horizontal_rule', tone: 'flat' };
  if (rankChange > 0) return { text: `Tăng ${rankChange} bậc so với tháng trước`, icon: 'trending_up', tone: 'up' };
  if (rankChange < 0) return { text: `Giảm ${Math.abs(rankChange)} bậc so với tháng trước`, icon: 'trending_down', tone: 'down' };
  return { text: 'Không đổi so với tháng trước', icon: 'trending_flat', tone: 'flat' };
}

export function GreenJourneyPage() {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? 'unknown';
  const journey = useQuery({ queryKey: ['merchant-green-journey', userId], queryFn: api.greenJourney });
  const trendFrom = new Date();
  trendFrom.setMonth(trendFrom.getMonth() - (TREND_MONTHS_BACK - 1));
  trendFrom.setDate(1);
  const transactions = useQuery({
    queryKey: ['merchant-transactions-trend', userId],
    queryFn: () => api.transactions(1, 500, trendFrom.toISOString(), new Date().toISOString()),
    enabled: Boolean(user),
  });

  if (journey.isPending) return <StatusView title="Đang tải hành trình xanh…" />;
  if (journey.isError)
    return (
      <StatusView
        title="Chưa tải được dữ liệu"
        message={journey.error instanceof ApiError ? journey.error.message : 'Vui lòng kiểm tra kết nối và thử lại.'}
        action={{ label: 'Thử lại', onClick: () => { void journey.refetch(); } }}
      />
    );

  const data = journey.data;
  const monthlyTrend = buildMonthlyTrend(transactions.data?.data ?? [], TREND_MONTHS_BACK, CO2_KG_PER_LITER);

  function handleExportPdf() {
    const doc = generateCo2ReportPdf({
      merchantName: user?.name ?? 'Quán của bạn',
      generatedAt: new Date(),
      monthly: monthlyTrend,
    });
    doc.save(`bao-cao-co2-${new Date().toISOString().slice(0, 10)}.pdf`);
  }
  const monthsJoined = monthsSince(data.joined_at);
  const co2ReducedKg = data.total_liters * CO2_KG_PER_LITER;
  const topPercent = Math.max(1, Math.ceil((data.rank / data.total_merchants) * 100));
  const monthlyProgressPercent = Math.min(100, Math.round((data.liters_this_month / MONTHLY_GOAL_LITERS) * 100));
  const litersRemainingToGoal = Math.max(0, MONTHLY_GOAL_LITERS - data.liters_this_month);
  const rankChange = rankChangeLabel(data.rank_change);

  const badges: Badge[] = [
    {
      key: 'new-friend',
      label: 'Người bạn xanh mới',
      description: 'Hoàn thành lần thu gom đầu tiên',
      icon: 'volunteer_activism',
      earned: data.total_collections >= 1,
    },
    {
      key: 'green-kitchen',
      label: 'Bếp xanh',
      description: `Tái chế trên ${formatLiters(BEP_XANH_LITERS_THRESHOLD)}`,
      icon: 'soup_kitchen',
      earned: data.total_liters >= BEP_XANH_LITERS_THRESHOLD,
    },
    {
      key: 'long-term-partner',
      label: 'Đối tác xanh lâu dài',
      description: `Đồng hành trên ${LONG_TERM_PARTNER_MONTHS_THRESHOLD} tháng`,
      icon: 'handshake',
      earned: monthsJoined >= LONG_TERM_PARTNER_MONTHS_THRESHOLD,
    },
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <span className="section-eyebrow">Hành trình xanh của quán</span>
        <h1 className="page-title">🌱 Cùng ECOllect bảo vệ môi trường</h1>
      </div>

      <div className="hero-card">
        <div className="hero-card-ambient" />
        <div className="hero-card-content">
          <span className="hero-card-period">TỔNG DẦU ĐÃ TÁI CHẾ</span>
          <div className="hero-card-amount">{formatLiters(data.total_liters)}</div>
          <div className="hero-card-footer">
            <span>Giảm ước tính {co2ReducedKg.toFixed(0)} kg CO₂</span>
            <span className="hero-dot">·</span>
            <span>{data.total_collections} lần thu gom</span>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Đã tham gia</span>
            <div className="stat-card-icon-wrap">
              <Icon name="calendar_month" size={18} />
            </div>
          </div>
          <div className="stat-card-value">{monthsJoined} tháng</div>
          <div className="stat-card-caption">Kể từ ngày tham gia ECOllect</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Xếp hạng</span>
            <div className="stat-card-icon-wrap">
              <Icon name="military_tech" size={18} />
            </div>
          </div>
          <div className="stat-card-value">Top {topPercent}%</div>
          <div className="stat-card-caption">Hạng {data.rank}/{data.total_merchants} quán</div>
        </div>
        <div className="stat-card stat-card-wide">
          <div className="stat-card-header">
            <span className="stat-card-title">Lượng khí thải đã giảm</span>
            <div className="stat-card-icon-wrap">
              <Icon name="eco" size={18} />
            </div>
          </div>
          <div className="stat-card-value" style={{ fontSize: 20, lineHeight: '28px' }}>
            {co2ReducedKg.toFixed(0)} kg CO₂ (ước tính)
          </div>
          <div className="stat-card-caption">Quy đổi theo hệ số {CO2_KG_PER_LITER} kg CO₂/lít dầu tái chế</div>
        </div>
      </div>

      <div className="info-card">
        <div className="section-heading">
          <div className="section-heading-left">
            <div className="section-icon">
              <Icon name="workspace_premium" size={20} />
            </div>
            <h3 className="section-title">Thành tích đạt được</h3>
          </div>
        </div>
        {badges.map((badge) => (
          <div className="sub-card" key={badge.key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', opacity: badge.earned ? 1 : 0.5 }}>
            <div className="stat-card-icon-wrap">
              <Icon name={badge.icon} size={20} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
              <strong style={{ fontFamily: 'var(--font-label)', fontSize: 14, fontWeight: 700, color: 'var(--on-surface)' }}>
                {badge.label}
              </strong>
              <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)' }}>{badge.description}</span>
            </div>
            <span className={`badge ${badge.earned ? 'badge-success' : 'badge-surface'}`}>
              {badge.earned ? 'Đã đạt' : 'Chưa đạt'}
            </span>
          </div>
        ))}
      </div>

      <div className="info-card">
        <div className="section-heading">
          <div className="section-heading-left">
            <div className="section-icon">
              <Icon name="trending_up" size={20} />
            </div>
            <h3 className="section-title">Tiến trình xanh tháng này</h3>
          </div>
          <span className="badge badge-surface">{monthlyProgressPercent}%</span>
        </div>
        <div className="sub-card">
          <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)' }}>
            Mục tiêu tháng này: {formatLiters(MONTHLY_GOAL_LITERS)} dầu
          </span>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${monthlyProgressPercent}%` }} />
          </div>
          <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)' }}>
            {litersRemainingToGoal > 0
              ? `Còn ${formatLiters(litersRemainingToGoal)} nữa để đạt mục tiêu tháng`
              : 'Đã đạt mục tiêu tháng này 🎉'}
          </span>
        </div>
      </div>

      <div className="info-card">
        <div className="section-heading">
          <div className="section-heading-left">
            <div className="section-icon">
              <Icon name="groups" size={20} />
            </div>
            <h3 className="section-title">Xếp hạng cộng đồng</h3>
          </div>
        </div>
        <div className="sub-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <strong style={{ fontFamily: 'var(--font-label)', fontSize: 16, fontWeight: 700, color: 'var(--on-surface)' }}>
              Hạng {data.rank}/{data.total_merchants} quán
            </strong>
            <span className="badge badge-success">Top {topPercent}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <Icon
              name={rankChange.icon}
              size={16}
              style={{ color: rankChange.tone === 'up' ? 'var(--secondary)' : rankChange.tone === 'down' ? 'var(--error)' : 'var(--on-surface-variant)' }}
            />
            <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)' }}>{rankChange.text}</span>
          </div>
          <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)', display: 'block', marginTop: 8 }}>
            Xếp hạng ẩn danh, tính theo tổng lít dầu thu gom trong tháng.
          </span>
        </div>
      </div>

      <div className="info-card">
        <div className="section-heading">
          <div className="section-heading-left">
            <div className="section-icon">
              <Icon name="bar_chart" size={20} />
            </div>
            <h3 className="section-title">Lịch sử & báo cáo CO2</h3>
          </div>
        </div>
        <div className="sub-card">
          <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)' }}>
            Lít dầu tái chế theo tháng ({TREND_MONTHS_BACK} tháng gần nhất)
          </span>
          <MonthlyTrendChart points={monthlyTrend} />
        </div>
        <button className="btn btn-secondary btn-full" style={{ fontSize: 12 }} onClick={handleExportPdf}>
          <Icon name="picture_as_pdf" size={18} />
          <span>Xuất báo cáo PDF</span>
        </button>
      </div>
    </div>
  );
}
