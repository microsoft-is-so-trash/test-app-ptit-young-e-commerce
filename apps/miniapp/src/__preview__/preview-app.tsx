/**
 * Preview harness — CÔNG CỤ NỘI BỘ, không thuộc luồng chạy thật của app.
 *
 * Mục đích: xem trực quan từng màn hình Collector với dữ liệu giả, không cần backend
 * và không cần đăng nhập Zalo (mục 4.1 của eco-oil-miniapp-redesign-plan.md).
 *
 * Phạm vi: CHỈ nhánh Collector (10 màn + 3 component dùng chung — tất cả đã redesign
 * xong). Không bao gồm OrderSheet/HomePage/OrdersPage/... — những màn đó thuộc Merchant,
 * tự gọi API bên trong (TanStack Query/auth store), và ngoài phạm vi redesign hiện tại.
 * Muốn preview Merchant cần dựng hạ tầng giả riêng, không tái dùng file này.
 *
 * File này KHÔNG được index.html nạp nên không nằm trong bundle production.
 */
import { StrictMode, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CollectorEntryScreen,
  CollectorQrScreen,
  CollectorRouteScreen,
  CollectorSummaryScreen,
  OutboxQueueScreen,
  SavedStationReceiptView,
} from '../pages/CollectorFlow';
import {
  ShiftCloseout,
  StationDeliveryReceipt,
  StationDeliveryReview,
  StationSelectScreen,
} from '../pages/StationDeliveryFlow';
import { GradePhotoPicker } from '../components/GradePhotoPicker';
import { OilGradeSelector } from '../components/OilGradeSelector';
import { StatusView } from '../components/StatusView';
import { setOutboxOwner } from '../lib/outbox-db';
import * as fx from './fixtures';
import '../styles.css';

// OutboxQueueScreen tự đọc IndexedDB qua useOutboxRows()/useOutboxStats() (không nhận
// props). Các bản ghi mẫu được seed thủ công một lần qua console (xem README-preview
// trong lịch sử trò chuyện); ở đây chỉ cần khớp đúng owner để chúng hiển thị ra sau khi
// reload — activeOutboxOwnerId là biến trong bộ nhớ, không tồn tại qua lần tải trang.
setOutboxOwner('preview-collector-1');

type PreviewGroup = 'Màn chính' | 'Nộp trạm' | 'Component dùng chung';

interface PreviewEntry {
  id: string;
  label: string;
  group: PreviewGroup;
  /** true = màn hình đầy đủ, cần khung app-shell + collector-shell như luồng thật */
  fullScreen?: boolean;
  render: () => ReactNode;
}

