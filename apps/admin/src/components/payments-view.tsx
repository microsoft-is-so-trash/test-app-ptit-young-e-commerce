'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../lib/api';
import { currentPaymentPeriod, formatDate, formatLiters, formatMoney } from '../lib/dashboard-utils';
import { AdminShell } from './admin-shell';
import { Badge, EmptyState, ErrorState, Skeleton } from './ui';

const statusLabel = { PENDING: 'Chờ thanh toán', PAID: 'Đã thanh toán', CANCELLED: 'Đã huỷ' } as const;

export function PaymentsView() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(currentPaymentPeriod());
  const [unitPrice, setUnitPrice] = useState('');
  const [priceUnit, setPriceUnit] = useState<'PER_LITER' | 'PER_KG'>('PER_LITER');
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const payments = useQuery({ queryKey: ['payments', period], queryFn: () => api.payments({ period, page: 1, limit: 100 }) });
  const prices = useQuery({ queryKey: ['oil-prices'], queryFn: api.oilPrices });
  const run = useMutation({ mutationFn: () => api.runPayments(period), onSuccess: async (result) => { setNotice(`Đã tạo ${result.created} khoản, bỏ qua ${result.skipped} khoản đã chốt. Tổng mới: ${formatMoney(result.total_amount)}.`); await queryClient.invalidateQueries({ queryKey: ['payments'] }); } });
  const markPaid = useMutation({ mutationFn: (id: string) => api.markPaymentPaid(id), onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['payments'] }) });
  const createPrice = useMutation({ mutationFn: () => api.createOilPrice({ unit_price: Number(unitPrice), unit: priceUnit, note: note || undefined }), onSuccess: async () => { setUnitPrice(''); setNote(''); setNotice('Đã áp dụng đơn giá mới. Các khoản đã chốt không thay đổi.'); await queryClient.invalidateQueries({ queryKey: ['oil-prices'] }); } });
  const error = payments.error ?? prices.error ?? run.error ?? markPaid.error ?? createPrice.error;
  const errorMessage = error instanceof ApiError ? error.message : error ? 'Không thể xử lý yêu cầu thanh toán.' : null;
  const currentPrice = prices.data?.find((price) => price.effective_to === null);

  function submitPrice(event: FormEvent) {
    event.preventDefault();
    if (Number(unitPrice) <= 0) { setNotice('Vui lòng nhập đơn giá lớn hơn 0.'); return; }
    if (window.confirm(`Áp dụng đơn giá ${formatMoney(Number(unitPrice))}/${priceUnit === 'PER_KG' ? 'kg' : 'lít'} từ bây giờ?`)) createPrice.mutate();
  }

  if (payments.isLoading || prices.isLoading) return <AdminShell><Skeleton className="h-10 w-64" /><Skeleton className="mt-6 h-96" /></AdminShell>;

  return (
    <AdminShell>
      {/* Page header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined filled text-3xl text-primary" aria-hidden="true">account_balance_wallet</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Đối soát tiền quán</p>
            <h2 className="font-display text-3xl font-bold text-on-surface">Thanh toán theo tuần</h2>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            aria-label="Kỳ thanh toán"
            type="week"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="min-h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-on-surface transition focus:border-primary"
          />
          <button
            type="button"
            disabled={run.isPending || !period}
            onClick={() => run.mutate()}
            className="min-h-11 rounded-xl bg-primary px-5 font-semibold text-on-primary shadow-m3-1 transition hover:shadow-m3-2 disabled:opacity-50"
          >
            {run.isPending ? 'Đang chốt…' : 'Chốt kỳ'}
          </button>
        </div>
      </div>

      {/* Notice */}
      {notice ? (
        <div role="status" className="mt-5 flex items-start gap-2 rounded-2xl bg-primary-container p-4 text-on-primary-container">
          <span className="material-symbols-outlined shrink-0 text-[20px]" aria-hidden="true">check_circle</span>
          <p className="text-sm font-medium">{notice}</p>
        </div>
      ) : null}

      {/* Error */}
      {errorMessage ? <div className="mt-5"><ErrorState message={errorMessage} /></div> : null}

      {/* KPI Summary */}
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl bg-primary p-5 text-on-primary shadow-m3-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined filled text-[20px]" aria-hidden="true">payments</span>
            <p className="text-sm text-on-primary/80">Tổng tiền kỳ</p>
          </div>
          <strong className="mt-2 block font-display text-3xl">{formatMoney(payments.data?.totals.amount ?? 0)}</strong>
        </article>
        <article className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-5 shadow-m3-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">water_drop</span>
            <p className="text-sm text-on-surface-variant">Tổng dầu</p>
          </div>
          <strong className="mt-2 block font-display text-2xl text-on-surface">{formatLiters(payments.data?.totals.liters ?? 0)}</strong>
        </article>
        <article className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-5 shadow-m3-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-tertiary" aria-hidden="true">receipt</span>
            <p className="text-sm text-on-surface-variant">Số khoản</p>
          </div>
          <strong className="mt-2 block font-display text-2xl text-on-surface">{payments.data?.meta.total ?? 0}</strong>
        </article>
      </section>

      {/* Detail table */}
      <section className="mt-6 rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-5 shadow-m3-1">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" aria-hidden="true">table_chart</span>
          <h3 className="font-display text-lg font-bold">Chi tiết theo quán</h3>
        </div>
        {!payments.data?.data.length ? (
          <div className="mt-4"><EmptyState message="Kỳ này chưa được chốt hoặc chưa có giao dịch đạt chất lượng." /></div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="border-b border-outline-variant/40 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="pb-3">Quán</th>
                  <th className="pb-3">Ngày thu</th>
                  <th className="pb-3">Lít</th>
                  <th className="pb-3">Kg</th>
                  <th className="pb-3">Đơn giá đã chốt</th>
                  <th className="pb-3">Thành tiền</th>
                  <th className="pb-3">Trạng thái</th>
                  <th className="pb-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {payments.data.data.map((payment) => (
                  <tr key={payment.id} className="border-b border-outline-variant/20 last:border-0">
                    <td className="py-4 font-semibold">{payment.merchant_name}</td>
                    <td className="py-4 text-on-surface-variant">{formatDate(payment.collected_at)}</td>
                    <td className="py-4">{formatLiters(payment.liters)}</td>
                    <td className="py-4">{payment.kilograms === null ? '—' : `${payment.kilograms.toFixed(2)} kg`}</td>
                    <td className="py-4">{formatMoney(payment.unit_price)}/{payment.unit === 'PER_KG' ? 'kg' : 'lít'}</td>
                    <td className="py-4 font-bold text-primary">{formatMoney(payment.amount)}</td>
                    <td className="py-4">
                      <Badge tone={payment.status === 'PAID' ? 'green' : payment.status === 'CANCELLED' ? 'red' : 'orange'}>
                        {statusLabel[payment.status]}
                      </Badge>
                    </td>
                    <td className="py-4">
                      {payment.status === 'PENDING' ? (
                        <button
                          type="button"
                          disabled={markPaid.isPending}
                          onClick={() => markPaid.mutate(payment.id)}
                          className="min-h-10 rounded-xl border border-primary px-3 text-sm font-semibold text-primary transition hover:bg-primary-container disabled:opacity-50"
                        >
                          Đánh dấu đã trả
                        </button>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Oil price section */}
      <section className="mt-6 rounded-2xl border border-tertiary/30 bg-tertiary-container/30 p-5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary" aria-hidden="true">price_change</span>
          <h3 className="font-display text-lg font-bold text-on-surface">Đơn giá dầu</h3>
        </div>
        <p className="mt-2 text-sm text-on-surface-variant">
          Đổi đơn giá chỉ áp dụng cho giao dịch được chốt sau thời điểm mới. Các khoản đã chốt giữ nguyên đơn giá, đại lượng và thành tiền.
        </p>
        <p className="mt-3">
          Hiện hành:{' '}
          <strong className="text-primary">
            {currentPrice ? `${formatMoney(currentPrice.unit_price)}/${currentPrice.unit === 'PER_KG' ? 'kg' : 'lít'}` : 'Chưa cấu hình'}
          </strong>
        </p>
        <form onSubmit={submitPrice} className="mt-4 grid gap-3 md:grid-cols-[180px_150px_1fr_auto]">
          <input
            aria-label="Đơn giá mới"
            type="number"
            min="1"
            step="1"
            value={unitPrice}
            onChange={(event) => setUnitPrice(event.target.value)}
            placeholder="Đơn giá mới"
            className="min-h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 transition focus:border-primary"
          />
          <select
            aria-label="Đơn vị giá"
            value={priceUnit}
            onChange={(event) => setPriceUnit(event.target.value as 'PER_LITER' | 'PER_KG')}
            className="min-h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 transition focus:border-primary"
          >
            <option value="PER_LITER">Mỗi lít</option>
            <option value="PER_KG">Mỗi kg</option>
          </select>
          <input
            aria-label="Ghi chú đơn giá"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ghi chú (không bắt buộc)"
            className="min-h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 transition focus:border-primary"
          />
          <button
            disabled={createPrice.isPending}
            className="min-h-11 rounded-xl bg-on-surface px-5 font-semibold text-inverse-on-surface shadow-m3-1 transition hover:shadow-m3-2 disabled:opacity-50"
          >
            {createPrice.isPending ? 'Đang lưu…' : 'Đổi đơn giá'}
          </button>
        </form>
        <div className="mt-4 space-y-2">
          {prices.data?.map((price) => (
            <div key={price.id} className="flex flex-wrap justify-between gap-2 border-t border-outline-variant/40 pt-2 text-sm">
              <span>{formatMoney(price.unit_price)}/{price.unit === 'PER_KG' ? 'kg' : 'lít'} · từ {formatDate(price.effective_from)}</span>
              <span className="text-on-surface-variant">{price.effective_to ? `đến ${formatDate(price.effective_to)}` : 'Đang áp dụng'}</span>
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
