import { formatLiters } from './formatters';

/** Nút "Đi nộp trạm" trên màn Tuyến: ẩn khi chưa thu điểm nào, nút chữ khi còn điểm, nút chính khi đã thu hết (Q12). */
export function stationDeliveryEntry({ completedCount, remainingStops }: { completedCount: number; remainingStops: number }): 'hidden' | 'secondary' | 'primary' {
  if (completedCount === 0) return 'hidden';
  return remainingStops === 0 ? 'primary' : 'secondary';
}

/** Dòng tiến độ thay cho màn Tóm tắt ca: số điểm đã thu và số lít đã thu. */
export function routeProgressLine({ completedCount, totalStops, collectedLiters }: { completedCount: number; totalStops: number; collectedLiters: number }): string {
  const progress = `${completedCount} / ${Math.max(totalStops, completedCount)} điểm đã thu`;
  return collectedLiters > 0 ? `${progress} · ${formatLiters(collectedLiters)}` : progress;
}
