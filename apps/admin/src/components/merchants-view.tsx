'use client';

import type { AdminMerchantSummary } from '@eco-oil/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { formatDate, formatLiters } from '../lib/dashboard-utils';
import { validateMerchantEdit, type MerchantEditFormValues } from '../lib/merchant-edit';
import { AdminShell } from './admin-shell';
import { Badge, EmptyState, ErrorState, Skeleton } from './ui';

function valuesForMerchant(merchant: AdminMerchantSummary): MerchantEditFormValues {
  return {
    name: merchant.name,
    phone: merchant.phone ?? '',
    address: merchant.address ?? '',
    businessType: merchant.business_type ?? '',
    wardId: merchant.ward_id,
    lat: merchant.lat?.toString() ?? '',
    lng: merchant.lng?.toString() ?? '',
  };
}

export function MerchantsView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [anomaly, setAnomaly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminMerchantSummary | null>(null);
  const [form, setForm] = useState<MerchantEditFormValues | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const result = useQuery({
    queryKey: ['merchants', search, anomaly],
    queryFn: () => api.merchants({ search: search || undefined, anomaly: anomaly || undefined }),
  });
  const wards = useQuery({ queryKey: ['wards', false], queryFn: () => api.wards(false) });
  const containers = useQuery({
    queryKey: ['merchant-containers', selectedId],
    queryFn: () => api.containers({ merchant_id: selectedId ?? undefined }),
    enabled: Boolean(selectedId),
  });
  const updateMerchant = useMutation({
    mutationFn: ({ id, values }: { id: string; values: MerchantEditFormValues }) => {
      const validated = validateMerchantEdit(values);
      if (!validated.ok) throw new Error(validated.message);
      return api.updateMerchant(id, validated.payload);
    },
    onSuccess: async (_response, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['merchants'] }),
        queryClient.invalidateQueries({ queryKey: ['merchant-containers'] }),
        queryClient.invalidateQueries({ queryKey: ['overview'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-merchants'] }),
      ]);
      setSuccess(`Đã cập nhật quán ${variables.values.name.trim()}.`);
      setEditing(null);
      setForm(null);
      setFormError(null);
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : 'Không thể cập nhật quán.');
    },
  });

  const selectedMerchant = result.data?.data.find((merchant) => merchant.id === selectedId);

  function openEditor(merchant: AdminMerchantSummary): void {
    setEditing(merchant);
    setForm(valuesForMerchant(merchant));
    setFormError(null);
    setSuccess(null);
  }

  function change<K extends keyof MerchantEditFormValues>(key: K, value: MerchantEditFormValues[K]): void {
    setForm((current) => current ? { ...current, [key]: value } : current);
  }

  function closeEditor(): void {
    setEditing(null);
    setForm(null);
    setFormError(null);
  }

  function submitEdit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!editing || !form || updateMerchant.isPending) return;
    const validated = validateMerchantEdit(form);
    if (!validated.ok) {
      setFormError(validated.message);
      return;
    }
    setFormError(null);
    updateMerchant.mutate({ id: editing.id, values: form });
  }

  if (result.isLoading) return <AdminShell><Skeleton className="h-10 w-48" /><Skeleton className="mt-6 h-96" /></AdminShell>;
  if (result.error) return <AdminShell><ErrorState message={result.error instanceof ApiError ? result.error.message : 'Không thể tải danh sách quán.'} /></AdminShell>;

  return (
    <AdminShell>
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined filled text-3xl text-primary" aria-hidden="true">storefront</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Mạng lưới điểm thu gom</p>
          <h2 className="font-display text-3xl font-bold text-on-surface">Quán</h2>
        </div>
      </div>

      {success ? (
        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-primary-container p-3 text-sm font-semibold text-on-primary-container" role="status">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">check_circle</span>
          {success}
        </p>
      ) : null}

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-3">
        <input
          className="min-h-11 min-w-64 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-on-surface transition focus:border-primary"
          placeholder="Tìm tên quán…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface-variant">
          <input type="checkbox" checked={anomaly} onChange={(event) => setAnomaly(event.target.checked)} className="accent-primary" />
          Chỉ hiện bất thường
        </label>
      </div>

      {/* Table */}
      <section className="mt-5 rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-5 shadow-m3-1">
        {!result.data?.data.length ? <EmptyState message="Không tìm thấy quán phù hợp." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="border-b border-outline-variant/40 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="pb-3">Tên quán</th>
                  <th className="pb-3">Số điện thoại</th>
                  <th className="pb-3">Địa chỉ</th>
                  <th className="pb-3">Tọa độ</th>
                  <th className="pb-3">Cách trạm</th>
                  <th className="pb-3">Trung bình/ngày</th>
                  <th className="pb-3">Lần thu gần nhất</th>
                  <th className="pb-3">Can</th>
                  <th className="pb-3">Ghi chú</th>
                  <th className="pb-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {result.data.data.map((merchant) => (
                  <tr key={merchant.id} className="border-b border-outline-variant/20 last:border-0">
                    <td className="py-4 font-semibold">{merchant.name}</td>
                    <td className="py-4 text-on-surface-variant">{merchant.phone ?? '—'}</td>
                    <td className="py-4 text-on-surface-variant">{merchant.address ?? '—'}</td>
                    <td className="py-4 text-on-surface-variant">{merchant.lat?.toFixed(4) ?? '—'}, {merchant.lng?.toFixed(4) ?? '—'}</td>
                    <td className="py-4">{merchant.distance_m === null ? '—' : `${(merchant.distance_m / 1000).toFixed(1)} km`}</td>
                    <td className="py-4">{merchant.avg_daily_liters === null ? '—' : formatLiters(merchant.avg_daily_liters)}</td>
                    <td className="py-4 text-on-surface-variant">{formatDate(merchant.last_collected_at)}</td>
                    <td className="py-4">
                      <button
                        className="flex min-h-10 items-center gap-1 rounded-xl border border-primary px-3 font-semibold text-primary transition hover:bg-primary-container"
                        onClick={() => setSelectedId(selectedId === merchant.id ? null : merchant.id)}
                      >
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{selectedId === merchant.id ? 'close' : 'inventory_2'}</span>
                        {selectedId === merchant.id ? 'Đóng' : 'Xem can'}
                      </button>
                    </td>
                    <td className="py-4">{merchant.anomaly ? <Badge tone="red">Bất thường</Badge> : <Badge tone="green">Bình thường</Badge>}</td>
                    <td className="py-4">
                      <button
                        className="flex min-h-10 items-center gap-1 rounded-xl bg-primary px-4 font-semibold text-on-primary shadow-m3-1 transition hover:shadow-m3-2"
                        onClick={() => openEditor(merchant)}
                      >
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">edit</span>
                        Sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Selected merchant detail */}
      {selectedMerchant ? (
        <section className="mt-5 rounded-2xl border border-primary/20 bg-primary-container/20 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">store</span>
              <div>
                <p className="text-sm text-primary">Chi tiết quán</p>
                <h3 className="font-display text-xl font-bold text-on-surface">{selectedMerchant.name}</h3>
              </div>
            </div>
            <span className="text-sm text-on-surface-variant">{selectedMerchant.address ?? 'Chưa có địa chỉ'}</span>
          </div>
          {containers.isLoading ? <Skeleton className="mt-4 h-20" /> : containers.error ? <p className="mt-4 text-sm text-error">Không thể tải danh sách can.</p> : !containers.data?.data.length ? <p className="mt-4 rounded-xl bg-surface-container-lowest p-4 text-sm text-on-surface-variant">Quán chưa được cấp can.</p> : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {containers.data.data.map((container) => (
                <div key={container.id} className="rounded-xl bg-surface-container-lowest p-4 shadow-m3-1">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="font-mono text-sm">{container.qr_code}</strong>
                    <Badge tone={container.state === 'AT_MERCHANT' ? 'green' : 'orange'}>{container.state}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-on-surface-variant">Dung tích: {container.capacity_liters ?? '—'} lít</p>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* Edit modal */}
      {editing && form ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/50 p-4" role="dialog" aria-modal="true" aria-labelledby="merchant-edit-title">
          <form className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-surface-container-lowest p-6 shadow-m3-2" onSubmit={submitEdit}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" aria-hidden="true">edit</span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary">Chỉnh sửa thông tin</p>
                  <h3 id="merchant-edit-title" className="font-display text-2xl font-bold text-on-surface">{editing.name}</h3>
                </div>
              </div>
              <button type="button" aria-label="Đóng" className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-surface-container-high" onClick={closeEditor} disabled={updateMerchant.isPending}>
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold text-on-surface-variant">Tên quán<input className="min-h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 font-normal text-on-surface transition focus:border-primary" value={form.name} onChange={(event) => change('name', event.target.value)} required /></label>
              <label className="grid gap-1 text-sm font-semibold text-on-surface-variant">Số điện thoại<input className="min-h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 font-normal text-on-surface transition focus:border-primary" inputMode="tel" value={form.phone} onChange={(event) => change('phone', event.target.value)} placeholder="0901 234 567" required /></label>
              <label className="grid gap-1 text-sm font-semibold text-on-surface-variant md:col-span-2">Địa chỉ<input className="min-h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 font-normal text-on-surface transition focus:border-primary" value={form.address} onChange={(event) => change('address', event.target.value)} required /></label>
              <label className="grid gap-1 text-sm font-semibold text-on-surface-variant">Loại hình<input className="min-h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 font-normal text-on-surface transition focus:border-primary" value={form.businessType} onChange={(event) => change('businessType', event.target.value)} /></label>
              <label className="grid gap-1 text-sm font-semibold text-on-surface-variant">Phường<select className="min-h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 font-normal text-on-surface transition focus:border-primary" value={form.wardId} onChange={(event) => change('wardId', event.target.value)} required disabled={wards.isLoading}><option value="">Chọn phường</option>{wards.data?.map((ward) => <option value={ward.id} key={ward.id}>{ward.name} ({ward.code})</option>)}</select></label>
              <label className="grid gap-1 text-sm font-semibold text-on-surface-variant">Vĩ độ<input className="min-h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 font-normal text-on-surface transition focus:border-primary" inputMode="decimal" value={form.lat} onChange={(event) => change('lat', event.target.value)} placeholder="10.7769" /></label>
              <label className="grid gap-1 text-sm font-semibold text-on-surface-variant">Kinh độ<input className="min-h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 font-normal text-on-surface transition focus:border-primary" inputMode="decimal" value={form.lng} onChange={(event) => change('lng', event.target.value)} placeholder="106.7009" /></label>
            </div>
            {wards.error ? <p className="mt-3 text-sm text-error">Không tải được danh sách phường. Hãy đóng form và thử lại.</p> : null}
            {formError ? <p className="mt-3 flex items-center gap-1 text-sm font-semibold text-error" role="alert"><span className="material-symbols-outlined text-[16px]" aria-hidden="true">error</span>{formError}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="min-h-11 rounded-xl border border-outline-variant px-5 font-semibold transition hover:bg-surface-container-high" onClick={closeEditor} disabled={updateMerchant.isPending}>Hủy</button>
              <button type="submit" className="min-h-11 rounded-xl bg-primary px-5 font-semibold text-on-primary shadow-m3-1 transition hover:shadow-m3-2 disabled:opacity-60" disabled={updateMerchant.isPending || wards.isLoading}>{updateMerchant.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
            </div>
          </form>
        </div>
      ) : null}
    </AdminShell>
  );
}
