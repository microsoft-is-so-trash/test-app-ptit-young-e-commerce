import type { MerchantTransaction } from '@eco-oil/shared-types';

export interface MonthlyTrendPoint {
  monthKey: string;
  label: string;
  liters: number;
  co2Kg: number;
}

function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Chỉ cần thời điểm thu và số lít, nên dùng được cho cả giao dịch của quán lẫn của người thu gom. */
type MonthlyTrendInput = Pick<MerchantTransaction, 'collected_at' | 'actual_liters'>;

export function buildMonthlyTrend(
  transactions: MonthlyTrendInput[],
  monthsBack: number,
  co2KgPerLiter: number,
  now = new Date(),
): MonthlyTrendPoint[] {
  const buckets = new Map<string, number>();
  const months: MonthlyTrendPoint[] = [];

  for (let offset = monthsBack - 1; offset >= 0; offset -= 1) {
    const cursor = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = monthKeyOf(cursor);
    buckets.set(key, 0);
    months.push({
      monthKey: key,
      label: `Th${cursor.getMonth() + 1}/${String(cursor.getFullYear()).slice(2)}`,
      liters: 0,
      co2Kg: 0,
    });
  }

  for (const txn of transactions) {
    const key = monthKeyOf(new Date(txn.collected_at));
    if (!buckets.has(key)) continue;
    buckets.set(key, (buckets.get(key) ?? 0) + txn.actual_liters);
  }

  return months.map((month) => {
    const liters = buckets.get(month.monthKey) ?? 0;
    return { ...month, liters, co2Kg: liters * co2KgPerLiter };
  });
}
