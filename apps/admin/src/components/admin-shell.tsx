'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { isAdminUser } from '../lib/dashboard-utils';
import { Skeleton } from './ui';

const links = [
  ['/', 'Tổng quan', 'dashboard'],
  ['/payments', 'Thanh toán', 'account_balance_wallet'],
  ['/reconciliation', 'Đối soát', 'compare_arrows'],
  ['/ai-performance', 'Hiệu quả AI', 'psychology'],
  ['/alerts', 'Cảnh báo', 'notification_important'],
  ['/stations', 'Trạm', 'factory'],
  ['/wards', 'Phường / Địa bàn', 'map'],
  ['/merchants', 'Quán', 'storefront'],
  ['/containers', 'Quản lý can', 'inventory_2'],
  ['/approvals', 'Duyệt quán', 'how_to_reg'],
  ['/collectors', 'Người thu gom', 'local_shipping'],
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const pending = useQuery({
    queryKey: ['pending-merchants-count'],
    queryFn: () => api.merchants({ status: 'PENDING' }),
    enabled: Boolean(user),
  });
  useEffect(() => {
    if (!loading && !isAdminUser(user)) router.replace('/login');
  }, [loading, router, user]);
  if (loading || !user || user.role !== 'ADMIN')
    return (
      <main className="p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-6 h-40 w-full" />
      </main>
    );

  const initials = (user.name ?? 'QTV').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-surface text-on-surface md:flex">
      {/* ── Sidebar ── */}
      <aside className="w-full border-b border-outline-variant/40 bg-surface-container-low p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r md:p-5">
        {/* Brand */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-display text-lg font-bold text-on-primary">
              E
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                ECOllect
              </p>
              <h1 className="font-display text-lg font-bold text-on-surface">Vận hành</h1>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="grid grid-cols-2 gap-1 md:block md:space-y-0.5">
          {links.map(([href, label, icon]) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${
                    isActive ? 'filled' : ''
                  }`}
                  aria-hidden="true"
                >
                  {icon}
                </span>
                <span className="flex-1 truncate">{label}</span>
                {href === '/approvals' && pending.data && pending.data.meta.total > 0 ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-[10px] font-bold text-on-error">
                    {pending.data.meta.total}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ── Main Area ── */}
      <div className="min-w-0 flex-1">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-outline-variant/40 bg-surface-container-lowest px-5 py-3.5 md:px-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant/60">
              Bảng điều hành
            </p>
            <p className="font-display text-base font-semibold text-on-surface">
              Xin chào, {user.name ?? 'Quản trị viên'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container">
              {initials}
            </div>
            <button
              className="flex min-h-10 items-center gap-2 rounded-xl border border-outline-variant px-4 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container-high"
              onClick={() => {
                void signOut().then(() => router.replace('/login'));
              }}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">logout</span>
              Đăng xuất
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
