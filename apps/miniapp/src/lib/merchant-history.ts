import { CO2_KG_PER_LITER } from '@eco-oil/shared-types';

export interface MerchantHistorySummary {
  totalLiters: number;
  totalCount: number;
  totalCo2Kg: number;
}

export function summarizeMerchantHistory(transactions: ReadonlyArray<{ actual_liters: number }>): MerchantHistorySummary {
  const totalLiters = transactions.reduce((sum, transaction) => sum + transaction.actual_liters, 0);
  return { totalLiters, totalCount: transactions.length, totalCo2Kg: totalLiters * CO2_KG_PER_LITER };
}
