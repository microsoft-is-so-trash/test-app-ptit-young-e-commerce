import React from 'react';
import { formatLiters } from '../lib/dashboard-utils';

export interface KpiValues {
  liters: number;
  transactions: number;
  merchants: number;
  alerts: number;
}

const cards: Array<{
  label: string;
  icon: string;
  colorClass: string;
  iconBg: string;
  getValue: (v: KpiValues) => string;
}> = [
  {
    label: 'Tổng lít hôm nay',
    icon: 'water_drop',
    colorClass: 'text-primary',
    iconBg: 'bg-primary-container text-on-primary-container',
    getValue: (v) => formatLiters(v.liters),
  },
  {
    label: 'Giao dịch hôm nay',
    icon: 'receipt_long',
    colorClass: 'text-tertiary',
    iconBg: 'bg-tertiary-container text-on-tertiary-container',
    getValue: (v) => v.transactions.toLocaleString('vi-VN'),
  },
  {
    label: 'Quán hoạt động',
    icon: 'storefront',
    colorClass: 'text-secondary',
    iconBg: 'bg-secondary-container text-on-secondary-container',
    getValue: (v) => v.merchants.toLocaleString('vi-VN'),
  },
  {
    label: 'Cảnh báo chưa xử lý',
    icon: 'notification_important',
    colorClass: '',
    iconBg: '',
    getValue: (v) => v.alerts.toLocaleString('vi-VN'),
  },
];

export function KpiCards({ values }: { values: KpiValues }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const alertActive = card.icon === 'notification_important' && values.alerts > 0;
        const color = card.icon === 'notification_important'
          ? (alertActive ? 'text-error' : 'text-primary')
          : card.colorClass;
        const bg = card.icon === 'notification_important'
          ? (alertActive ? 'bg-error-container text-on-error-container' : 'bg-primary-container text-on-primary-container')
          : card.iconBg;
        return (
          <article
            key={card.label}
            className="flex items-start gap-4 rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-5 shadow-m3-1 transition-shadow hover:shadow-m3-2"
          >
            <span className={`material-symbols-outlined filled flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${bg}`} aria-hidden="true">
              {card.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm text-on-surface-variant">{card.label}</p>
              <p className={`mt-1 font-display text-3xl font-bold tracking-tight ${color}`}>
                {card.getValue(values)}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
