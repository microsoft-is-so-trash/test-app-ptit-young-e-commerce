'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminAiAnomalyItem, AdminAlert, AnomalyFeedbackVerdict } from '@eco-oil/shared-types';
import React, { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { formatDate } from '../lib/dashboard-utils';
import { AdminShell } from './admin-shell';
import { Badge, EmptyState, ErrorState, Skeleton } from './ui';

const ALERT_LABELS: Record<string, string> = {
  GEO_MISMATCH: 'Sai vị trí',
  DELIVERY_VARIANCE: 'Lệch nộp trạm',
  COLLECTION_LITERS_DEVIATION: 'Lệch số lít so với quán báo',
  CONTAINER_TRANSIT_CANCELLED: 'Đã huỷ ca vận chuyển của can',
  MASS_ESTIMATED_NOT_WEIGHED: 'Giao dịch chưa được cân, dùng số kg ước lượng',
  SUSPECTED_ADULTERATION: 'Nghi ngờ pha lẫn dầu',
  OIL_GRADE_C: 'Dầu hạng C',
  STATION_FILL_FORECAST: 'Dự báo đầy trạm',
};

function alertLabel(type: string): string {
  return ALERT_LABELS[type] ?? type;
}

type StationFillAlertDetails = {
  station_id?: string;
  station_name?: string;
  forecast_status?: 'FULL' | 'CRITICAL' | 'WATCH';
  estimated_days_until_full?: number | null;
};

function readStationFillAlertDetails(value: unknown): StationFillAlertDetails {
  if (!value || typeof value !== 'object') return {};
  const details = value as Record<string, unknown>;
  const status = details.forecast_status;
  return {
    station_id: typeof details.station_id === 'string' ? details.station_id : undefined,
    station_name: typeof details.station_name === 'string' ? details.station_name : undefined,
    forecast_status: status === 'FULL' || status === 'CRITICAL' || status === 'WATCH' ? status : undefined,
    estimated_days_until_full:
      typeof details.estimated_days_until_full === 'number' && Number.isFinite(details.estimated_days_until_full)
        ? details.estimated_days_until_full
        : details.estimated_days_until_full === null
          ? null
          : undefined,
  };
}

export function AlertListItem({ alert, onResolve, resolvePending }: { alert: AdminAlert; onResolve: (id: string) => void; resolvePending: boolean }) {
  const alertType = String(alert.type);
  const isStationFillAlert = alertType === 'STATION_FILL_FORECAST';
  const forecastDetails = isStationFillAlert ? readStationFillAlertDetails(alert.details) : {};
  const stationLabel = forecastDetails.station_name || forecastDetails.station_id || 'Trạm chưa xác định';
  const severityLabel = alert.severity === 'HIGH' ? 'Cần xử lý' : alert.severity === 'MEDIUM' ? 'Theo dõi' : alert.severity;

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-m3-1 transition-shadow hover:shadow-m3-2 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`material-symbols-outlined text-[20px] ${isStationFillAlert ? 'text-amber-600' : 'text-error'}`} aria-hidden="true">
            {isStationFillAlert ? 'factory' : alertType === 'GEO_MISMATCH' ? 'wrong_location' : alertType === 'SUSPECTED_ADULTERATION' ? 'science' : 'warning'}
          </span>
          <Badge tone={isStationFillAlert ? 'orange' : alertType === 'COLLECTION_LITERS_DEVIATION' || alertType === 'DELIVERY_VARIANCE' ? 'orange' : 'red'}>
            {alertLabel(alertType)}
          </Badge>
          {isStationFillAlert && <Badge tone="slate">Trạm: {stationLabel}</Badge>}
          {isStationFillAlert && forecastDetails.forecast_status && (
            <Badge tone={forecastDetails.forecast_status === 'FULL' || forecastDetails.forecast_status === 'CRITICAL' ? 'red' : 'orange'}>
              {forecastDetails.forecast_status}
            </Badge>
          )}
          {alert.severity && (
            <Badge tone={alert.severity === 'HIGH' ? 'red' : 'orange'}>
              {isStationFillAlert ? severityLabel : alert.severity}
            </Badge>
          )}
          {alert.resolved_at && <Badge tone="green">Đã xử lý</Badge>}
        </div>
        {isStationFillAlert && forecastDetails.estimated_days_until_full !== undefined && forecastDetails.estimated_days_until_full !== null && (
          <p className="mt-2 text-sm font-semibold text-on-surface">
            Dự kiến đầy sau: {forecastDetails.estimated_days_until_full} ngày
          </p>
        )}
        <p className="mt-2 font-semibold text-on-surface">{alert.message ?? 'Cảnh báo cần kiểm tra'}</p>
        <p className="mt-1 text-sm text-on-surface-variant">{formatDate(alert.created_at)}</p>
      </div>
      {!alert.resolved_at && (
        <button
          type="button"
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-on-surface px-4 text-sm font-semibold text-inverse-on-surface shadow-m3-1 transition hover:shadow-m3-2 disabled:opacity-50"
          disabled={resolvePending}
          onClick={() => onResolve(alert.id)}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">check_circle</span>
          Đánh dấu đã xử lý
        </button>
      )}
    </article>
  );
}