const ENTRIES: PreviewEntry[] = [
  {
    id: 'route',
    label: 'Tuyến thu gom',
    group: 'Màn chính',
    fullScreen: true,
    render: () => (
      <CollectorRouteScreen
        stops={fx.stops}
        route={{ route: fx.route, fromCache: false, cachedAt: null }}
        location={{ lat: 21.03, lng: 105.83 }}
        locationDenied={false}
        completed={{}}
        completedOrderIds={[]}
        totalStops={fx.stops.length}
        outboxRows={fx.outboxRows}
        outboxStats={fx.outboxStats}
        shiftStarted
        shiftError={null}
        prefetching={false}
        refreshing={false}
        refreshNotice={null}
        loadError={false}
        lastReceipt={null}
        onStartShift={fx.noop}
        onCancelShift={fx.noop}
        onOpenQr={fx.noop}
        onOpenSummary={fx.noop}
        onOpenOutbox={fx.noop}
        onRefresh={fx.noop}
        onOpenLastReceipt={fx.noop}
      />
    ),
  },
  {
    id: 'qr',
    group: 'Màn chính',
    label: 'Quét mã can',
    fullScreen: true,
    render: () => <CollectorQrScreen stop={fx.stops[0]} onBack={fx.noop} onContinue={fx.noop} />,
  },
  {
    id: 'entry',
    group: 'Màn chính',
    label: 'Nhập liệu thu gom',
    fullScreen: true,
    render: () => (
      <CollectorEntryScreen
        stop={fx.stops[0]}
        container={fx.container}
        containerCode="ECO-1001"
        onBack={fx.noop}
        onSuccess={fx.noop}
      />
    ),
  },
  {
    id: 'summary',
    group: 'Màn chính',
    label: 'Tóm tắt ca',
    fullScreen: true,
    render: () => (
      <CollectorSummaryScreen
        route={fx.route}
        completed={fx.completed}
        completedCount={Object.keys(fx.completed).length}
        totalStops={fx.stops.length}
        onBack={fx.noop}
        onOpenDelivery={fx.noop}
      />
    ),
  },
  {
    id: 'outbox',
    group: 'Màn chính',
    label: 'Hàng chờ đồng bộ',
    fullScreen: true,
    render: () => <OutboxQueueScreen onBack={fx.noop} />,
  },
  {
    id: 'receipt',
    group: 'Màn chính',
    label: 'Biên nhận đã lưu',
    fullScreen: true,
    render: () => <SavedStationReceiptView receipt={fx.receipt} onBack={fx.noop} />,
  },
  {
    id: 'station-select',
    group: 'Nộp trạm',
    label: 'Chọn trạm nộp',
    fullScreen: true,
    render: () => (
      <StationSelectScreen
        expectedLiters={40.5}
        expectedKg={36.5}
        waiting={0}
        locationDenied={false}
        recommendations={fx.stations}
        loading={false}
        status="success"
        error={null}
        retryingWaiting={false}
        retryError={null}
        onBack={fx.noop}
        onRetryWaiting={fx.noop}
        onChoose={fx.noop}
        onRetry={fx.noop}
      />
    ),
  },
  {
    id: 'station-review',
    group: 'Nộp trạm',
    label: 'Xác nhận nộp trạm',
    fullScreen: true,
    render: () => (
      <StationDeliveryReview
        station={fx.station}
        candidates={fx.candidates}
        expectedLiters={40.5}
        expectedKg={36.5}
        onBack={fx.noop}
        onSubmitted={fx.noop}
      />
    ),
  },
  {
    id: 'station-receipt',
    group: 'Nộp trạm',
    label: 'Phiếu nộp trạm',
    fullScreen: true,
    render: () => (
      <StationDeliveryReceipt
        station={fx.station}
        clientUuid="uuid-delivery-1"
        collectorId="collector-1"
        expectedLiters={40.5}
        candidates={fx.candidates}
        rows={fx.outboxRows}
        onReceiptSaved={fx.noop}
        onCloseOut={async () => true}
        onBack={fx.noop}
      />
    ),
  },
  {
    id: 'closeout',
    group: 'Nộp trạm',
    label: 'Kết ca',
    fullScreen: true,
    render: () => <ShiftCloseout candidates={fx.candidates} onFinish={fx.noop} />,
  },
  {
    id: 'status-view',
    group: 'Component dùng chung',
    label: 'StatusView',
    render: () => (
      <StatusView
        title="Đang liên kết người thu gom"
        message="Đang xác minh lời mời và chuẩn bị tuyến phụ trách…"
        action={{ label: 'Thử lại', onClick: fx.noop }}
      />
    ),
  },
  {
    id: 'grade-selector',
    group: 'Component dùng chung',
    label: 'OilGradeSelector',
    render: () => <OilGradeSelector value={null} disabled={false} onChange={fx.noop} />,
  },
  {
    id: 'grade-photo',
    group: 'Component dùng chung',
    label: 'GradePhotoPicker',
    render: () => (
      <GradePhotoPicker
        photos={[]}
        busy={false}
        disabled={false}
        message={null}
        onTakePhoto={fx.noop}
        onChooseAlbum={fx.noop}
        onChooseFile={fx.noop}
        onRemovePhoto={fx.noop}
      />
    ),
  },
];

function useHashId(): string {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('hashchange', cb);
      return () => window.removeEventListener('hashchange', cb);
    },
    () => window.location.hash.replace('#', '') || ENTRIES[0].id,
    () => ENTRIES[0].id,
  );
}

const GROUP_ORDER: PreviewGroup[] = ['Màn chính', 'Nộp trạm', 'Component dùng chung'];

function PreviewShell() {
  const activeId = useHashId();
  const active = ENTRIES.find((e) => e.id === activeId) ?? ENTRIES[0];

  return (
    <>
      {/* Thanh chọn màn hình của công cụ preview — CHỈ 1 dòng để không ăn mất chiều cao
          khung xem. Đây không phải giao diện của app. */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: 36,
          padding: '0 8px',
          background: '#1b2a16',
        }}
      >
        <span style={{ color: '#9fd3a8', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>
          PREVIEW
        </span>
        <select
          value={active.id}
          onChange={(event) => { window.location.hash = event.target.value; }}
          style={{
            flex: 1,
            minWidth: 0,
            height: 26,
            padding: '0 6px',
            border: '1px solid #3d5c35',
            borderRadius: 5,
            color: '#e7efe3',
            background: '#24381d',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {GROUP_ORDER.map((group) => (
            <optgroup key={group} label={group}>
              {ENTRIES.filter((entry) => entry.group === group).map((entry) => (
                <option key={entry.id} value={entry.id} style={{ color: '#111', background: '#fff' }}>
                  {entry.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <span style={{ color: '#7d9a74', fontSize: 11, whiteSpace: 'nowrap' }}>
          {ENTRIES.indexOf(active) + 1}/{ENTRIES.length}
        </span>
      </nav>
      {active.fullScreen ? (
        // Khung y hệt nhánh Collector trong App.tsx, nếu không sẽ đánh giá sai nền/khoảng cách
        <div className="app-shell collector-shell">
          <main className="main-area" style={{ paddingTop: 12 }}>
            <div className="page-content" style={{ paddingTop: 24, paddingBottom: 32 }}>
              {active.render()}
            </div>
          </main>
        </div>
      ) : (
        <div className="app-shell collector-shell">
          <main className="main-area" style={{ paddingTop: 12 }}>
            <div className="page-content">{active.render()}</div>
          </main>
        </div>
      )}
    </>
  );
}

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <PreviewShell />
  </StrictMode>,
);
