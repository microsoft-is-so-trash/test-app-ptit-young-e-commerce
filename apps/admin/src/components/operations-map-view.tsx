'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  AdminActiveRoute,
  AdminOperationsMapResponse,
  AdminOperationsMapWard,
  MerchantEfficiencyLevel,
} from '@eco-oil/shared-types';
import { api, ApiError } from '../lib/api';
import { AdminShell } from './admin-shell';
import { EmptyState, ErrorState, Skeleton, Badge } from './ui';
import {
  LEVEL_COLOR,
  LEVEL_LABEL,
  OperationsMapCanvas,
  REASON_LABEL,
  formatLiters,
} from './operations-map-canvas';

const REFRESH_MS = 60_000;

export function OperationsMapView() {
  const [wardId, setWardId] = useState('');
  const [onlyAtRisk, setOnlyAtRisk] = useState(false);
  const [showWardZones, setShowWardZones] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);

  const map = useQuery({
    queryKey: ['operations-map', wardId, onlyAtRisk],
    queryFn: () => api.operationsMap({ ward_id: wardId || undefined, only_at_risk: onlyAtRisk }),
    refetchInterval: REFRESH_MS,
  });

  if (map.isLoading)
    return (
      <AdminShell>
        <Skeleton className="h-10 w-64" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-28" />
          ))}
        </div>
        <Skeleton className="mt-6 h-[620px]" />
      </AdminShell>
    );

  if (map.error)
    return (
      <AdminShell>
        <ErrorState
          message={
            map.error instanceof ApiError
              ? map.error.message
              : 'Không thể tải bản đồ vận hành. Vui lòng thử lại.'
          }
        />
      </AdminShell>
    );

  if (!map.data)
    return (
      <AdminShell>
        <EmptyState />
      </AdminShell>
    );

  const data = map.data;

  return (
    <AdminShell>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined filled text-3xl text-primary" aria-hidden="true">
            pin_drop
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Toàn cảnh hệ thống
            </p>
            <h2 className="font-display text-3xl font-bold text-on-surface">Bản đồ vận hành</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="ward-filter">
            Lọc theo khu vực
          </label>
          <select
            id="ward-filter"
            className="min-h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm font-semibold text-on-surface"
            value={wardId}
            onChange={(event) => setWardId(event.target.value)}
          >
            <option value="">Tất cả khu vực</option>
            {data.wards.map((ward) => (
              <option key={ward.id} value={ward.id}>
                {ward.name} — {ward.district}
              </option>
            ))}
          </select>
          <button
            className="flex min-h-11 items-center gap-2 rounded-xl border border-outline-variant px-4 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container-high"
            onClick={() => void map.refetch()}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              refresh
            </span>
            Làm mới
          </button>
        </div>
      </header>

      <div className="mt-6">
        <MapKpiCards data={data} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-4 shadow-m3-1">
          <MapToolbar
            onlyAtRisk={onlyAtRisk}
            showWardZones={showWardZones}
            showRoutes={showRoutes}
            onToggleAtRisk={setOnlyAtRisk}
            onToggleWardZones={setShowWardZones}
            onToggleRoutes={setShowRoutes}
          />
          <div className="mt-3">
            {data.merchants.length === 0 ? (
              <EmptyState
                message={
                  onlyAtRisk
                    ? 'Không có điểm nào đang ở mức cảnh báo. Bỏ bộ lọc để xem toàn bộ.'
                    : 'Chưa có quán nào được duyệt kèm toạ độ trong khu vực này.'
                }
              />
            ) : (
              <OperationsMapCanvas
                merchants={data.merchants}
                wards={data.wards}
                stations={data.stations}
                routes={data.routes}
                showWardZones={showWardZones}
                showRoutes={showRoutes}
              />
            )}
          </div>
          <MapLegend />
        </section>

        <div className="grid gap-6 content-start">
          <ActiveRoutesPanel routes={data.routes} />
          <WardStatsPanel wards={data.wards} />
          <AtRiskPanel data={data} />
        </div>
      </div>

      <p className="mt-5 text-xs text-on-surface-variant">
        Cập nhật lúc {new Date(data.generated_at).toLocaleTimeString('vi-VN')} · tự làm mới mỗi 60 giây.
        Vùng khu vực vẽ theo tâm phường vì bảng phường chưa có dữ liệu ranh giới.
      </p>
    </AdminShell>
  );
}

