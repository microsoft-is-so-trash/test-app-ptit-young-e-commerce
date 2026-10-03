import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { NotificationBell } from './NotificationBell';

interface BrandHeaderProps {
  title: string;
  withNotifications?: boolean;
  /** Hành động thay cho chuông thông báo, dùng cho vai trò chưa có trung tâm thông báo. */
  action?: ReactNode;
  /** Collector không hiện avatar (Q16); Merchant giữ avatar như cũ. */
  showAvatar?: boolean;
}

export function BrandHeader({ title, withNotifications = false, action, showAvatar = true }: BrandHeaderProps) {
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
          {action ?? (withNotifications ? (
            <NotificationBell />
          ) : (
            <button className="header-icon-btn" aria-label="Thông báo">
              <Icon name="notifications" size={22} />
            </button>
          ))}
          {showAvatar ? (
            <div className="header-avatar">
              <Icon name="person" size={18} />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
