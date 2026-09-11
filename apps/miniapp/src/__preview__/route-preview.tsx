/**
 * TEMPORARY preview harness — không thuộc source chính, xoá sau khi xem xong.
 * Mục đích: render CollectorRouteScreen thật với props giả để kiểm tra trực quan
 * mà không cần backend / đăng nhập Zalo (mục 4.1 của plan redesign).
 * Dữ liệu mẫu lấy theo đúng quán đã seed trong scripts/seed-demo.ts.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { CurrentRouteResponse, RouteStop } from '@eco-oil/shared-types';
import { CollectorRouteScreen } from '../pages/CollectorFlow';
import { BrandHeader } from '../App';
import type { OutboxRecord, OutboxStats, StoredStationReceipt } from '../lib/outbox-db';
import '../styles.css';

function stop(
  seq: number,
  name: string,
  address: string,
  phone: string,
  lat: number,
  lng: number,
  expected: number,
  distance: number,
  level: RouteStop['pickup_priority_level'],
  reasons: string[],
  forecast: RouteStop['pickup_volume_forecast'],
): RouteStop {
  return {
    seq,
    order_id: `order-${seq}`,
    merchant: { name, address, phone, lat, lng },
    container_code: `ECO-${1000 + seq}`,
    expected_liters: expected,
    priority: seq,
    distance_m: distance,
    pickup_priority_score: 100 - seq * 7,
    pickup_priority_level: level,
    pickup_priority_reason_codes: reasons,
    pickup_volume_forecast: forecast,
  };
}

const stops: RouteStop[] = [
  // Reason code chỉ dùng đúng các mã API thật phát ra (apps/api/src/modules/orders/merchant-pickup-priority.ts)
  stop(1, 'Bếp Xanh Cống Vị', '52 Đội Cấn, Ba Đình, Hà Nội', '0901000002', 21.0352, 105.8151, 24, 850, 'URGENT',
    ['NEAR_FULL', 'OVERDUE_COLLECTION'],
    { predicted_liters: 26.5, confidence: 'HIGH', sample_size: 12, reason_codes: ['HISTORY_WEIGHTED', 'STABLE_HISTORY'] }),
  stop(2, 'Phở Nguyễn Du', '40 Nguyễn Du, Hai Bà Trưng, Hà Nội', '0901000003', 21.0187, 105.8458, 18, 2100, 'HIGH',
    ['HIGH_FILL', 'NEARBY'],
    { predicted_liters: 17.2, confidence: 'MEDIUM', sample_size: 5, reason_codes: ['LIMITED_HISTORY'] }),
  stop(3, 'Cơm Nhà Hồ Gươm', '8 Đinh Tiên Hoàng, Hoàn Kiếm, Hà Nội', '0901000004', 21.0288, 105.8524, 12, 3400, 'NORMAL',
    ['MEDIUM_FILL'],
    { predicted_liters: null, confidence: 'INSUFFICIENT_DATA', sample_size: 0, reason_codes: ['DECLARED_ESTIMATE_ONLY'] }),
  stop(4, 'Bún Riêu Trung Tự', '16 Phạm Ngọc Thạch, Đống Đa, Hà Nội', '0901000005', 21.0097, 105.8302, 9, 5200, 'LOW',
    ['ALREADY_SCHEDULED', 'MISSING_DISTANCE'],
    { predicted_liters: 8.4, confidence: 'LOW', sample_size: 3, reason_codes: ['VOLATILE_HISTORY'] }),
];

const route: CurrentRouteResponse = {
  stops,
  total_expected_liters: 63,
  remaining_capacity_l: 17,
  route_id: 'route-demo-1',
  route_status: 'ACTIVE',
  persisted: true,
  started_at: new Date().toISOString(),
  route_optimization: {
    estimated_distance_before_m: 14200,
    estimated_distance_after_m: 11550,
    saved_distance_m: 2650,
    optimization_applied: true,
    reason_codes: ['ROUTE_OPTIMIZED'],
  },
  route_capacity_risk: {
    predicted_total_liters: 68,
    risk_adjusted_total_liters: 74,
    risk_adjusted_remaining_liters: 6,
    risk_utilization_pct: 92,
    level: 'NEAR_CAPACITY',
    confidence: 'MEDIUM',
    forecast_coverage_pct: 75,
    reason_codes: ['FORECAST_ABOVE_DECLARED'],
  },
};

const outboxRows: OutboxRecord[] = [
  {
    client_uuid: 'uuid-1',
    type: 'collection',
    payload: { order_id: 'order-1' },
    status: 'pending',
    attempts: 1,
    last_error: null,
    next_attempt_at: null,
    created_at: new Date().toISOString(),
    synced_at: null,
  },
];

const outboxStats: OutboxStats = { pending: 1, syncing: 0, failed: 0, synced: 3, bytes: 2048, over_limit: false };

const noop = (): void => undefined;

// Tái hiện ĐÚNG cấu trúc nhánh Collector trong App.tsx (BrandHeader cố định + page-content
// bọc ngoài + hàng nút Thoát), nếu không sẽ đánh giá sai phần nền/khoảng cách.
createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <div className="app-shell collector-shell">
      <BrandHeader title="Tuyến hôm nay" />
      <main className="main-area">
        <div className="page-content" style={{ paddingTop: 24, paddingBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div />
          <button className="header-signout">Thoát</button>
        </div>
        <CollectorRouteScreen
          stops={stops}
          route={{ route, fromCache: false, cachedAt: null }}
          location={{ lat: 21.03, lng: 105.83 }}
          locationDenied={false}
          completed={{}}
          completedOrderIds={[]}
          totalStops={stops.length}
          outboxRows={outboxRows}
          outboxStats={outboxStats}
          shiftStarted
          shiftError={null}
          prefetching={false}
          refreshing={false}
          refreshNotice={{ kind: 'success', message: 'Đã cập nhật tuyến mới nhất.' }}
          loadError={false}
          lastReceipt={{
            receipt_id: 'RC-2026-0911-001',
            client_uuid: 'uuid-receipt-1',
            station_id: 'station-1',
            station_name: 'Trạm ECollect Hồ Gươm',
            collector_id: 'collector-1',
            created_at: new Date().toISOString(),
            expected_liters: 63,
            expected_kg: null,
            actual_liters: 61,
            actual_kg: null,
            variance_liters: -2,
            variance_kg: null,
          } as StoredStationReceipt}
          onStartShift={noop}
          onCancelShift={noop}
          onOpenQr={noop}
          onOpenSummary={noop}
          onOpenOutbox={noop}
          onRefresh={noop}
          onOpenLastReceipt={noop}
        />
        </div>
      </main>
    </div>
  </StrictMode>,
);
