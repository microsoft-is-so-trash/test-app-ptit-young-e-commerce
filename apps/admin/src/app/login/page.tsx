'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../../lib/auth';

export default function LoginPage() {
  const { user, loading, error, loginAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [loading, router, user]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-5">
      <section className="w-full max-w-md rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-8 shadow-m3-2">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-on-primary shadow-m3-1">
            E
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">ECOllect</p>
            <h1 className="font-display text-2xl font-bold text-on-surface">Bảng vận hành</h1>
          </div>
        </div>
        <p className="mt-4 text-sm text-on-surface-variant">Đăng nhập vào tài khoản quản trị.</p>
        <button
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-on-primary shadow-m3-1 transition hover:shadow-m3-2 disabled:opacity-50"
          disabled={loading}
          onClick={() => void loginAdmin()}
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">login</span>
          {loading ? 'Đang đăng nhập…' : 'Đăng nhập quản trị'}
        </button>
        {error && <p className="mt-4 rounded-xl bg-error-container p-3 text-sm text-on-error-container" role="alert">{error}</p>}
        <p className="mt-6 text-xs text-on-surface-variant/60">
          Tài khoản: {process.env.NEXT_PUBLIC_ADMIN_ZALO_ID ?? 'zalo_admin_01'}
        </p>
      </section>
    </main>
  );
}
