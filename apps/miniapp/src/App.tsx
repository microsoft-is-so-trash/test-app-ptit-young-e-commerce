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
import { MinePage } from './pages/MinePage';
import { MERCHANT_TABS } from './lib/merchant-nav';
import type { MerchantTab } from './lib/merchant-nav';
import { CollectorShell } from './pages/collector/CollectorShell';
import { StatusView } from './components/StatusView';
import { MerchantApprovalView } from './components/MerchantApprovalView';
import { startOutboxSyncWorker } from './lib/outbox-sync';
import { Icon } from './components/Icon';
import { BrandHeader } from './components/BrandHeader';

function FloatingNav({ activeTab, onTabChange }: { activeTab: MerchantTab; onTabChange: (tab: MerchantTab) => void }) {
  return (
    <nav className="floating-nav" aria-label="Điều hướng chính">
      <div className="floating-nav-bar floating-nav-bar-labeled">
        {MERCHANT_TABS.map((item) => (
          <button
            key={item.key}
            className={`nav-pill nav-pill-labeled ${activeTab === item.key ? 'active' : ''}`}
            onClick={() => onTabChange(item.key)}
            aria-current={activeTab === item.key ? 'page' : undefined}
          >
            <Icon name={item.icon} size={22} decorative />
            <span className="text-label-md">{item.label}</span>
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
  const [tab, setTab] = useState<MerchantTab>('today');
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
    // Đăng xuất chỉ xoá phiên đăng nhập; hàng chờ IndexedDB vẫn giữ. Hộp xác nhận nằm trong CollectorShell.
    return <CollectorShell userId={user.id} onSignOut={() => { void signOut(); }} />;
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
      <BrandHeader title={MERCHANT_TABS.find((item) => item.key === tab)?.label ?? ''} withNotifications />
      <main className="main-area">
        {tab === 'today' ? <HomePage key={user.id} /> : null}
        {tab === 'mine' ? <MinePage key={user.id} /> : null}
      </main>
      <FloatingNav activeTab={tab} onTabChange={setTab} />
    </div>
  );
}
