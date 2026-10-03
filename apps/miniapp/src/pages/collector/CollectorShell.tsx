import { useState } from 'react';
import { BrandHeader } from '../../components/BrandHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Icon } from '../../components/Icon';
import { MineAccordion } from '../../components/MineAccordion';
import { COLLECTOR_MINE_SECTIONS, COLLECTOR_TABS, signOutNeedsConfirmation } from '../../lib/collector-nav';
import type { CollectorMineSectionKey, CollectorTab } from '../../lib/collector-nav';
import { useOutboxStats } from '../../lib/outbox-hooks';
import { CollectorFlow } from '../CollectorFlow';
import { CollectorCollectedHistory } from './CollectorSchedulePage';
import { CollectorStatsPage } from './CollectorStatsPage';
import { CollectorProfileSection, CollectorSettingsSection, CollectorWardsSection } from './CollectorAccountPage';

/** Các màn thao tác dở dang: ẩn thanh tab để không bấm nhầm giữa chừng. */
const FOCUSED_SCREENS = new Set(['qr', 'entry', 'station-delivery']);

interface CollectorShellProps {
  userId: string;
  onSignOut: () => void;
}

export function CollectorShell({ userId, onSignOut }: CollectorShellProps) {
  const [tab, setTab] = useState<CollectorTab>('shift');
  const [focusedScreen, setFocusedScreen] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const outboxStats = useOutboxStats();
  const activeTab = COLLECTOR_TABS.find((item) => item.key === tab) ?? COLLECTOR_TABS[0];
  const unsynced = outboxStats.pending + outboxStats.syncing + outboxStats.failed;

  function requestSignOut(): void {
    if (signOutNeedsConfirmation(outboxStats)) setConfirmingSignOut(true);
    else onSignOut();
  }

  function renderMineSection(key: CollectorMineSectionKey) {
    switch (key) {
      case 'collected':
        return (
          <>
            <CollectorStatsPage />
            <CollectorCollectedHistory />
          </>
        );
      case 'profile':
        return <CollectorProfileSection />;
      case 'wards':
        return <CollectorWardsSection />;
      case 'settings':
        return <CollectorSettingsSection onSignOut={requestSignOut} />;
    }
  }

  return (
    <div className="app-shell collector-shell">
      <BrandHeader title={activeTab.label} action={false} showAvatar={false} />
      <main className="main-area">
        <div className="page-content" style={{ paddingTop: 16, paddingBottom: 32 }}>
          {tab === 'shift' ? (
            <CollectorFlow
              key={userId}
              onScreenChange={(screen) => setFocusedScreen(FOCUSED_SCREENS.has(screen))}
            />
          ) : null}
          {tab === 'mine' ? <MineAccordion key={userId} sections={COLLECTOR_MINE_SECTIONS} renderContent={renderMineSection} /> : null}
        </div>
      </main>
      {!focusedScreen ? <CollectorTabBar activeTab={tab} onTabChange={setTab} /> : null}
      {confirmingSignOut ? (
        <ConfirmDialog
          title="Đăng xuất khi còn giao dịch chưa đồng bộ?"
          message={`Còn ${unsynced} giao dịch chưa đồng bộ. Dữ liệu vẫn được giữ an toàn trong hàng chờ trên máy và sẽ gửi khi đăng nhập lại.`}
          confirmLabel="Đăng xuất"
          cancelLabel="Ở lại"
          onCancel={() => setConfirmingSignOut(false)}
          onConfirm={() => { setConfirmingSignOut(false); onSignOut(); }}
        />
      ) : null}
    </div>
  );
}

function CollectorTabBar({ activeTab, onTabChange }: { activeTab: CollectorTab; onTabChange: (tab: CollectorTab) => void }) {
  return (
    <nav className="floating-nav" aria-label="Điều hướng người thu gom">
      <div className="floating-nav-bar floating-nav-bar-labeled">
        {COLLECTOR_TABS.map((item) => (
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
