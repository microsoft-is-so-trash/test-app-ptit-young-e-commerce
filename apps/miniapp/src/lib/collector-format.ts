import type { OutboxRecord } from './outbox-db';

export function statusLabel(status: OutboxRecord['status']): string {
  switch (status) {
    case 'pending': return 'Đang chờ đồng bộ';
    case 'syncing': return 'Đang đồng bộ';
    case 'synced': return 'Đã đồng bộ';
    case 'failed': return 'Giao dịch lỗi';
  }
}

export function formatDistance(distanceM: number): string {
  return distanceM < 1000 ? `${Math.round(distanceM)} m` : `${(distanceM / 1000).toFixed(1)} km`;
}

export function formatTime(value: string | null): string {
  if (!value) return '--:--';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
