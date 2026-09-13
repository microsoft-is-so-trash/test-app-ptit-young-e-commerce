import type { CollectionTransactionResponse } from '@eco-oil/shared-types';

export interface CollectorStatsSummary {
  totalLiters: number;
  totalPickups: number;
  /** Số ca đếm theo mã tuyến; giao dịch không gắn tuyến không được tính. */
  shiftCount: number;
  /** Số ngày riêng biệt có phát sinh thu gom, tính theo giờ Việt Nam. */
  workingDays: number;
  co2Kg: number;
  averageLitersPerPickup: number;
  busiestDay: { date: string; liters: number } | null;
}

/** Ngày theo giờ Việt Nam, dùng để gom nhóm giao dịch trong cùng một ngày làm việc. */
export function vietnamDateKey(isoDate: string): string {
  const date = new Date(isoDate);
  const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

export function summarizeCollectorStats(
  transactions: CollectionTransactionResponse[],
  co2KgPerLiter: number,
): CollectorStatsSummary {
  const litersByDay = new Map<string, number>();
  const routeIds = new Set<string>();
  let totalLiters = 0;

  for (const txn of transactions) {
    const liters = Number.isFinite(txn.actual_liters) ? txn.actual_liters : 0;
    totalLiters += liters;
    const day = vietnamDateKey(txn.collected_at);
    litersByDay.set(day, (litersByDay.get(day) ?? 0) + liters);
    if (txn.route_id) routeIds.add(txn.route_id);
  }

  let busiestDay: CollectorStatsSummary['busiestDay'] = null;
  for (const [date, liters] of litersByDay) {
    if (!busiestDay || liters > busiestDay.liters) busiestDay = { date, liters };
  }

  return {
    totalLiters,
    totalPickups: transactions.length,
    shiftCount: routeIds.size,
    workingDays: litersByDay.size,
    co2Kg: totalLiters * co2KgPerLiter,
    averageLitersPerPickup: transactions.length === 0 ? 0 : totalLiters / transactions.length,
    busiestDay,
  };
}
