import type { CollectorNoticeTone } from '../components/CollectorNotice';
import { formatTime } from './collector-format';
import type { RouteRefreshNotice } from './collector-runtime';
import { outboxErrorMessage } from './outbox-errors';

export type RouteStatusActionId = 'retry' | 'open-outbox' | 'open-receipt' | 'cancel-shift';

export interface RouteStatusItem {
  key: string;
  tone: CollectorNoticeTone;
  icon: string;
  title: string;
  message: string;
  action?: { id: RouteStatusActionId; label: string; disabled: boolean };
}

export interface RouteStatusInput {
  online: boolean;
  loadError: boolean;
  refreshNotice: RouteRefreshNotice | null;
  /** Đang chờ GPS lần đầu. */
  locating: boolean;
  /** Không lấy được GPS, đang dùng tâm phường. */
  locationDenied: boolean;
  /** Thời điểm của tuyến đã lưu trên máy khi đang dùng bản cũ; null nếu dùng bản mới. */
  cachedAt: string | null;
  unsynced: number;
  syncError: string | null;
  receiptId: string | null;
  shiftStarted: boolean;
  shiftStartedAt: string | null;
  canCancelShift: boolean;
}

/**
 * Mọi trạng thái của màn Tuyến, xếp theo ưu tiên (U6): lỗi > mất mạng > hàng chờ > GPS >
 * dữ liệu cũ > biên nhận đã lưu > ca đã sẵn sàng > tải lại thành công.
 * Dải trạng thái hiện mục đầu tiên; bấm vào để xem cả danh sách. Không lặp nút "Tải lại/Lấy lại GPS"
 * đã có trên đầu màn (U5), trừ khi thông báo gốc đã có nút đó.
 */
export function buildRouteStatusItems(input: RouteStatusInput): RouteStatusItem[] {
  const retry = { id: 'retry' as const, label: 'Thử lại', disabled: false };
  const openOutbox = { id: 'open-outbox' as const, label: 'Xem hàng chờ đồng bộ', disabled: false };
  const items: RouteStatusItem[] = [];

  if (input.loadError) {
    items.push({ key: 'load-error', tone: 'danger', icon: 'error', title: 'Không tải được bản tuyến mới', message: 'Dữ liệu tuyến đã lưu trên máy vẫn được giữ nguyên.', action: retry });
  }
  if (input.refreshNotice?.kind === 'error') {
    items.push({ key: 'refresh-error', tone: 'danger', icon: 'error', title: 'Không tải lại được tuyến', message: input.refreshNotice.message, action: retry });
  }
  if (input.syncError) {
    items.push({ key: 'sync-error', tone: 'danger', icon: 'sync_problem', title: `${input.unsynced} giao dịch chưa đồng bộ`, message: outboxErrorMessage(input.syncError), action: openOutbox });
  }
  if (!input.online) {
    items.push({ key: 'offline', tone: 'warning', icon: 'wifi_off', title: 'Đang ngoại tuyến', message: 'Dữ liệu vẫn được lưu an toàn trên máy và sẽ tự gửi khi có mạng.' });
  }
  if (input.unsynced > 0 && !input.syncError) {
    items.push({ key: 'queue', tone: 'info', icon: 'cloud_upload', title: `${input.unsynced} giao dịch chưa đồng bộ`, message: 'Đang gửi dữ liệu, hãy giữ mạng và không xoá hàng chờ.', action: openOutbox });
  }
  if (input.refreshNotice?.kind === 'warning') {
    items.push({ key: 'refresh-warning', tone: 'warning', icon: 'location_off', title: 'Chưa lấy được GPS', message: input.refreshNotice.message });
  }
  if (input.locating && !input.locationDenied) {
    items.push({ key: 'gps-locating', tone: 'info', icon: 'my_location', title: 'Đang lấy vị trí', message: 'Để sắp xếp các điểm gần bạn trước.' });
  }
  if (input.locationDenied) {
    items.push({ key: 'gps-fallback', tone: 'warning', icon: 'location_off', title: 'Đang dùng vị trí tâm phường', message: 'Chưa lấy được GPS nên giao dịch có thể bị gắn cờ kiểm tra.' });
  }
  if (input.cachedAt) {
    items.push({ key: 'cache', tone: 'warning', icon: 'cloud_off', title: `Dữ liệu lúc ${formatTime(input.cachedAt)}`, message: 'Chưa kết nối được máy chủ để lấy bản mới.' });
  }
  if (input.refreshNotice?.kind === 'cache') {
    items.push({ key: 'refresh-cache', tone: 'warning', icon: 'cloud_off', title: 'Đang dùng tuyến đã lưu', message: input.refreshNotice.message });
  }
  if (input.receiptId) {
    items.push({ key: 'receipt', tone: 'success', icon: 'receipt_long', title: 'Đã lưu biên nhận trên máy', message: `Mã phiếu: ${input.receiptId}`, action: { id: 'open-receipt', label: 'Xem lại biên nhận', disabled: false } });
  }
  if (input.shiftStarted) {
    const started = input.shiftStartedAt ? `Bắt đầu lúc ${formatTime(input.shiftStartedAt)}.` : 'Tuyến và mã QR đã lưu trên máy.';
    items.push({
      key: 'shift-ready',
      tone: 'success',
      icon: 'cloud_done',
      title: 'Tuyến đã sẵn sàng khi mất sóng',
      message: input.canCancelShift ? started : `${started} Đã thu điểm đầu tiên nên không hủy ca được nữa.`,
      action: { id: 'cancel-shift', label: 'Hủy ca', disabled: !input.canCancelShift },
    });
  }
  if (input.refreshNotice?.kind === 'success') {
    items.push({ key: 'refresh-success', tone: 'success', icon: 'check_circle', title: 'Đã cập nhật tuyến', message: input.refreshNotice.message });
  }
  return items;
}
