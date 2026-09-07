import { useEffect, useState } from 'react';
import { Role } from '@eco-oil/shared-types';
import { useAuthStore } from './stores/auth-store';
import { ApiError } from './lib/api';
import {
  captureCollectorInvite,
  clearStoredCollectorInvite,
  getStoredCollectorInvite,
} from './lib/collector-invite';
import { LoginScreen } from './components/LoginScreen';
import { HomePage } from './pages/HomePage';
import { HistoryPage } from './pages/HistoryPage';
import { OrdersPage } from './pages/OrdersPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { AccountPage } from './pages/AccountPage';
import { CollectorFlow } from './pages/CollectorFlow';
import { StatusView } from './components/StatusView';
import { MerchantApprovalView } from './components/MerchantApprovalView';
import { startOutboxSyncWorker } from './lib/outbox-sync';
import { useOutboxStats } from './lib/outbox-hooks';
import { Icon } from './components/Icon';

type Tab = 'home' | 'history' | 'orders' | 'payments' | 'account';

const TAB_CONFIG: { key: Tab; icon: string; label: string }[] = [
  { key: 'home', icon: 'grid_view', label: 'Trang chủ' },
  { key: 'orders', icon: 'inventory_2', label: 'Đơn' },
  { key: 'history', icon: 'receipt_long', label: 'Lịch sử' },
  { key: 'payments', icon: 'account_balance_wallet', label: 'Thanh toán' },
  { key: 'account', icon: 'manage_accounts', label: 'Tài khoản' },
];

const TAB_TITLES: Record<Tab, string> = {
  home: 'Trang chủ',
  orders: 'Đơn thu gom',
  history: 'Lịch sử giao dịch',
  payments: 'Thanh toán ví',
  account: 'Tài khoản',
};

function BrandHeader({ title }: { title: string }) {
  return (
    <header className="brand-header">
      <div className="brand-header-inner">
        <div className="brand-header-left">
          <div className="brand-logo">
            <span style={{ lineHeight: 1 }}>E</span>
          </div>
          <div className="brand-text">
            <span className="brand-name">ECOllect</span>
            <span className="brand-title">{title}</span>
          </div>
        </div>
        <div className="brand-header-right">
          <button className="header-icon-btn" aria-label="Thông báo">
            <Icon name="notifications" size={22} />
          </button>
          <div className="header-avatar">
            <Icon name="person" size={18} />
          </div>
        </div>
      </div>
    </header>
  );
}

function FloatingNav({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (tab: Tab) => void }) {
  return (
    <nav className="floating-nav" aria-label="Điều hướng chính">
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

export function App() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const hydrate = useAuthStore((state) => state.hydrate);
  const acceptCollectorInvite = useAuthStore((state) => state.acceptCollectorInvite);
  const signOut = useAuthStore((state) => state.signOut);
  const outboxStats = useOutboxStats();
  const [tab, setTab] = useState<Tab>('home');
  const [collectorInviteError, setCollectorInviteError] = useState<string | null>(null);
  const [collectorInviteRetry, setCollectorInviteRetry] = useState(0);
  const [collectorInvitePending, setCollectorInvitePending] = useState(false);

  useEffect(() => {
    setCollectorInvitePending(Boolean(captureCollectorInvite()));
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated || !user) return undefined;
    const code = getStoredCollectorInvite();
    if (!code) {
      setCollectorInvitePending(false);
      return undefined;
    }
    if (user.role === Role.COLLECTOR) {
      clearStoredCollectorInvite();
      setCollectorInvitePending(false);
      return undefined;
    }
    let active = true;
    setCollectorInvitePending(true);
    void acceptCollectorInvite(code)
      .then(() => {
        if (!active) return;
        clearStoredCollectorInvite();
        setCollectorInviteError(null);
        setCollectorInvitePending(false);
      })
      .catch((error) => {
        if (!active) return;
        if (
          error instanceof ApiError &&
          [
            'COLLECTOR_INVITE_INVALID',
            'COLLECTOR_INVITE_ALREADY_USED',
            'COLLECTOR_INVITE_ROLE_CONFLICT',
            'USER_ALREADY_LINKED_COLLECTOR',
            'COLLECTOR_LOCKED',
          ].includes(error.code)
        ) {
          clearStoredCollectorInvite();
        }
        setCollectorInviteError(
          error instanceof ApiError ? error.message : 'Không thể liên kết lời mời người thu gom.',
        );
        setCollectorInvitePending(false);
      });
    return () => {
      active = false;
    };
  }, [acceptCollectorInvite, collectorInviteRetry, hydrated, user?.id]);

  useEffect(() => {
    if (user?.role !== Role.COLLECTOR) return undefined;
    return startOutboxSyncWorker();
  }, [user?.role]);

  if (!hydrated)
    return (
      <div className="app-loading">
        <div className="app-loading-logo">E</div>
        <strong>ECOllect</strong>
        <span>Đang chuẩn bị ứng dụng…</span>
      </div>
    );
  if (!user) return <LoginScreen />;

  if (collectorInvitePending)
    return (
      <StatusView
        title="Đang liên kết người thu gom"
        message="Đang xác minh lời mời và chuẩn bị tuyến phụ trách…"
      />
    );

  if (collectorInviteError) {
    return (
      <StatusView
        title="Không thể liên kết lời mời"
        message={collectorInviteError}
        action={{
          label: 'Thử lại',
          onClick: () => {
            setCollectorInviteError(null);
            setCollectorInviteRetry((attempt) => attempt + 1);
          },
        }}
      />
    );
  }

  if (user.role === Role.COLLECTOR) {
    async function handleCollectorSignOut(): Promise<void> {
      const unsynced = outboxStats.pending + outboxStats.syncing + outboxStats.failed;
      if (
        unsynced > 0 &&
        !window.confirm(
          `Còn ${unsynced} giao dịch chưa đồng bộ. Bạn có chắc muốn thoát? Dữ liệu vẫn được giữ an toàn trong hàng chờ trên máy.`,
        )
      )
        return;
      // Deliberately keep IndexedDB outbox rows; logout only clears auth state and tokens.
      await signOut();
    }
    return (
      <div className="app-shell">
        <BrandHeader title="Tuyến hôm nay" />
        <main className="main-area">
          <div className="page-content" style={{ paddingTop: 24, paddingBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div />
              <button className="header-signout" onClick={() => void handleCollectorSignOut()}>
                Thoát
              </button>
            </div>
            <CollectorFlow key={user.id} />
          </div>
        </main>
      </div>
    );
  }

  if (user.role !== Role.MERCHANT) {
    return (
      <StatusView
        title="Vai trò chưa được hỗ trợ"
        message="Tài khoản này chưa có giao diện trong ứng dụng."
        action={{
          label: 'Đăng xuất',
          onClick: () => {
            void signOut();
          },
        }}
      />
    );
  }

  if (user.merchantApprovalStatus !== 'APPROVED') return <MerchantApprovalView user={user} />;

  return (
    <div className="app-shell">
      <BrandHeader title={TAB_TITLES[tab]} />
      <main className="main-area">
        {tab === 'home' ? <HomePage key={user.id} /> : null}
        {tab === 'history' ? <HistoryPage key={user.id} /> : null}
        {tab === 'orders' ? <OrdersPage key={user.id} /> : null}
        {tab === 'payments' ? <PaymentsPage key={user.id} /> : null}
        {tab === 'account' ? <AccountPage key={user.id} /> : null}
      </main>
      <FloatingNav activeTab={tab} onTabChange={setTab} />
    </div>
  );
}
