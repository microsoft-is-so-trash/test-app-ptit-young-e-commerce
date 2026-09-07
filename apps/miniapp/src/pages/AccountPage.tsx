import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth-store';
import { StatusView } from '../components/StatusView';
import { Icon } from '../components/Icon';
import { fillPercent } from '../lib/formatters';

export function AccountPage() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const identityKey = user?.id ?? 'unknown';
  const dashboard = useQuery({ queryKey: ['merchant-dashboard', identityKey], queryFn: api.dashboard });

  const [toggleOA, setToggleOA] = useState(true);
  const [toggleCap, setToggleCap] = useState(true);

  if (dashboard.isPending) return <StatusView title="Đang tải thông tin tài khoản…" />;
  if (dashboard.isError) return <StatusView title="Chưa tải được dữ liệu" message="Kiểm tra kết nối rồi thử lại nhé." action={{ label: 'Thử lại', onClick: () => { void dashboard.refetch(); } }} />;

  const data = dashboard.data;
  const container = data.containers[0];
  const percentage = container ? fillPercent(container.estimated_liters, container.capacity_l) : 0;

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <span className="section-eyebrow">Thiết lập & Tài khoản</span>
          <span className="badge badge-success">
            <span className="badge-dot badge-dot-pulse" />
            <span style={{ fontWeight: 600 }}>Trực tuyến</span>
          </span>
        </div>
        <h1 className="page-title">Cài đặt & Hồ sơ</h1>
      </div>

      {/* Hero Profile Card */}
      <div className="account-hero">
        <div className="hero-card-ambient" />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {/* ISCC Badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="badge badge-inverse">
              <Icon name="verified_user" filled size={16} />
              <span style={{ fontWeight: 600 }}>ĐÃ XÁC THỰC ISCC-EU</span>
            </span>
            <span className="text-label-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>ID: {user?.zalo_id ?? 'N/A'}</span>
          </div>

          {/* Merchant Info */}
          <div style={{ marginTop: 4 }}>
            <h2 className="text-headline-md" style={{ color: 'var(--on-primary)', textTransform: 'none', fontWeight: 700 }}>{user?.name ?? 'Quán của bạn'}</h2>
            <p className="text-label-lg" style={{ color: 'var(--secondary-container)', marginTop: 2 }}>
              {user?.name} <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 400 }}>· Đại diện pháp lý</span>
            </p>
          </div>

          {/* Contact */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingTop: 4 }} className="text-label-md">
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.9)' }}>
              <Icon name="call" size={16} />
              {user?.phone ?? '0908 *** 892'}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
              <Icon name="shield" size={15} />
              Đã liên kết Zalo ID
            </span>
          </div>

          {/* Edit button */}
          <button className="btn btn-surface btn-full" style={{ marginTop: 4 }}>
            <span>Chỉnh sửa thông tin cơ sở</span>
            <Icon name="arrow_forward" size={18} />
          </button>
        </div>
      </div>

      {/* Can Inventory */}
      <div className="info-card">
        <div className="section-heading">
          <div className="section-heading-left">
            <div className="section-icon">
              <Icon name="propane_tank" size={20} />
            </div>
            <h3 className="section-title">Can chuẩn được cấp ({data.containers.length}/{Math.max(2, data.containers.length)})</h3>
          </div>
          <span className="badge badge-primary" style={{ fontWeight: 600 }}>{data.containers.length} can sẵn sàng</span>
        </div>

        {container ? (
          <div className="sub-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--primary)', fontWeight: 700 }}>{container.code}</span>
                <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)' }}>Can HDPE ISCC {container.capacity_l} Lít</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-container-lowest)', fontSize: 11, fontWeight: 600, color: 'var(--primary)' }}>
                <Icon name="qr_code_2" size={14} />
                QR-ISCC
              </div>
            </div>

            {/* Capacity Gauge */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)' }}>Mức UCO tích luỹ ước tính:</span>
                <span className="text-label-lg" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                  {container.estimated_liters.toFixed(1)}L <span style={{ color: 'var(--on-surface-variant)', fontWeight: 400, fontSize: 11 }}>/ {container.capacity_l}L ({percentage}%)</span>
                </span>
              </div>
              <div className="progress-track progress-track-sm">
                <div className="progress-fill" style={{ width: `${percentage}%` }} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }} className="text-label-sm">
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--on-surface-variant)' }}>
                <Icon name="verified" size={15} style={{ color: 'var(--secondary)' }} />
                {container.state === 'AT_MERCHANT' ? 'Ở quán (Sẵn sàng)' : 'Đang vận chuyển'}
              </span>
            </div>
          </div>
        ) : (
          <div className="sub-card" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
            <p className="text-body-sm" style={{ color: 'var(--on-surface-variant)' }}>Quán chưa được cấp can</p>
          </div>
        )}

        <button className="btn btn-secondary btn-full" style={{ fontSize: 12 }}>
          <Icon name="add_circle" size={18} />
          <span>Đăng ký cấp thêm can chuẩn (Yêu cầu trạm)</span>
        </button>
      </div>

      {/* Bank Account */}
      <div className="info-card">
        <div className="section-heading">
          <div className="section-heading-left">
            <div className="section-icon">
              <Icon name="account_balance" size={20} />
            </div>
            <h3 className="section-title">Tài khoản nhận tiền</h3>
          </div>
          <span className="badge badge-outline" style={{ color: 'var(--primary)', fontWeight: 600 }}>Auto-Settled</span>
        </div>

        <div className="sub-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--surface-container-lowest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--primary)', fontSize: 14, boxShadow: 'var(--shadow-xs)' }}>
                MB
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="text-label-lg" style={{ fontWeight: 700, color: 'var(--on-surface)' }}>MB Bank Quân Đội</span>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--on-surface-variant)' }}>0984 **** 212</span>
              </div>
            </div>
            <span className="badge badge-primary" style={{ fontWeight: 700 }}>Chính</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--surface-container)' }} className="text-label-sm">
            <span style={{ color: 'var(--on-surface-variant)' }}>Chủ tài khoản:</span>
            <span className="text-label-md" style={{ fontWeight: 700, color: 'var(--on-surface)', textTransform: 'uppercase' }}>{user?.name ?? 'N/A'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.8)', color: 'var(--primary)' }} className="text-label-sm">
            <Icon name="flash_on" size={18} style={{ color: 'var(--secondary)' }} />
            <span>Hỗ trợ VietQR 247 & Ví ZaloPay Merchant (Quyết toán tức thì).</span>
          </div>
        </div>

        <button className="btn btn-secondary btn-full" style={{ fontSize: 12 }}>
          <Icon name="credit_card" size={18} />
          <span>Thay đổi tài khoản thụ hưởng</span>
        </button>
      </div>

      {/* Settings & Toggles */}
      <div className="info-card">
        <div className="section-heading-left">
          <div className="section-icon">
            <Icon name="tune" size={20} />
          </div>
          <h3 className="section-title">Cài đặt & Vận hành</h3>
        </div>

        <div className="settings-list">
          <div className="settings-row">
            <div className="settings-row-content">
              <span className="settings-row-title">Thông báo Zalo OA khi Collector nhận đơn</span>
              <span className="settings-row-subtitle">Nhận tin nhắn Zalo kèm vị trí trực tiếp tài xế gom</span>
            </div>
            <button
              className={`toggle-switch ${toggleOA ? 'active' : ''}`}
              role="switch"
              aria-checked={toggleOA}
              onClick={() => setToggleOA(!toggleOA)}
            >
              <span className="toggle-switch-knob" />
            </button>
          </div>

          <div className="settings-row">
            <div className="settings-row-content">
              <span className="settings-row-title">Cảnh báo khi can đạt 85% đầy</span>
              <span className="settings-row-subtitle">Tự động gợi ý đặt lịch gom UCO tránh tràn dầu thải</span>
            </div>
            <button
              className={`toggle-switch ${toggleCap ? 'active' : ''}`}
              role="switch"
              aria-checked={toggleCap}
              onClick={() => setToggleCap(!toggleCap)}
            >
              <span className="toggle-switch-knob" />
            </button>
          </div>

          <div className="settings-nav-row">
            <div className="settings-nav-left">
              <Icon name="security" size={20} style={{ color: 'var(--on-surface-variant)' }} />
              <div className="settings-row-content">
                <span className="settings-row-title">Bảo mật & Phiên làm việc Zalo</span>
                <span className="settings-row-subtitle">Xác thực mã PIN/Biometric khi xác nhận bàn giao can</span>
              </div>
            </div>
            <Icon name="chevron_right" size={20} style={{ color: 'var(--on-surface-variant)' }} />
          </div>

          <div className="settings-nav-row">
            <div className="settings-nav-left">
              <Icon name="workspace_premium" size={20} style={{ color: 'var(--secondary)' }} />
              <div className="settings-row-content">
                <span className="settings-row-title">Tải chứng nhận phát thải CO2e & Biên bản</span>
                <span className="settings-row-subtitle">File PDF kèm chữ ký số điện tử chuẩn ISCC-EU</span>
              </div>
            </div>
            <div className="section-icon">
              <Icon name="download" size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Environment & Logout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 16 }}>
        <div className="gps-banner" style={{ justifyContent: 'space-between' }}>
          <span className="text-label-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--on-surface-variant)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--secondary)' }} />
            Hà Nội Cluster · Staging Node
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--on-surface-variant)' }}>Build: v2.4.0</span>
        </div>

        <button className="btn btn-danger btn-full btn-lg" onClick={() => { void signOut(); }}>
          <Icon name="logout" size={20} />
          <span>ĐĂNG XUẤT TÀI KHOẢN QUÁN</span>
        </button>
      </div>
    </div>
  );
}
