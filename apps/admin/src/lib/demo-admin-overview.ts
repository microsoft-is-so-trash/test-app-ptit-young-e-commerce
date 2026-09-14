import { ContainerState, MerchantApprovalStatus } from '@eco-oil/shared-types';
import type { AdminOverviewResponse } from '@eco-oil/shared-types';
import { DEMO_TRANSACTIONS, isoHoursAgo } from './demo-dataset';
import { demoRecentTransactions } from './demo-admin-ai';
import {
  demoContainers,
  demoCurrentMerchants,
  demoOpenAlertCount,
  demoStations,
} from './demo-admin-store';

const DAY_MS = 86_400_000;

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Chuỗi ngày liên tục để biểu đồ không bị đứt quãng ở những ngày không có giao dịch. */
function dayRange(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  while (cursor.getTime() <= end.getTime()) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setTime(cursor.getTime() + DAY_MS);
  }
  return days;
}

export function demoOverview(from?: string, to?: string): AdminOverviewResponse {
  const now = new Date();
  const toDate = to ? new Date(`${to.slice(0, 10)}T23:59:59.999Z`) : now;
  const fromDate = from ? new Date(`${from.slice(0, 10)}T00:00:00.000Z`) : new Date(now.getTime() - 29 * DAY_MS);

  const inRange = DEMO_TRANSACTIONS.filter((txn) => {
    const at = new Date(isoHoursAgo(txn.hoursAgo)).getTime();
    return at >= fromDate.getTime() && at <= toDate.getTime();
  });

  const litersByDay = new Map<string, number>();
  for (const txn of inRange) {
    const key = dayKey(isoHoursAgo(txn.hoursAgo));
    litersByDay.set(key, (litersByDay.get(key) ?? 0) + txn.liters);
  }

  const merchants = demoCurrentMerchants();
  const containers = demoContainers().data;

  return {
    period: { from: fromDate.toISOString(), to: toDate.toISOString() },
    totals: {
      liters: Number(inRange.reduce((sum, txn) => sum + txn.liters, 0).toFixed(1)),
      transactions: inRange.length,
      active_merchants: merchants.filter(
        (merchant) => merchant.approval_status === MerchantApprovalStatus.APPROVED,
      ).length,
      active_collectors: new Set(inRange.map((txn) => txn.collector_id)).size,
    },
    orders: {
      ready: merchants.filter((merchant) => merchant.container_code !== null).length,
      assigned: 4,
      collected: inRange.length,
      cancelled: 1,
    },
    containers: {
      at_merchant: containers.filter((item) => item.state === ContainerState.AT_MERCHANT).length,
      in_transit: containers.filter((item) => item.state === ContainerState.IN_TRANSIT).length,
      at_station: containers.filter((item) => item.state === ContainerState.AT_STATION).length,
    },
    stations: demoStations().data,
    alerts_open: demoOpenAlertCount(),
    daily_liters: dayRange(fromDate, toDate).map((date) => ({
      date,
      liters: Number((litersByDay.get(date) ?? 0).toFixed(1)),
    })),
    recent_transactions: demoRecentTransactions(10),
  };
}
