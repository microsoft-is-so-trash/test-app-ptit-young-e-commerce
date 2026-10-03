/** Số lít ước tính để điền sẵn khi quán báo sẵn sàng thu gom: làm tròn 0,1 lít, không vượt dung tích can. */
export function estimateReadyLiters(container: { estimated_liters: number; capacity_l: number | null } | undefined): number | null {
  if (!container || !(container.estimated_liters > 0)) return null;
  const capped = container.capacity_l !== null && container.capacity_l > 0
    ? Math.min(container.estimated_liters, container.capacity_l)
    : container.estimated_liters;
  return Math.round(capped * 10) / 10;
}

/**
 * Ô "Số lít ước lượng": chưa sửa tay (`manualText === null`) thì hiện số tự tính;
 * đã sửa tay thì giữ đúng chữ người dùng nhập.
 */
export function orderLitersField(manualText: string | null, estimate: number | null): { text: string; isAuto: boolean } {
  if (manualText !== null) return { text: manualText, isAuto: false };
  if (estimate === null) return { text: '', isAuto: false };
  return { text: String(estimate), isAuto: true };
}
