import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { MERCHANT_MINE_SECTIONS, splitMerchantOrders, toggleMineSection } from '../lib/merchant-nav';
import type { MineSectionKey } from '../lib/merchant-nav';
import { useAuthStore } from '../stores/auth-store';
import { Icon } from '../components/Icon';
import { MerchantOrderList } from '../components/MerchantOrderList';
import { StatusView } from '../components/StatusView';
import { HistoryPage } from './HistoryPage';
import { PaymentsPage } from './PaymentsPage';
import { GreenJourneyPage } from './GreenJourneyPage';
import { MerchantContainersSection, MerchantProfileSection, MerchantReferralSection, MerchantSettingsSection } from './AccountPage';

/** Tab "Của tôi": mỗi mục mở rộng ra nội dung của một tab/khối cũ. */
export function MinePage() {
  const [openSection, setOpenSection] = useState<MineSectionKey | null>(null);

  return (
    <div className="page-content">
      <div className="mine-list">
        {MERCHANT_MINE_SECTIONS.map((section) => {
          const expanded = openSection === section.key;
          return (
            <section className={`mine-item ${expanded ? 'expanded' : ''}`} key={section.key}>
              <button
                className="mine-item-header"
                aria-expanded={expanded}
                aria-controls={expanded ? `mine-section-${section.key}` : undefined}
                onClick={() => setOpenSection((current) => toggleMineSection(current, section.key))}
              >
                <span className="section-icon">
                  <Icon name={section.icon} size={20} decorative />
                </span>
                <span className="settings-row-title mine-item-title">{section.title}</span>
                <Icon name={expanded ? 'expand_less' : 'expand_more'} size={22} decorative />
              </button>
              {expanded ? (
                <div className="mine-item-body" id={`mine-section-${section.key}`}>
                  <MineSectionContent sectionKey={section.key} />
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function MineSectionContent({ sectionKey }: { sectionKey: MineSectionKey }) {
  switch (sectionKey) {
    case 'history':
      return (
        <>
          <HistoryPage />
          <CancelledOrders />
        </>
      );
    case 'payments':
      return <PaymentsPage />;
    case 'green-journey':
      return <GreenJourneyPage />;
    case 'profile':
      return <MerchantProfileSection />;
    case 'containers':
      return <MerchantContainersSection />;
    case 'referral':
      return <MerchantReferralSection />;
    case 'settings':
      return <MerchantSettingsSection />;
  }
}

function CancelledOrders() {
  const identityKey = useAuthStore((state) => state.user?.id ?? 'unknown');
  const orders = useQuery({ queryKey: ['merchant-orders', identityKey], queryFn: api.orders });
  const cancelled = splitMerchantOrders(orders.data?.data ?? []).cancelled;

  if (orders.isError) {
    return <StatusView title="Chưa tải được đơn đã huỷ" message="Vui lòng kiểm tra kết nối và thử lại." action={{ label: 'Thử lại', onClick: () => { void orders.refetch(); } }} />;
  }
  if (cancelled.length === 0) return null;

  return (
    <div className="mine-section-body">
      <div className="section-heading">
        <div className="section-heading-left">
          <div className="section-icon">
            <Icon name="cancel" size={20} />
          </div>
          <h3 className="section-title">Đơn đã huỷ</h3>
        </div>
        <span className="badge badge-surface">{cancelled.length} đơn</span>
      </div>
      <MerchantOrderList orders={cancelled} />
    </div>
  );
}
