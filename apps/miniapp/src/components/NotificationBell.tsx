import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { currentVietnamWeek } from '../lib/formatters';
import { buildNotifications } from '../lib/notifications';
import { useAuthStore } from '../stores/auth-store';
import { Icon } from './Icon';

export function NotificationBell() {
  const user = useAuthStore((state) => state.user);
  const identityKey = user?.id ?? 'unknown';
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const week = currentVietnamWeek();
  const dashboard = useQuery({ queryKey: ['merchant-dashboard', identityKey], queryFn: api.dashboard, enabled: Boolean(user) });
  const payments = useQuery({
    queryKey: ['merchant-payments', identityKey, week.period],
    queryFn: () => api.payments(week.period),
    enabled: Boolean(user),
  });
  const oilPrice = useQuery({ queryKey: ['merchant-oil-price', identityKey], queryFn: api.currentOilPrice, enabled: Boolean(user) });

  const items = buildNotifications({ dashboard: dashboard.data, payments: payments.data, oilPrice: oilPrice.data });
  const unreadCount = items.filter((item) => !readIds.has(item.id)).length;

  function markAllRead() {
    setReadIds(new Set(items.map((item) => item.id)));
  }

  return (
    <>
      <button className="header-icon-btn notification-trigger" onClick={() => setOpen(true)} aria-label="Thông báo">
        <Icon name="notifications" size={22} />
        {unreadCount > 0 ? <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
      </button>

      {open ? createPortal(
        <div className="sheet-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section
            className="bottom-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-sheet-title"
            style={{ maxHeight: '85vh', overflowY: 'auto' }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sheet-header">
              <div className="sheet-header-left">
                <Icon name="notifications" size={22} style={{ color: 'var(--primary)' }} />
                <h2 id="notification-sheet-title" className="text-headline-sm" style={{ textTransform: 'none', fontWeight: 700 }}>
                  Thông báo
                </h2>
              </div>
              <button className="sheet-close" onClick={() => setOpen(false)} aria-label="Đóng">
                <Icon name="close" size={22} />
              </button>
            </div>

            {items.length === 0 ? (
              <p className="text-body-sm" style={{ color: 'var(--on-surface-variant)' }}>
                Chưa có thông báo mới.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', maxHeight: '45vh', overflowY: 'auto' }}>
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`notification-row ${readIds.has(item.id) ? 'read' : ''}`}
                    onClick={() => setReadIds((current) => new Set(current).add(item.id))}
                  >
                    <div className="section-icon">
                      <Icon name={item.icon} size={18} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                      <strong className="text-label-lg" style={{ color: 'var(--on-surface)' }}>{item.title}</strong>
                      <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)' }}>{item.description}</span>
                    </div>
                    {!readIds.has(item.id) ? <span className="notification-dot" /> : null}
                  </div>
                ))}
              </div>
            )}

            {items.length > 0 ? (
              <div className="sheet-actions">
                <button className="btn btn-secondary" onClick={markAllRead}>Đánh dấu đã đọc tất cả</button>
              </div>
            ) : null}
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