const verdictLabels: Record<AnomalyFeedbackVerdict, string> = { CONFIRMED_ANOMALY: 'Xác nhận bất thường', FALSE_POSITIVE: 'Cảnh báo nhầm', UNSURE: 'Chưa chắc chắn' };

function anomalyTone(level: AdminAiAnomalyItem['risk_level']): 'red' | 'orange' {
  return level === 'HIGH_RISK' ? 'red' : 'orange';
}

const EVIDENCE_LABELS: Record<string, string> = {
  actual_density: 'Mật độ thực tế',
  expected_density: 'Mật độ chuẩn',
  relative_deviation_percent: 'Mức sai lệch',
  mass_source: 'Nguồn khối lượng',
  value: 'Giá trị hiện tại',
  median: 'Trung vị lịch sử',
  mad: 'Độ lệch tuyệt đối trung vị',
  robust_z_score: 'Robust Z-score',
  sample_size: 'Số mẫu',
  fallback: 'Phương pháp đánh giá',
  source: 'Nguồn baseline',
};

function formatEvidenceValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (key === 'mass_source') {
    if (value === 'SCALE') return 'Đã cân';
    if (value === 'ESTIMATED_FROM_VOLUME') return 'Ước lượng từ thể tích';
  }
  if (key === 'fallback') {
    if (value === 'CONFIGURED_DENSITY_BASELINE') return 'Baseline mật độ cấu hình';
    if (value === 'ZERO_MAD_RELATIVE_DEVIATION') return 'Độ lệch tương đối khi MAD bằng 0';
    if (value === 'INSUFFICIENT_HISTORY') return 'Chưa đủ lịch sử';
  }
  if (key === 'source') {
    if (value === 'DOMAIN_DENSITY_BASELINE') return 'Baseline mật độ nghiệp vụ';
    if (value === 'SCALE_HISTORY_BASELINE') return 'Baseline lịch sử cân';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    if (key === 'relative_deviation_percent') return `${value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
    if (key === 'actual_density' || key === 'expected_density' || key === 'density_factor') return `${value.toLocaleString('vi-VN', { maximumFractionDigits: 3 })} kg/lít`;
    return value.toLocaleString('vi-VN', { maximumFractionDigits: 3 });
  }
  return typeof value === 'string' ? value : null;
}

export function formatAnomalyEvidence(evidence: Record<string, unknown>): Array<{ label: string; value: string }> {
  return Object.entries(evidence).flatMap(([key, value]) => {
    const formatted = formatEvidenceValue(key, value);
    return formatted === null ? [] : [{ label: EVIDENCE_LABELS[key] ?? key, value: formatted }];
  });
}

function AnomalyEvidence({ evidence }: { evidence: Record<string, unknown> }) {
  const values = formatAnomalyEvidence(evidence);
  if (values.length === 0) return null;
  return (
    <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs text-on-surface-variant sm:grid-cols-2">
      {values.map(({ label, value }) => (
        <div key={label} className="min-w-0">
          <dt className="inline font-semibold text-on-surface">{label}: </dt>
          <dd className="inline break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AiAnomalyListItem({ item, onSave, saving, saveError, saveSuccess }: { item: AdminAiAnomalyItem; onSave: (transactionId: string, verdict: AnomalyFeedbackVerdict, note: string) => void; saving: boolean; saveError?: string | null; saveSuccess?: boolean }) {
  const [open, setOpen] = useState(false);
  const [verdict, setVerdict] = useState<AnomalyFeedbackVerdict>(item.feedback?.verdict ?? ('UNSURE' as AnomalyFeedbackVerdict));
  const [note, setNote] = useState(item.feedback?.note ?? '');
  useEffect(() => {
    setVerdict(item.feedback?.verdict ?? ('UNSURE' as AnomalyFeedbackVerdict));
    setNote(item.feedback?.note ?? '');
  }, [item.feedback?.note, item.feedback?.verdict]);
  const feedbackLabel = item.feedback ? verdictLabels[item.feedback.verdict] : 'Chưa đánh giá';

  return (
    <article className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5 shadow-m3-1">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-violet-600" aria-hidden="true">psychology</span>
            <Badge tone="violet">Bất thường AI</Badge>
            <Badge tone={anomalyTone(item.risk_level)}>
              {item.risk_level === 'HIGH_RISK' ? 'Rủi ro cao' : 'Cần kiểm tra'}
            </Badge>
            <Badge tone={item.feedback ? 'green' : 'slate'}>{feedbackLabel}</Badge>
          </div>
          <p className="mt-2 font-semibold text-on-surface">{item.merchant_name} · Điểm {item.risk_score}/100</p>
          <p className="mt-1 text-sm text-on-surface-variant">{item.explanation_summary}</p>
          <p className="mt-1 text-xs text-on-surface-variant/70">{formatDate(item.collected_at)} · Lịch sử: {item.history_size} mẫu</p>
        </div>
        <button
          type="button"
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-violet-300 bg-surface-container-lowest px-4 text-sm font-semibold text-violet-800 transition hover:bg-violet-100"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{open ? 'expand_less' : 'expand_more'}</span>
          {open ? 'Ẩn giải thích' : 'Xem giải thích'}
        </button>
      </div>

      {open && (
        <div role="dialog" aria-label={`Giải thích giao dịch ${item.transaction_id}`} className="mt-4 rounded-2xl border border-violet-200 bg-surface-container-lowest p-5">
          <p className="text-sm font-semibold text-on-surface">Vì sao cần kiểm tra?</p>
          <div className="mt-2 space-y-2">
            {item.reason_codes.map((reason) => (
              <div key={reason.code} className="rounded-xl bg-surface-container p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{reason.label}</span>
                  <Badge tone={reason.severity === 'HIGH' ? 'red' : reason.severity === 'MEDIUM' ? 'orange' : 'slate'}>
                    {reason.severity}
                  </Badge>
                  <span className="text-on-surface-variant">
                    {reason.contribution === null ? 'Đóng góp: chưa xác định' : `Đóng góp: ${reason.contribution} điểm`}
                  </span>
                </div>
                <p className="mt-1 text-on-surface-variant">{reason.description}</p>
                <AnomalyEvidence evidence={reason.evidence} />
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr]">
            <label className="text-sm font-semibold text-on-surface-variant">
              Đánh giá
              <select
                className="mt-1 block min-h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 transition focus:border-primary"
                value={verdict}
                onChange={(event) => setVerdict(event.target.value as AnomalyFeedbackVerdict)}
              >
                {Object.entries(verdictLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-on-surface-variant">
              Ghi chú
              <textarea
                spellCheck={false}
                className="mt-1 block min-h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-3 transition focus:border-primary"
                value={note}
                maxLength={2000}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
          </div>

          {saveError && (
            <p role="alert" className="mt-3 flex items-center gap-2 rounded-xl bg-error-container p-3 text-sm text-on-error-container">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">error</span>
              {saveError}
            </p>
          )}
          {saveSuccess && (
            <p role="status" className="mt-3 flex items-center gap-2 rounded-xl bg-primary-container p-3 text-sm text-on-primary-container">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">check_circle</span>
              Đã lưu đánh giá
            </p>
          )}

          <button
            type="button"
            className="mt-3 flex min-h-11 items-center gap-2 rounded-xl bg-on-surface px-4 py-2 text-sm font-semibold text-inverse-on-surface shadow-m3-1 transition hover:shadow-m3-2 disabled:opacity-50"
            disabled={saving}
            onClick={() => onSave(item.transaction_id, verdict, note)}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">save</span>
            {saving ? 'Đang lưu…' : 'Lưu đánh giá'}
          </button>
        </div>
      )}
    </article>
  );
}

function feedbackErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.code ? `${error.message} (${error.code})` : error.message;
  return 'Không thể lưu đánh giá. Vui lòng thử lại.';
}

export function AlertsView() {
  const [type, setType] = useState('');
  const [resolved, setResolved] = useState('');
  const [savingTransactionId, setSavingTransactionId] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<{ transactionId: string; message: string } | null>(null);
  const [feedbackSuccessId, setFeedbackSuccessId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const alerts = useQuery({ queryKey: ['alerts', type, resolved], queryFn: () => api.alerts({ type: type && type !== 'AI_ANOMALY' ? type : undefined, resolved: resolved === '' ? undefined : resolved === 'true', page: 1, limit: 100 }) });
  const aiAnomalies = useQuery({ queryKey: ['ai-anomalies', 90], queryFn: () => api.aiAnomalies({ window_days: 90, page: 1, limit: 100 }), enabled: type === '' || type === 'AI_ANOMALY' });
  const resolve = useMutation({ mutationFn: (id: string) => api.resolveAlert(id), onMutate: async (id) => { await queryClient.cancelQueries({ queryKey: ['alerts'] }); const keys = queryClient.getQueryCache().findAll({ queryKey: ['alerts'] }); keys.forEach((query) => queryClient.setQueryData<{ data: AdminAlert[]; meta: unknown }>(query.queryKey, (old) => old ? { ...old, data: old.data.map((alert) => alert.id === id ? { ...alert, resolved_at: new Date().toISOString() } : alert) } : old)); } });
  const feedback = useMutation({
    mutationFn: ({ transactionId, verdict, note }: { transactionId: string; verdict: AnomalyFeedbackVerdict; note: string }) => api.updateAiAnomalyFeedback(transactionId, { verdict, note: note || undefined }),
    onMutate: ({ transactionId }) => {
      setSavingTransactionId(transactionId);
      setFeedbackError(null);
      setFeedbackSuccessId(null);
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ai-anomalies'] }),
        queryClient.invalidateQueries({ queryKey: ['ai-anomaly-performance'] }),
      ]);
      setFeedbackSuccessId(variables.transactionId);
    },
    onError: (error, variables) => {
      setFeedbackError({ transactionId: variables.transactionId, message: feedbackErrorMessage(error) });
    },
    onSettled: () => setSavingTransactionId(null),
  });

  if (alerts.isLoading || aiAnomalies.isLoading) return <AdminShell><Skeleton className="h-10 w-56" /><Skeleton className="mt-6 h-96" /></AdminShell>;
  if (alerts.error) return <AdminShell><ErrorState message={alerts.error instanceof ApiError ? alerts.error.message : 'Không thể tải cảnh báo.'} /></AdminShell>;

  const filteredAi = (aiAnomalies.data?.data ?? []).filter((item) => resolved === '' || (resolved === 'true' ? item.feedback !== null : item.feedback === null));
  const showAiError = (type === '' || type === 'AI_ANOMALY') && aiAnomalies.error;

  return (
    <AdminShell>
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined filled text-3xl text-primary" aria-hidden="true">notification_important</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Theo dõi bất thường</p>
          <h2 className="font-display text-3xl font-bold text-on-surface">Cảnh báo</h2>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-3">
        <select
          className="min-h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm transition focus:border-primary"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="">Tất cả loại</option>
          <option value="AI_ANOMALY">Bất thường AI</option>
          <option value="GEO_MISMATCH">Sai vị trí</option>
          <option value="DELIVERY_VARIANCE">Lệch nộp trạm</option>
          <option value="COLLECTION_LITERS_DEVIATION">Lệch số lít so với quán báo</option>
          <option value="CONTAINER_TRANSIT_CANCELLED">Đã huỷ ca vận chuyển của can</option>
          <option value="MASS_ESTIMATED_NOT_WEIGHED">Giao dịch chưa được cân, dùng số kg ước lượng</option>
          <option value="SUSPECTED_ADULTERATION">Nghi ngờ pha lẫn dầu</option>
          <option value="OIL_GRADE_C">Dầu hạng C</option>
        </select>
        <select
          className="min-h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm transition focus:border-primary"
          value={resolved}
          onChange={(event) => setResolved(event.target.value)}
        >
          <option value="false">Chưa xử lý</option>
          <option value="true">Đã xử lý</option>
          <option value="">Tất cả trạng thái</option>
        </select>
      </div>

      {/* AI error */}
      {showAiError && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-error/20 bg-error-container p-4 text-sm text-on-error-container">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">error</span>
          Không thể tải cảnh báo AI.{' '}
          <button type="button" className="font-semibold underline" onClick={() => void aiAnomalies.refetch()}>Thử lại</button>
        </div>
      )}

      {/* Alerts list */}
      <section className="mt-5 space-y-3">
        {(type === '' || type === 'AI_ANOMALY') && filteredAi.map((item) => (
          <AiAnomalyListItem
            key={item.id}
            item={item}
            saving={savingTransactionId === item.transaction_id}
            saveError={feedbackError?.transactionId === item.transaction_id ? feedbackError.message : null}
            saveSuccess={feedbackSuccessId === item.transaction_id}
            onSave={(transactionId, verdict, note) => feedback.mutate({ transactionId, verdict, note })}
          />
        ))}
        {type !== 'AI_ANOMALY' && alerts.data?.data.map((alert) => (
          <AlertListItem key={alert.id} alert={alert} resolvePending={resolve.isPending} onResolve={(id) => resolve.mutate(id)} />
        ))}
        {filteredAi.length === 0 && (type === 'AI_ANOMALY' || (type === '' && !alerts.data?.data.length)) ? (
          <EmptyState message="Không có cảnh báo phù hợp." />
        ) : null}
        {type !== 'AI_ANOMALY' && type !== '' && !alerts.data?.data.length ? (
          <EmptyState message="Không có cảnh báo phù hợp." />
        ) : null}
      </section>
    </AdminShell>
  );
}
