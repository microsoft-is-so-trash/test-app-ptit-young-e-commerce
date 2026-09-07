import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`skeleton-shimmer rounded-2xl ${className}`}
      aria-label="Đang tải"
    />
  );
}

export function EmptyState({ message = 'Chưa có dữ liệu' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center text-on-surface-variant">
      <span className="material-symbols-outlined text-4xl text-outline" aria-hidden="true">inbox</span>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export function ErrorState({ message = 'Không thể tải dữ liệu. Vui lòng thử lại.' }: { message?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-error/20 bg-error-container p-5 text-on-error-container">
      <span className="material-symbols-outlined filled shrink-0 text-error" aria-hidden="true">error</span>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

const badgeTones = {
  green:  'bg-primary-container text-on-primary-container',
  red:    'bg-error-container text-on-error-container',
  orange: 'bg-amber-100 text-amber-900',
  slate:  'bg-surface-container-high text-on-surface-variant',
  violet: 'bg-violet-100 text-violet-900',
  sky:    'bg-sky-100 text-sky-900',
  teal:   'bg-tertiary-container text-on-tertiary-container',
} as const;

export function Badge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: keyof typeof badgeTones }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeTones[tone]}`}>
      {children}
    </span>
  );
}
