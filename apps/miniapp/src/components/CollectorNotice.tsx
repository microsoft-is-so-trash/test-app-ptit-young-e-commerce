import type { ReactNode } from 'react';
import { Icon } from './Icon';

export type CollectorNoticeTone = 'info' | 'success' | 'warning' | 'danger';

const TONE_ICONS: Record<CollectorNoticeTone, string> = {
  info: 'info',
  success: 'check_circle',
  warning: 'warning',
  danger: 'error',
};

interface CollectorNoticeAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface CollectorNoticeProps {
  tone?: CollectorNoticeTone;
  icon?: string;
  title: string;
  children?: ReactNode;
  action?: CollectorNoticeAction;
}

/**
 * Một kiểu thông báo dùng chung cho mọi màn Collector: biểu tượng + tiêu đề ngắn
 * + mô tả, phân cấp bằng màu viền trái thay vì tô nền cả khối.
 */
export function CollectorNotice({ tone = 'info', icon, title, children, action }: CollectorNoticeProps) {
  return (
    <div className={`collector-notice collector-notice-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon name={icon ?? TONE_ICONS[tone]} size={20} className="collector-notice-icon" />
      <div className="collector-notice-body">
        <strong>{title}</strong>
        {children ? <span>{children}</span> : null}
        {action ? (
          <button
            type="button"
            className="collector-notice-action"
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
