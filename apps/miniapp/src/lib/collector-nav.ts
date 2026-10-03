export type CollectorTab = 'shift' | 'mine';

export const COLLECTOR_TABS: ReadonlyArray<{ key: CollectorTab; icon: string; label: string }> = [
  { key: 'shift', icon: 'route', label: 'Ca hôm nay' },
  { key: 'mine', icon: 'person', label: 'Của tôi' },
];

export type CollectorMineSectionKey = 'collected' | 'profile' | 'wards' | 'settings';

export const COLLECTOR_MINE_SECTIONS: ReadonlyArray<{ key: CollectorMineSectionKey; icon: string; title: string }> = [
  { key: 'collected', icon: 'insights', title: 'Đã thu và thống kê' },
  { key: 'profile', icon: 'badge', title: 'Hồ sơ và xe' },
  { key: 'wards', icon: 'map', title: 'Địa bàn' },
  { key: 'settings', icon: 'tune', title: 'Cài đặt chung' },
];

/** Còn giao dịch chưa đồng bộ thì hỏi lại trước khi đăng xuất (dữ liệu vẫn giữ trong hàng chờ). */
export function signOutNeedsConfirmation(stats: { pending: number; syncing: number; failed: number }): boolean {
  return stats.pending + stats.syncing + stats.failed > 0;
}
