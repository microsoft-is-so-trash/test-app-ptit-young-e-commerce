import { useState } from 'react';
import type { GeoPoint, RouteStop } from '@eco-oil/shared-types';
import { formatLiters } from '../../lib/formatters';
import { formatDistance, formatTime, statusLabel } from '../../lib/collector-format';
import {
  findRowForStop,
  getEmptyRouteState,
  getPickupPriorityDisplay,
  getPickupVolumeForecastDisplay,
  getRouteCapacityRiskDisplay,
  getRouteOptimizationDisplay,
  formatPickupVolumeLiters,
  formatRouteCapacityRiskLiters,
  type CompletedStop,
} from '../../lib/collector-metrics';
import { runCollectorAction } from '../../lib/collector-runtime';
import type { RouteRefreshNotice } from '../../lib/collector-runtime';
import type { OutboxRecord, StoredStationReceipt } from '../../lib/outbox-db';
import type { useOutboxStats } from '../../lib/outbox-hooks';
import { outboxErrorMessage } from '../../lib/outbox-errors';
import type { RouteLoadResult } from '../../lib/offline-cache';
import { isValidGeoPoint, normalizeVietnamesePhone, copyPhoneNumber, zaloClient } from '../../lib/zalo-client';
import { CollectorNotice } from '../../components/CollectorNotice';
import { Icon } from '../../components/Icon';
import { StatusView } from '../../components/StatusView';

interface CollectorRouteScreenProps {
  stops: RouteStop[];
  route: RouteLoadResult;
  location: GeoPoint | null;
  locationDenied: boolean;
  completed: Record<string, CompletedStop>;
  totalStops: number;
  outboxRows: OutboxRecord[];
  outboxStats: ReturnType<typeof useOutboxStats>;
  shiftStarted: boolean;
  shiftError: string | null;
  prefetching: boolean;
  refreshing: boolean;
  refreshNotice: RouteRefreshNotice | null;
  loadError: boolean;
  completedOrderIds: string[];
  lastReceipt: StoredStationReceipt | null;
  onStartShift: () => void;
  onCancelShift: () => void;
  onOpenQr: (stop: RouteStop) => void;
  onOpenSummary: () => void;
  onOpenOutbox: () => void;
  onRefresh: () => void;
  onOpenLastReceipt: () => void;
}

