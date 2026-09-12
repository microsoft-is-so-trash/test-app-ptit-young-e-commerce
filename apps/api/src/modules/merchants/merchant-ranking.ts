export interface MerchantLitersEntry {
  merchant_id: string;
  liters: number;
}

export interface MerchantRankingResult {
  rank: number;
  total: number;
  liters_this_month: number;
  /** Số bậc tăng (dương) hoặc giảm (âm) so với tháng trước; null nếu tháng trước chưa có dữ liệu. */
  rank_change: number | null;
}

/** Competition ranking (1224): các mức lít bằng nhau chia sẻ cùng một hạng, hạng kế tiếp bỏ qua đúng số quán đứng trước. */
function rankOf(entries: MerchantLitersEntry[], merchantId: string): number {
  const sorted = [...entries].sort((a, b) => b.liters - a.liters);
  const target = sorted.find((entry) => entry.merchant_id === merchantId);
  if (!target) {
    throw new Error(`Merchant ${merchantId} not present in ranking entries`);
  }
  return sorted.filter((entry) => entry.liters > target.liters).length + 1;
}

export function computeMerchantRanking(
  currentMonth: MerchantLitersEntry[],
  previousMonth: MerchantLitersEntry[],
  targetMerchantId: string,
): MerchantRankingResult {
  const rank = rankOf(currentMonth, targetMerchantId);
  const current = currentMonth.find((entry) => entry.merchant_id === targetMerchantId)!;

  const hadPreviousData = previousMonth.some((entry) => entry.merchant_id === targetMerchantId);
  const rank_change = hadPreviousData ? rankOf(previousMonth, targetMerchantId) - rank : null;

  return {
    rank,
    total: currentMonth.length,
    liters_this_month: current.liters,
    rank_change,
  };
}
