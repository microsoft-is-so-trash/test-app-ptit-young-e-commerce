import { useState } from 'react';
import { DEFAULT_DENSITY_KG_PER_LITER } from '@eco-oil/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../lib/api';
import { currentVietnamWeek, fillPercent, formatCurrency, formatDate, formatLiters } from '../lib/formatters';
import { OrderSheet } from '../components/OrderSheet';
import { StatusView } from '../components/StatusView';
import { useAuthStore } from '../stores/auth-store';
import { Icon } from '../components/Icon';

const PRICE_PER_LITER = Number(import.meta.env.VITE_ESTIMATED_PRICE_PER_LITER ?? 8000);

export function HomePage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showMoney, setShowMoney] = useState(true);
  const identityKey = user?.id ?? 'unknown';
  const dashboard = useQuery({ queryKey: ['merchant-dashboard', identityKey], queryFn: api.dashboard });
  const week = currentVietnamWeek();
  const weeklyPayments = useQuery({ queryKey: ['merchant-payments', identityKey, week.period], queryFn: () => api.payments(week.period) });
  const weeklyTransactions = useQuery({ queryKey: ['merchant-transactions', identityKey, week.period], queryFn: () => api.transactions(1, 100, week.from, week.to) });
  const createOrder = useMutation({
    mutationFn: (liters: number | undefined) => api.createReadyOrder(liters),
    onSuccess: async (order) => {
      setSheetOpen(false);
      setNotice(order.collector_available === false ? 'Đơn đã ghi nhận, khu vực chưa có người thu gom phụ trách' : 'Đã báo, đang chờ thu gom');
      await queryClient.invalidateQueries({ queryKey: ['merchant-dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
    },
  });

  if (dashboard.isPending) return <StatusView title="Đang tải thông tin quán…" />;
  if (dashboard.isError) return <StatusView title="Chưa tải được dữ liệu" message="Kiểm tra kết nối rồi thử lại nhé." action={{ label: 'Thử lại', onClick: () => { void dashboard.refetch(); } }} />;

  const data = dashboard.data;
  const hasContainers = data.containers.length > 0;
  const availableContainer = data.containers.find((container) => container.state === 'AT_MERCHANT');
  const isWaiting = data.pending_orders > 0;
  const hasClosedPayments = (weeklyPayments.data?.data.length ?? 0) > 0;
  const estimatedWeeklyLiters = weeklyTransactions.data?.data.filter((transaction) => transaction.quality === 'PASS').reduce((sum, transaction) => sum + transaction.actual_liters, 0) ?? 0;
  const estimatedWeeklyKg = weeklyTransactions.data?.data.filter((transaction) => transaction.quality === 'PASS').reduce((sum, transaction) => sum + (transaction.actual_kg ?? transaction.actual_liters * DEFAULT_DENSITY_KG_PER_LITER), 0) ?? 0;
  const weeklyMoney = hasClosedPayments ? weeklyPayments.data?.totals.amount ?? 0 : estimatedWeeklyLiters * PRICE_PER_LITER;

  async function submitOrder(liters: number | undefined) {
    setNotice(null);
    try {
      await createOrder.mutateAsync(liters);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ORDER_ALREADY_OPEN') {
        setSheetOpen(false);
        setNotice('Đã báo, đang chờ thu gom');
        await queryClient.invalidateQueries({ queryKey: ['merchant-dashboard'] });
        return;
      }
      if (error instanceof ApiError && error.code === 'NO_CONTAINER_ASSIGNED') {
        setSheetOpen(false);
        setNotice('Quán chưa được cấp can. ECOllect sẽ liên hệ giao can trong 1-2 ngày làm việc. Hotline: 1900 1234');
        await queryClient.invalidateQueries({ queryKey: ['merchant-dashboard'] });
        return;
      }
      if (error instanceof ApiError && error.code === 'NO_CONTAINER_AVAILABLE') {
        setSheetOpen(false);
        setNotice('Can đang trên đường về, chưa thể báo thu gom');
        return;
      }
      setNotice(error instanceof ApiError ? error.message : 'Chưa gửi được yêu cầu. Vui lòng thử lại sau.');
    }
  }

  return (
    <div className="page-content">
      {/* Welcome Header */}
      <div className="page-header">
        <span className="section-eyebrow">Hôm nay</span>
        <h1 className="merchant-welcome-title">Xin chào, {user?.name ?? 'quán của bạn'}</h1>
        <div className="merchant-code-chip">
          <Icon name="storefront" size={15} />
          <span>Mã cơ sở: <strong>{user?.zalo_id ?? 'Chưa xác định'}</strong></span>
        </div>
      </div>

      {/* Hero Revenue Card */}
      <div className="hero-card">
        <div className="hero-card-ambient" />
        <div className="hero-card-content">
          <div className="hero-card-top">
            <span className="hero-card-period">
              TIỀN TUẦN NÀY · {week.period}
            </span>
            <button
              className="hero-card-eye-btn"
              onClick={() => setShowMoney(!showMoney)}
              aria-label={showMoney ? 'Ẩn số tiền' : 'Hiện số tiền'}
            >
              <Icon name={showMoney ? 'visibility' : 'visibility_off'} size={20} />
            </button>
          </div>
          <div className="hero-card-amount">
            {showMoney ? formatCurrency(weeklyMoney) : '••••••••'}
          </div>
          <div className="hero-card-footer">
            <span>{hasClosedPayments ? 'Số tiền đã chốt theo giao dịch' : 'Ước tính, kỳ chưa chốt'}</span>
            <span className="hero-dot">·</span>
            <span>{estimatedWeeklyKg.toFixed(1)} kg</span>
          </div>
        </div>
      </div>

      {/* Notice */}
      {notice ? (
        <div className="notice notice-success" role="status">
          <Icon name="check_circle" size={18} />
          <span>{notice}</span>
        </div>
      ) : null}

      {/* GPS Banner */}
      <div className="gps-banner">
        <div className="gps-banner-icon">
          <Icon name="cell_tower" size={16} />
        </div>
        <span className="gps-banner-text">
          Cloudflare GPS Relay: <strong className="gps-banner-status">Kết nối ổn định</strong>
        </span>
      </div>

      {/* Container Section */}
      <div className="info-card">
        <div className="section-heading">
          <div className="section-heading-left">
            <div className="section-icon">
              <Icon name="propane_tank" size={20} />
            </div>
            <h3 className="section-title">Can của quán</h3>
          </div>
          <span className="badge badge-surface">{data.containers.length} can</span>
        </div>

        {!hasContainers ? (
          <div className="sub-card" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
            <strong style={{ display: 'block', fontFamily: 'var(--font-label)', fontWeight: 700, color: 'var(--on-surface)' }}>
              Quán chưa được cấp can
            </strong>
            <p className="text-body-sm" style={{ color: 'var(--on-surface-variant)', margin: '8px 0' }}>
              ECOllect sẽ liên hệ giao can trong 1-2 ngày làm việc.
            </p>
            <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)' }}>Hotline: 1900 1234</span>
          </div>
        ) : (
          data.containers.map((container) => {
            const percentage = fillPercent(container.estimated_liters, container.capacity_l);
            return (
              <div className="sub-card" key={container.code}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <strong style={{ fontFamily: 'var(--font-label)', fontSize: 13, fontWeight: 700, color: 'var(--on-surface)' }}>
                    {container.code}
                  </strong>
                  <span className={`badge ${container.state === 'AT_MERCHANT' ? 'badge-success' : 'badge-warning'}`}>
                    {container.state === 'AT_MERCHANT' ? 'Ở quán' : 'Đang vận chuyển'}
                  </span>
                </div>
                <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)' }}>
                  {formatLiters(container.capacity_l)} dung tích · Ước tính {percentage}% đầy
                </span>
                <div className="progress-track progress-track-sm">
                  <div className="progress-fill" style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Ready Button */}
      <button
        className="btn btn-primary btn-full btn-lg"
        onClick={() => setSheetOpen(true)}
        disabled={isWaiting || !availableContainer}
      >
        <Icon name={isWaiting ? 'hourglass_top' : 'notifications_active'} size={22} />
        <span>
          {isWaiting
            ? 'Đã báo, đang chờ thu gom'
            : availableContainer
              ? 'Sẵn sàng thu gom'
              : hasContainers
                ? 'Can đang trên đường về'
                : 'Đang chờ được cấp can'}
        </span>
      </button>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Lít tháng này</span>
            <div className="stat-card-icon-wrap">
              <Icon name="water_drop" size={18} />
            </div>
          </div>
          <div className="stat-card-value">{formatLiters(data.liters_this_month)}</div>
          <div className="stat-card-caption">Tháng hiện tại</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">{hasClosedPayments ? 'Tiền chốt tuần' : 'Tiền ước tính tuần'}</span>
            <div className="stat-card-icon-wrap">
              <Icon name="payments" size={18} />
            </div>
          </div>
          <div className="stat-card-value">{formatCurrency(weeklyMoney)}</div>
          <div className="stat-card-caption">Tuần {week.period}</div>
        </div>
        <div className="stat-card stat-card-wide">
          <div className="stat-card-header">
            <span className="stat-card-title">Lần thu gom gần nhất</span>
            <div className="stat-card-icon-wrap">
              <Icon name="schedule" size={18} />
            </div>
          </div>
          <div className="stat-card-value" style={{ fontSize: 20, lineHeight: '28px' }}>
            {formatDate(data.last_collected_at)}
          </div>
          <div className="stat-card-caption">Theo biên bản thu gom điện tử</div>
        </div>
      </div>

      {sheetOpen ? (
        <OrderSheet
          busy={createOrder.isPending}
          maxLiters={availableContainer?.capacity_l ?? null}
          onClose={() => setSheetOpen(false)}
          onSubmit={(liters) => void submitOrder(liters)}
        />
      ) : null}
    </div>
  );
}