export function CollectorRouteScreen({ stops, route, location, locationDenied, completed, completedOrderIds, totalStops, outboxRows, outboxStats, shiftStarted, shiftError, prefetching, refreshing, refreshNotice, loadError, lastReceipt, onStartShift, onCancelShift, onOpenQr, onOpenSummary, onOpenOutbox, onRefresh, onOpenLastReceipt }: CollectorRouteScreenProps) {
  const vehicleCapacity = route.route.total_expected_liters + route.route.remaining_capacity_l;
  const routeFill = vehicleCapacity > 0 ? Math.min(100, Math.round((route.route.total_expected_liters / vehicleCapacity) * 100)) : 0;
  const completedLiters = Object.values(completed).reduce((sum, item) => sum + item.liters, 0);
  const routeOptimization = getRouteOptimizationDisplay(route.route.route_optimization);
  const routeCapacityRisk = getRouteCapacityRiskDisplay(route.route.route_capacity_risk, vehicleCapacity);
  const emptyState = getEmptyRouteState(route.route, stops.length, completedOrderIds);

  return (
    <div className="page-content collector-content collector-route-screen">
      <header className="page-header collector-page-header">
        <div><p className="eyebrow">CA HÔM NAY</p><h1>Tuyến thu gom</h1></div>
        <div className="collector-header-actions">
          <OutboxBadge stats={outboxStats} onClick={onOpenOutbox} />
          <button type="button" className={`round-action ${refreshing ? 'round-action-loading' : ''}`} onClick={onRefresh} disabled={refreshing} aria-busy={refreshing ? 'true' : 'false'}>{refreshing ? 'Đang tải' : locationDenied ? 'Lấy lại GPS' : 'Tải lại'}</button>
        </div>
      </header>
      {refreshNotice ? (
        <CollectorNotice
          tone={refreshNotice.kind === 'error' ? 'danger' : refreshNotice.kind === 'success' ? 'success' : 'warning'}
          title={refreshNotice.kind === 'error' ? 'Không tải lại được tuyến' : refreshNotice.kind === 'cache' ? 'Đang dùng tuyến đã lưu' : refreshNotice.kind === 'warning' ? 'Chưa lấy được GPS' : 'Đã cập nhật tuyến'}
        >
          {refreshNotice.message}
        </CollectorNotice>
      ) : null}
      {loadError ? (
        <CollectorNotice tone="danger" title="Không tải được bản tuyến mới" action={{ label: 'Thử lại', onClick: onRefresh }}>
          Dữ liệu tuyến đã lưu trên máy vẫn được giữ nguyên.
        </CollectorNotice>
      ) : null}
      {!location && !locationDenied ? (
        <CollectorNotice icon="my_location" title="Đang lấy vị trí">Để sắp xếp các điểm gần bạn trước.</CollectorNotice>
      ) : null}
      {locationDenied ? (
        <CollectorNotice tone="warning" icon="location_off" title="Đang dùng vị trí tâm phường">
          Chưa lấy được GPS nên giao dịch có thể bị gắn cờ kiểm tra.
        </CollectorNotice>
      ) : null}
      {route.fromCache ? (
        <CollectorNotice tone="warning" icon="cloud_off" title={`Dữ liệu lúc ${formatTime(route.cachedAt)}`}>
          Chưa kết nối được máy chủ để lấy bản mới.
        </CollectorNotice>
      ) : null}
      {lastReceipt ? (
        <CollectorNotice
          tone="success"
          icon="receipt_long"
          title="Đã lưu biên nhận trên máy"
          action={{ label: 'Xem lại biên nhận', onClick: onOpenLastReceipt }}
        >
          Mã phiếu: {lastReceipt.receipt_id}
        </CollectorNotice>
      ) : null}
      <OutboxIssueNotice rows={outboxRows} stats={outboxStats} onOpen={onOpenOutbox} />
      {!shiftStarted ? (
        <button className="start-shift-button" onClick={onStartShift} disabled={prefetching}>
          {prefetching ? 'Đang lưu tuyến và mã QR…' : 'Bắt đầu ca thu gom'}
        </button>
      ) : (
        <CollectorNotice
          tone="success"
          icon="cloud_done"
          title="Tuyến đã sẵn sàng khi mất sóng"
          action={{ label: 'Hủy ca', onClick: onCancelShift, disabled: prefetching || Object.keys(completed).length > 0 }}
        >
          {route.route.started_at ? `Bắt đầu lúc ${formatTime(route.route.started_at)}.` : 'Tuyến và mã QR đã lưu trên máy.'}
        </CollectorNotice>
      )}
      {shiftError ? <p className="error-text" role="alert">{shiftError}</p> : null}
      <section className="route-capacity-card">
        <div className="route-capacity-top"><span>Tổng lít dự kiến</span><strong>{formatLiters(route.route.total_expected_liters)} / {formatLiters(vehicleCapacity)}</strong></div>
        <div className="route-progress"><span className={routeFill >= 80 ? 'route-progress-high' : ''} style={{ width: `${routeFill}%` }} /></div>
        <div className="route-capacity-bottom"><span>{routeFill}% dung tích xe</span><span>{formatLiters(route.route.remaining_capacity_l)} còn trống</span></div>
      </section>
      {routeCapacityRisk ? (
        <section className={`route-capacity-risk-card route-capacity-risk-${routeCapacityRisk.tone}`} aria-label="Cảnh báo AI sức chứa">
          <div className="route-capacity-risk-heading"><span className="route-capacity-risk-ai">AI</span><strong>{routeCapacityRisk.title}</strong></div>
          {routeCapacityRisk.utilizationPct !== null ? <p className="route-capacity-risk-utilization">AI dự kiến xe đạt {routeCapacityRisk.utilizationPct}%</p> : null}
          {routeCapacityRisk.riskAdjustedTotalLiters !== null && routeCapacityRisk.vehicleCapacityLiters !== null ? <p className="route-capacity-risk-metrics">Sau biên an toàn: {formatRouteCapacityRiskLiters(routeCapacityRisk.riskAdjustedTotalLiters)} / {formatRouteCapacityRiskLiters(routeCapacityRisk.vehicleCapacityLiters)}</p> : null}
          <div className="route-capacity-risk-meta"><span>{routeCapacityRisk.confidenceLabel}</span>{routeCapacityRisk.coveragePct !== null ? <span>Độ phủ dự báo: {routeCapacityRisk.coveragePct}%</span> : null}</div>
          {routeCapacityRisk.message ? <small>{routeCapacityRisk.message}</small> : null}
        </section>
      ) : null}
      {routeOptimization ? (
        <section className={`route-optimization-card route-optimization-${routeOptimization.tone}`} aria-label="Tóm tắt tối ưu tuyến">
          <div className="route-optimization-heading"><span className="route-optimization-ai">AI</span><strong>{routeOptimization.title}</strong></div>
          <p>{routeOptimization.message}</p>
          {routeOptimization.detail ? <small>{routeOptimization.detail}</small> : null}
        </section>
      ) : null}
      <div className="route-summary-line"><strong>{Object.keys(completed).length} / {Math.max(totalStops, Object.keys(completed).length)} điểm đã thu</strong><button className="text-button" onClick={onOpenSummary}>Tóm tắt ca</button></div>
      {emptyState === 'no-ready' ? (
        <StatusView title="Hiện chưa có điểm READY" message="Chưa có quán nào trong phường yêu cầu thu gom. Hãy tải lại khi có đơn mới." action={{ label: 'Tải lại tuyến', onClick: onRefresh }} />
      ) : emptyState === 'completed' ? (
        <StatusView title="Đã hoàn thành tuyến" message={completedLiters > 0 ? `Đã thu ${formatLiters(completedLiters)}. Bạn có thể xem lại tóm tắt ca.` : 'Server xác nhận toàn bộ điểm trong tuyến đã được xử lý.'} action={{ label: 'Xem tóm tắt ca', onClick: onOpenSummary }} />
      ) : emptyState === 'incomplete-active' ? (
        <StatusView title="Chưa tải đủ điểm của tuyến ACTIVE" message="Ca vẫn đang hoạt động nhưng chưa nhận được danh sách điểm. Dữ liệu ca không bị xóa; hãy thử tải lại." action={{ label: 'Thử lại', onClick: onRefresh }} />
      ) : (
        <section className="collector-stop-list">
          {stops.map((stop) => <CollectorStopCard key={stop.order_id} stop={stop} outboxRow={findRowForStop(outboxRows, stop)} onOpenQr={() => onOpenQr(stop)} />)}
        </section>
      )}
    </div>
  );
}
function OutboxBadge({ stats, onClick }: { stats: ReturnType<typeof useOutboxStats>; onClick: () => void }) {
  const waiting = stats.pending + stats.syncing + stats.failed;
  return (
    <button
      className={`outbox-badge ${stats.failed > 0 ? 'outbox-badge-failed' : ''}`}
      onClick={onClick}
      aria-label={waiting > 0 ? `${waiting} giao dịch chưa đồng bộ, mở hàng chờ` : 'Mở hàng chờ đồng bộ'}
    >
      <Icon name={waiting > 0 ? 'sync_problem' : 'cloud_done'} size={18} />
      <span>Hàng chờ {waiting}</span>
    </button>
  );
}

