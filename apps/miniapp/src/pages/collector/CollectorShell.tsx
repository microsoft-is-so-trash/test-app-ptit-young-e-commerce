import { useState } from 'react';
import { BrandHeader } from '../../components/BrandHeader';
import { Icon } from '../../components/Icon';
import { StatusView } from '../../components/StatusView';
import { CollectorFlow } from '../CollectorFlow';

export type CollectorTab = 'route' | 'map' | 'history' | 'stats' | 'account';

const TAB_CONFIG: { key: CollectorTab; icon: string; label: string; title: string }[] = [
  { key: 'route', icon: 'route', label: 'Tuyến', title: 'Tuyến hôm nay' },
  { key: 'map', icon: 'map', label: 'Bản đồ', title: 'Bản đồ điểm thu' },
  { key: 'history', icon: 'history', label: 'Lịch sử', title: 'Lịch sử thu gom' },
  { key: 'stats', icon: 'insights', label: 'Thống kê', title: 'Thống kê của tôi' },
  { key: 'account', icon: 'manage_accounts', label: 'Tài khoản', title: 'Tài khoản' },
];

/** Các màn thao tác dở dang: ẩn thanh tab để không bấm nhầm giữa chừng. */
const FOCUSED_SCREENS = new Set(['qr', 'entry', 'station-delivery']);

interface CollectorShellProps {
  userId: string;
  onSignOut: () => void;
}

export function CollectorShell({ userId, onSignOut }: CollectorShellProps) {
  const [tab, setTab] = useState<CollectorTab>('route');
  const [focusedScreen, setFocusedScreen] = useState(false);
  const activeTab = TAB_CONFIG.find((item) => item.key === tab) ?? TAB_CONFIG[0];

  return (
    <div className="app-shell collector-shell">
      <BrandHeader
        title={activeTab.title}
        action={
          <button className="header-signout" onClick={onSignOut}>
            Thoát
          </button>
        }
      />
      <main className="main-area">
        <div className="page-content" style={{ paddingTop: 16, paddingBottom: 32 }}>
          {tab === 'route' ? (
            <CollectorFlow
              key={userId}
              onScreenChange={(screen) => setFocusedScreen(FOCUSED_SCREENS.has(screen))}
            />
          ) : null}
          {tab === 'map' ? (
            <StatusView
              title="Bản đồ điểm thu gom"
              message="Sắp có: xem các điểm cần thu quanh địa bàn bạn phụ trách ngay trên bản đồ."
            />
          ) : null}
          {tab === 'history' ? (
            <StatusView
              title="Lịch sử thu gom"
              message="Sắp có: toàn bộ giao dịch bạn đã thu, lọc theo ngày và xem chi tiết từng can."
            />
          ) : null}
          {tab === 'stats' ? (
            <StatusView
              title="Thống kê của tôi"
              message="Sắp có: tổng lít đã thu, số điểm, số ca và lượng CO₂ quy đổi."
            />
          ) : null}
          {tab === 'account' ? (
            <StatusView
              title="Tài khoản"
              message="Sắp có: thông tin cá nhân, địa bàn phụ trách và sức chứa xe."
            />
          ) : null}
        </div>
      </main>
      {!focusedScreen ? <CollectorTabBar activeTab={tab} onTabChange={setTab} /> : null}
    </div>
  );
}

function CollectorTabBar({ activeTab, onTabChange }: { activeTab: CollectorTab; onTabChange: (tab: CollectorTab) => void }) {
  return (
    <nav className="floating-nav" aria-label="Điều hướng người thu gom">
      <div className="floating-nav-bar">
        {TAB_CONFIG.map((item) => (
          <button
            key={item.key}
            className={`nav-pill ${activeTab === item.key ? 'active' : ''}`}
            onClick={() => onTabChange(item.key)}
            aria-label={item.label}
            aria-current={activeTab === item.key ? 'page' : undefined}
          >
            <Icon name={item.icon} size={24} />
          </button>
        ))}
      </div>
    </nav>
  );
}