function MapKpiCards({ data }: { data: AdminOperationsMapResponse }) {
  const cards = [
    {
      label: 'Dầu dự kiến thu được',
      value: formatLiters(data.totals.expected_liters),
      hint: `${formatLiters(data.totals.ready_order_liters)} quán đã báo · ${formatLiters(data.totals.forecast_liters)} AI dự báo`,
      icon: 'water_drop',
      tone: 'bg-primary-container text-on-primary-container',
      valueClass: 'text-primary',
    },
    {
      label: 'Quán trên bản đồ',
      value: data.totals.merchants_mapped.toLocaleString('vi-VN'),
      hint: `${data.wards.length} khu vực đang hoạt động`,
      icon: 'storefront',
      tone: 'bg-secondary-container text-on-secondary-container',
      valueClass: 'text-secondary',
    },
    {
      label: 'Tuyến đang hoạt động',
      value: data.totals.active_routes.toLocaleString('vi-VN'),
      hint: `${data.routes.reduce((sum, route) => sum + route.stop_count - route.completed_stop_count, 0)} điểm còn phải ghé`,
      icon: 'local_shipping',
      tone: 'bg-tertiary-container text-on-tertiary-container',
      valueClass: 'text-tertiary',
    },
    {
      label: 'Điểm cần cảnh báo',
      value: data.totals.at_risk_merchants.toLocaleString('vi-VN'),
      hint:
        data.totals.at_risk_merchants > 0
          ? 'Quá hạn, ít dầu mỗi lượt hoặc đang có cảnh báo'
          : 'Không có điểm nào ở mức cảnh báo',
      icon: 'warning',
      tone:
        data.totals.at_risk_merchants > 0
          ? 'bg-error-container text-on-error-container'
          : 'bg-primary-container text-on-primary-container',
      valueClass: data.totals.at_risk_merchants > 0 ? 'text-error' : 'text-primary',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.label}
          className="flex items-start gap-4 rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-5 shadow-m3-1"
        >
          <span
            className={`material-symbols-outlined filled flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${card.tone}`}
            aria-hidden="true"
          >
            {card.icon}
          </span>
          <div className="min-w-0">
            <p className="text-sm text-on-surface-variant">{card.label}</p>
            <p className={`mt-1 font-display text-2xl font-bold tracking-tight ${card.valueClass}`}>
              {card.value}
            </p>
            <p className="mt-0.5 text-xs text-on-surface-variant">{card.hint}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

interface MapToolbarProps {
  onlyAtRisk: boolean;
  showWardZones: boolean;
  showRoutes: boolean;
  onToggleAtRisk: (next: boolean) => void;
  onToggleWardZones: (next: boolean) => void;
  onToggleRoutes: (next: boolean) => void;
}

function MapToolbar({
  onlyAtRisk,
  showWardZones,
  showRoutes,
  onToggleAtRisk,
  onToggleWardZones,
  onToggleRoutes,
}: MapToolbarProps) {
  const toggles = [
    { label: 'Vùng khu vực', active: showWardZones, onChange: onToggleWardZones, icon: 'blur_circular' },
    { label: 'Tuyến đang chạy', active: showRoutes, onChange: onToggleRoutes, icon: 'route' },
    { label: 'Chỉ điểm cảnh báo', active: onlyAtRisk, onChange: onToggleAtRisk, icon: 'warning' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {toggles.map((toggle) => (
        <button
          key={toggle.label}
          aria-pressed={toggle.active}
          onClick={() => toggle.onChange(!toggle.active)}
          className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition ${
            toggle.active
              ? 'border-primary bg-primary-container text-on-primary-container'
              : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            {toggle.icon}
          </span>
          {toggle.label}
        </button>
      ))}
    </div>
  );
}

function MapLegend() {
  const levels: MerchantEfficiencyLevel[] = ['HEALTHY', 'WATCH', 'AT_RISK', 'INSUFFICIENT_DATA'];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl bg-surface-container-low px-4 py-3">
      {levels.map((level) => (
        <span key={level} className="flex items-center gap-2 text-sm text-on-surface-variant">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: LEVEL_COLOR[level] }}
            aria-hidden="true"
          />
          {LEVEL_LABEL[level]}
        </span>
      ))}
      <span className="flex items-center gap-2 text-sm text-on-surface-variant">
        <span className="h-3 w-3 shrink-0 rounded-[3px] bg-tertiary" aria-hidden="true" />
        Trạm tập kết
      </span>
      <span className="flex items-center gap-2 text-sm text-on-surface-variant">
        <span className="h-0.5 w-6 shrink-0 rounded bg-[#1d4ed8]" aria-hidden="true" />
        Tuyến thu gom
      </span>
    </div>
  );
}

function ActiveRoutesPanel({ routes }: { routes: AdminActiveRoute[] }) {
  return (
    <section className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-5 shadow-m3-1">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary" aria-hidden="true">route</span>
        <h3 className="font-display text-lg font-bold">Tuyến đang hoạt động</h3>
      </div>
      {routes.length === 0 ? (
        <p className="mt-4 text-sm text-on-surface-variant">
          Chưa có tuyến nào đang chạy. Tuyến sẽ hiện khi người thu gom bắt đầu ca.
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          {routes.map((route) => {
            const progress = route.stop_count === 0 ? 0 : (route.completed_stop_count / route.stop_count) * 100;
            return (
              <article key={route.id} className="rounded-xl border border-outline-variant/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-on-surface">{route.collector_name}</p>
                  <Badge tone="green">Đang thu gom</Badge>
                </div>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {route.completed_stop_count}/{route.stop_count} điểm ·{' '}
                  {formatLiters(route.total_expected_liters)} dự kiến
                </p>
                <div
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high"
                  role="progressbar"
                  aria-valuenow={Math.round(progress)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Tiến độ tuyến của ${route.collector_name}`}
                >
                  <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-2 text-xs text-on-surface-variant">
                  Bắt đầu {new Date(route.started_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ·
                  còn trống {formatLiters(route.remaining_capacity_l)}/{formatLiters(route.vehicle_capacity_l)}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function WardStatsPanel({ wards }: { wards: AdminOperationsMapWard[] }) {
  return (
    <section className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-5 shadow-m3-1">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary" aria-hidden="true">map</span>
        <h3 className="font-display text-lg font-bold">Thống kê theo khu vực</h3>
      </div>
      {wards.length === 0 ? (
        <p className="mt-4 text-sm text-on-surface-variant">Chưa có khu vực nào đang hoạt động.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[380px] text-left text-sm">
            <thead className="border-b border-outline-variant/40 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="pb-3">Khu vực</th>
                <th className="pb-3">Quán</th>
                <th className="pb-3">Dự kiến</th>
                <th className="pb-3">Vận hành</th>
              </tr>
            </thead>
            <tbody>
              {wards.map((ward) => (
                <tr key={ward.id} className="border-b border-outline-variant/20 last:border-0">
                  <td className="py-3">
                    <span className="font-semibold text-on-surface">{ward.name}</span>
                    <span className="block text-xs text-on-surface-variant">{ward.district}</span>
                  </td>
                  <td className="py-3 text-on-surface-variant">{ward.merchant_count}</td>
                  <td className="py-3 font-semibold">{formatLiters(ward.expected_liters)}</td>
                  <td className="py-3">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: LEVEL_COLOR[ward.efficiency_level] }}
                        aria-hidden="true"
                      />
                      {LEVEL_LABEL[ward.efficiency_level]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AtRiskPanel({ data }: { data: AdminOperationsMapResponse }) {
  const atRisk = data.merchants
    .filter((merchant) => merchant.efficiency_level === 'AT_RISK')
    .sort((left, right) => right.efficiency_score - left.efficiency_score)
    .slice(0, 6);

  return (
    <section className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-5 shadow-m3-1">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-error" aria-hidden="true">warning</span>
        <h3 className="font-display text-lg font-bold">Điểm cần xử lý trước</h3>
      </div>
      {atRisk.length === 0 ? (
        <p className="mt-4 text-sm text-on-surface-variant">
          Không có điểm nào ở mức cảnh báo trong phạm vi đang xem.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {atRisk.map((merchant) => (
            <li key={merchant.id} className="rounded-xl border border-error/20 bg-error-container/20 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-on-surface">{merchant.name}</p>
                <span className="shrink-0 text-xs font-bold text-error">{merchant.efficiency_score} điểm</span>
              </div>
              <p className="mt-0.5 text-xs text-on-surface-variant">{merchant.ward_name}</p>
              <p className="mt-1 text-xs text-on-surface-variant">
                {merchant.efficiency_reasons
                  .map((code) => REASON_LABEL[code] ?? code)
                  .join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