export function OutboxIssueNotice({ rows, stats, onOpen }: { rows: OutboxRecord[]; stats: ReturnType<typeof useOutboxStats>; onOpen?: () => void }) {
  const unsynced = stats.pending + stats.syncing + stats.failed;
  const latestError = rows.find((row) => row.last_error)?.last_error ?? null;
  if (unsynced === 0 && !latestError) return null;
  const hasError = Boolean(latestError);
  return (
    <CollectorNotice
      tone={hasError ? 'danger' : 'info'}
      icon={hasError ? 'sync_problem' : 'cloud_upload'}
      title={`${unsynced} giao dịch chưa đồng bộ`}
      action={onOpen ? { label: 'Xem hàng chờ đồng bộ', onClick: onOpen } : undefined}
    >
      {latestError ? outboxErrorMessage(latestError) : 'Đang gửi dữ liệu, hãy giữ mạng và không xoá hàng chờ.'}
    </CollectorNotice>
  );
}
function CollectorStopCard({ stop, outboxRow, onOpenQr }: { stop: RouteStop; outboxRow: OutboxRecord | undefined; onOpenQr: () => void }) {
  const status = outboxRow?.status;
  const pickupPriority = getPickupPriorityDisplay(stop);
  const pickupVolumeForecast = getPickupVolumeForecastDisplay(stop);
  const [actionBusy, setActionBusy] = useState<'phone' | 'directions' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  // Chỉ là trạng thái hiển thị của thẻ (đóng/mở phần chi tiết AI) — không ảnh hưởng dữ liệu.
  const [aiOpen, setAiOpen] = useState(false);
  const aiPanelId = `stop-ai-${stop.order_id}`;
  const rawPhone = typeof stop.merchant.phone === 'string' ? stop.merchant.phone.trim() : '';
  let normalizedPhone = '';
  try {
    normalizedPhone = normalizeVietnamesePhone(rawPhone);
  } catch {
    // The explicit validation message is rendered below.
  }
  const canCall = normalizedPhone.length > 0;
  const phoneIssue = !rawPhone
    ? 'Quán chưa có số điện thoại.'
    : !canCall
      ? `Số điện thoại quán không hợp lệ: ${rawPhone}`
      : null;
  const canOpenDirections = isValidGeoPoint(stop.merchant);

  function openPhone(): void {
    if (!canCall || actionBusy) return;
    void runCollectorAction(
      () => zaloClient.openPhone(normalizedPhone),
      'Không thể mở cuộc gọi. Vui lòng thử lại.',
      (busy) => setActionBusy(busy ? 'phone' : null),
      setActionError,
    );
  }

  function copyPhone(): void {
    if (!canCall) return;
    void copyPhoneNumber(normalizedPhone).then((copied) => {
      setCopyNotice(copied ? 'Đã sao chép số điện thoại.' : `Không thể tự sao chép. Số quán: ${normalizedPhone}`);
    }).catch(() => setCopyNotice(`Không thể tự sao chép. Số quán: ${normalizedPhone}`));
  }

  function openDirections(): void {
    if (!canOpenDirections || actionBusy) return;
    void runCollectorAction(
      () => zaloClient.openDirections({ lat: stop.merchant.lat, lng: stop.merchant.lng }, stop.merchant.address),
      'Không thể mở chỉ đường. Vui lòng thử lại.',
      (busy) => setActionBusy(busy ? 'directions' : null),
      setActionError,
    );
  }

  return (
    <article className="collector-stop-card">
      <div className={`stop-number ${status ? `stop-number-${status}` : ''}`}>{stop.seq}</div>
      <div className="stop-body">
        <div className="stop-title-row"><h2>{stop.merchant.name}</h2><span className="distance-label">{formatDistance(stop.distance_m)}</span></div>
        <p className="stop-address">{stop.merchant.address ?? 'Chưa có địa chỉ'}</p>
        <strong className="stop-liters">{formatLiters(stop.expected_liters)} dự kiến</strong>
        {pickupVolumeForecast || pickupPriority ? (
          <div className="stop-ai">
            <button
              type="button"
              className="stop-ai-toggle"
              onClick={() => setAiOpen((open) => !open)}
              aria-expanded={aiOpen}
              aria-controls={aiPanelId}
            >
              <span className="stop-ai-toggle-label">Chi tiết AI{pickupPriority ? ` · ${pickupPriority.label}` : ''}</span>
              <span className="stop-ai-toggle-caret" aria-hidden="true">{aiOpen ? '▲' : '▼'}</span>
            </button>
            <div id={aiPanelId} hidden={!aiOpen}>
              {pickupVolumeForecast ? (
                <section className={`pickup-volume-forecast pickup-volume-forecast-${pickupVolumeForecast.className}`} aria-label="Dự báo AI sản lượng">
                  <div className="pickup-volume-forecast-heading"><span className="pickup-volume-ai-label">Dự báo AI</span><span>{pickupVolumeForecast.confidenceLabel}</span></div>
                  {pickupVolumeForecast.predictedLiters === null ? <strong>Chưa đủ dữ liệu để dự báo sản lượng</strong> : <strong>Khoảng {formatPickupVolumeLiters(pickupVolumeForecast.predictedLiters)}</strong>}
                  {pickupVolumeForecast.declaredOnly ? <small>Tạm tính theo số quán khai</small> : pickupVolumeForecast.sampleSize !== null ? <small>Dựa trên {pickupVolumeForecast.sampleSize} lần thu gần nhất</small> : null}
                  {pickupVolumeForecast.reasons.length > 0 ? <div className="pickup-volume-forecast-reasons">{pickupVolumeForecast.reasons.map((reason, index) => <span className="pickup-volume-forecast-reason" key={`${reason}-${index}`}>{reason}</span>)}</div> : null}
                </section>
              ) : null}
              {pickupPriority ? (
                <section className={`pickup-priority pickup-priority-${pickupPriority.className}`} aria-label={`Mức ưu tiên: ${pickupPriority.label}`}>
                  <div className="pickup-priority-heading"><strong>{pickupPriority.label}</strong><span>Điểm ưu tiên: {pickupPriority.score}</span></div>
                  {pickupPriority.reasons.length > 0 ? <div className="pickup-priority-reasons">{pickupPriority.reasons.map((reason, index) => <span className="pickup-priority-reason" key={`${reason}-${index}`}>{reason}</span>)}</div> : null}
                </section>
              ) : null}
            </div>
          </div>
        ) : null}
        {status ? <p className={`transaction-status transaction-status-${status}`}>{statusLabel(status)}</p> : null}
        <div className="stop-actions">
          <button type="button" className={`call-action ${!canCall ? 'disabled-action' : ''}`} onClick={openPhone} disabled={!canCall || actionBusy !== null}>{actionBusy === 'phone' ? 'Đang mở…' : 'Gọi quán'}</button>
          <button type="button" className={`map-action ${!canOpenDirections ? 'disabled-action' : ''}`} onClick={openDirections} disabled={!canOpenDirections || actionBusy !== null}>{actionBusy === 'directions' ? 'Đang mở…' : 'Chỉ đường'}</button>
          <button className="collect-action" onClick={onOpenQr} disabled={status === 'pending' || status === 'syncing'}>{status === 'synced' ? 'Đã thu' : 'Thu gom'}</button>
        </div>
        {phoneIssue ? <p className="action-error" role="alert">{phoneIssue}</p> : null}
        {canCall ? <div className="phone-fallback"><span>Số quán: {normalizedPhone}</span><button type="button" className="text-button" onClick={copyPhone}>Sao chép số</button></div> : null}
        {copyNotice ? <p className="action-notice" role="status">{copyNotice}</p> : null}
        {actionError ? <p className="action-error" role="alert">{actionError}</p> : null}
      </div>
    </article>
  );
}
