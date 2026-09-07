'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AdminTransactionAnomaly } from '@eco-oil/shared-types';
import { api, ApiError } from '../lib/api';
import { formatDate, formatLiters, todayIso } from '../lib/dashboard-utils';
import { AdminShell } from './admin-shell';
import { Badge, EmptyState, ErrorState, Skeleton } from './ui';

const anomalyPresentation = {
  NORMAL: { label: 'Bình thường', className: 'bg-emerald-100 bg-primary-container text-on-primary-container' },
  REVIEW: { label: 'Cần kiểm tra', className: 'bg-orange-100 bg-amber-100 text-amber-900' },
  HIGH_RISK: { label: 'Rủi ro cao', className: 'bg-red-100 bg-error-container text-on-error-container' },
} as const;

const anomalyReasonLabels: Record<string, string> = {
  DENSITY_OUTLIER: 'Tỷ lệ kg/lít bất thường',
  MASS_OR_VOLUME_OUTLIER: 'Khối lượng hoặc thể tích lệch mạnh so với lịch sử',
  COLLECTION_TIME_OUTLIER: 'Thời gian thu gom khác thường',
  FREQUENCY_SPIKE: 'Tần suất giao dịch tăng đột biến',
};

export function TransactionAnomalySummary({ anomaly }: { anomaly?: AdminTransactionAnomaly }) {
  if (!anomaly) return null;
  const presentation = anomalyPresentation[anomaly.level];
  return (
    <div className="mt-2 rounded-xl border border-outline-variant/40 bg-surface-container p-3 text-xs text-on-surface-variant">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${presentation.className}`}>
          {presentation.label}
        </span>
        <span className="font-semibold text-on-surface">Điểm bất thường: {anomaly.score}/100</span>
      </div>
      <p className="mt-1">Mẫu lịch sử: {anomaly.historySize}</p>
      {anomaly.reasons.length > 0 ? (
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {anomaly.reasons.map((reason) => (
            <li key={reason}>{anomalyReasonLabels[reason] ?? 'Tín hiệu bất thường cần kiểm tra'}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ReconciliationView() {
  const [date, setDate] = useState(todayIso());
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const result = useQuery({ queryKey: ['reconciliation', date], queryFn: () => api.reconciliation(date) });
  const downloadCsv = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const csv = await api.reconciliationCsv(date);
      const excelCsv = csv.charCodeAt(0) === 0xfeff ? csv : `\uFEFF${csv}`;
      const url = URL.createObjectURL(new Blob([excelCsv], { type: 'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `eco-oil-reconciliation-${date}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof ApiError ? error.message : 'Không thể tải file đối soát.');
    } finally {
      setExporting(false);
    }
  };

  if (result.isLoading) return <AdminShell><Skeleton className="h-10 w-56" /><Skeleton className="mt-6 h-40" /><Skeleton className="mt-6 h-64" /></AdminShell>;
  if (result.error) return <AdminShell><ErrorState message={result.error instanceof ApiError ? result.error.message : 'Không thể tải dữ liệu đối soát.'} /></AdminShell>;
  if (!result.data) return <AdminShell><EmptyState /></AdminShell>;

  const data = result.data;
  const flagged = Math.abs(data.variance_kg_pct) > (data.variance_threshold_pct ?? 0.02);

  return (
    <AdminShell>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined filled text-3xl text-primary" aria-hidden="true">compare_arrows</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Đối soát 3 lớp theo khối lượng</p>
            <h2 className="font-display text-3xl font-bold text-on-surface">Ngày {date}</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm font-semibold text-on-surface-variant">
            Chọn ngày
            <input
              className="mt-1 block min-h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 transition focus:border-primary"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 font-bold text-on-primary shadow-m3-1 transition hover:shadow-m3-2 disabled:opacity-50"
            disabled={exporting}
            onClick={() => void downloadCsv()}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">download</span>
            {exporting ? 'Đang tạo file…' : 'Tải CSV'}
          </button>
        </div>
      </div>

      {exportError ? <p className="mt-3 text-sm text-error">{exportError}</p> : null}

      {/* KPI Cards */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-5 shadow-m3-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">output</span>
            <p className="text-sm text-on-surface-variant">Quán báo / thu gom</p>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-on-surface">{formatLiters(data.collected_liters)}</p>
          <p className="mt-1 text-sm text-on-surface-variant">{data.collected_kg.toFixed(2)} kg</p>
        </article>
        <article className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-5 shadow-m3-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">input</span>
            <p className="text-sm text-on-surface-variant">Đã nộp trạm</p>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-on-surface">{formatLiters(data.delivered_liters)}</p>
          <p className="mt-1 text-sm text-on-surface-variant">{data.delivered_kg.toFixed(2)} kg</p>
        </article>
        <article className={`rounded-2xl border p-5 shadow-m3-1 ${flagged ? 'border-error/30 bg-error-container/30' : 'border-primary/30 bg-primary-container/30'}`}>
          <div className="flex items-center gap-2">
            <span className={`material-symbols-outlined text-[20px] ${flagged ? 'text-error' : 'text-primary'}`} aria-hidden="true">
              {flagged ? 'warning' : 'check_circle'}
            </span>
            <p className="text-sm text-on-surface-variant">Chênh lệch theo kg</p>
          </div>
          <p className={`mt-2 font-display text-3xl font-bold ${flagged ? 'text-error' : 'text-primary'}`}>{data.variance_kg.toFixed(2)} kg</p>
          <p className="mt-1 text-sm">{(data.variance_kg_pct * 100).toFixed(2)}% · {flagged ? 'Cần kiểm tra' : 'Trong ngưỡng'}</p>
          {data.has_estimated_mass ? <p className="mt-1 text-xs text-amber-800">Có một đầu là số kg ước lượng, chưa cân.</p> : null}
        </article>
      </div>

      {/* By collector */}
      <section className="mt-6 rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-5 shadow-m3-1">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" aria-hidden="true">local_shipping</span>
          <h3 className="font-display text-lg font-bold">Theo người thu gom</h3>
        </div>
        {data.by_collector.length === 0 ? (
          <div className="mt-4"><EmptyState message="Ngày này chưa có dữ liệu đối soát." /></div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-outline-variant/40 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="pb-3">Người thu gom</th>
                  <th className="pb-3">Đã thu (lít / kg)</th>
                  <th className="pb-3">Đã nộp (lít / kg)</th>
                  <th className="pb-3">Lệch kg</th>
                  <th className="pb-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {data.by_collector.map((collector) => (
                  <tr key={collector.collector_id} className="border-b border-outline-variant/20 align-top last:border-0">
                    <td className="py-3 font-semibold">{collector.name}</td>
                    <td className="py-3">{formatLiters(collector.collected_l)} / {collector.collected_kg.toFixed(2)} kg</td>
                    <td className="py-3">{formatLiters(collector.delivered_l)} / {collector.delivered_kg.toFixed(2)} kg</td>
                    <td className={`py-3 ${collector.status === 'FLAGGED' ? 'font-bold text-error' : ''}`}>{collector.variance_kg.toFixed(2)} kg</td>
                    <td className="py-3">
                      <Badge tone={collector.status === 'FLAGGED' ? 'red' : 'green'}>{collector.status}</Badge>
                      {collector.has_estimated_mass ? <p className="mt-1 text-xs text-amber-700">Có số kg ước lượng</p> : null}
                      {collector.transactions.length > 0 && (
                        <details className="mt-2 text-xs font-normal">
                          <summary className="cursor-pointer font-semibold text-primary">Xem {collector.transactions.length} giao dịch</summary>
                          <div className="mt-2 space-y-2 text-on-surface-variant">
                            {collector.transactions.map((transaction) => (
                              <div key={transaction.id} className={transaction.suspected_adulteration ? 'font-semibold text-error' : ''}>
                                <p>{transaction.merchant_name}: {formatLiters(transaction.liters)} / {transaction.kilograms?.toFixed(2) ?? '—'} kg · Hạng {transaction.grade ?? '—'}{transaction.suspected_adulteration ? ' · Nghi ngờ pha lẫn' : ''} · {transaction.mass_source === 'SCALE' ? 'Đã cân' : 'Ước lượng'}{transaction.image_grade_suggestion ? ` · AI ảnh ${transaction.image_grade_suggestion} (${transaction.image_grade_confidence ?? '—'})${transaction.grade_decision_source === 'MANUAL_OVERRIDE_AI' ? ' · Đã đổi' : ''}` : ''} · {formatDate(transaction.collected_at)}</p>
                                <TransactionAnomalySummary anomaly={transaction.anomaly} />
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Undelivered */}
      <section className="mt-6 rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-5 shadow-m3-1">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-600" aria-hidden="true">pending_actions</span>
          <h3 className="font-display text-lg font-bold">Giao dịch chưa nộp trạm</h3>
        </div>
        {data.undelivered_transactions.length === 0 ? (
          <div className="mt-4"><EmptyState message="Không còn giao dịch chưa nộp trạm." /></div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-outline-variant/40 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="pb-3">Quán</th>
                  <th className="pb-3">Số lít</th>
                  <th className="pb-3">Số kg</th>
                  <th className="pb-3">Hạng</th>
                  <th className="pb-3">Thời gian</th>
                  <th className="pb-3">Bất thường</th>
                </tr>
              </thead>
              <tbody>
                {data.undelivered_transactions.map((transaction) => (
                  <tr key={transaction.id} className={`border-b border-outline-variant/20 align-top last:border-0 ${transaction.suspected_adulteration ? 'bg-error-container/20' : ''}`}>
                    <td className="py-3 font-semibold">{transaction.merchant_name}</td>
                    <td className="py-3">{formatLiters(transaction.liters)}</td>
                    <td className="py-3">{transaction.kilograms?.toFixed(2) ?? '—'} kg</td>
                    <td className="py-3 font-bold">{transaction.grade ?? '—'}{transaction.suspected_adulteration ? ' · Nghi ngờ pha lẫn' : ''}</td>
                    <td className="py-3 text-on-surface-variant">{formatDate(transaction.collected_at)}</td>
                    <td className="min-w-64 py-3"><TransactionAnomalySummary anomaly={transaction.anomaly} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
