import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Map as LeafletMap } from 'leaflet';
import type { CollectorNearbyOrder, GeoPoint } from '@eco-oil/shared-types';
import { ApiError, api } from '../../lib/api';
import { formatLiters } from '../../lib/formatters';
import { formatDistance } from '../../lib/collector-format';
import { CollectorNotice } from '../../components/CollectorNotice';
import { StatusView } from '../../components/StatusView';
import { Icon } from '../../components/Icon';
import { useOnlineStatus } from '../../lib/outbox-hooks';
import { isValidGeoPoint, zaloClient } from '../../lib/zalo-client';
import { useAuthStore } from '../../stores/auth-store';

const DEFAULT_RADIUS_M = 5000;

export function CollectorMapPage() {
  const collectorId = useAuthStore((state) => state.user?.collectorId ?? state.user?.id ?? 'unknown');
  const online = useOnlineStatus();
  const [location, setLocation] = useState<GeoPoint | null>(null);

  useEffect(() => {
    let active = true;
    void zaloClient
      .getLocation()
      .then((point) => {
        if (active && point && isValidGeoPoint(point)) setLocation(point);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const orders = useQuery({
    queryKey: ['collector-nearby-orders', collectorId, location?.lat, location?.lng],
    queryFn: () => api.nearbyOrders(location ?? undefined, DEFAULT_RADIUS_M),
  });

  if (orders.isPending) return <StatusView title="Đang tải điểm thu gom quanh bạn…" />;
  if (orders.isError) {
    return (
      <StatusView
        title="Chưa tải được danh sách điểm"
        message={orders.error instanceof ApiError ? orders.error.message : 'Kiểm tra kết nối rồi thử lại.'}
        action={{ label: 'Thử lại', onClick: () => { void orders.refetch(); } }}
      />
    );
  }

  const data = orders.data;
  const inRoute = data.filter((order) => order.in_current_route).length;

  return (
    <div className="page-content collector-content collector-map-screen">
      <header className="collector-screen-heading">
        <p className="eyebrow">BẢN ĐỒ ĐIỂM THU</p>
        <h1>Điểm chờ thu quanh địa bàn</h1>
      </header>

      {data.length === 0 ? (
        <StatusView title="Chưa có điểm nào chờ thu" message="Khi có quán báo sẵn sàng, điểm sẽ hiện trên bản đồ." />
      ) : (
        <>
          <CollectorNotice icon="pin_drop" title={`${data.length} điểm trong bán kính ${DEFAULT_RADIUS_M / 1000} km`}>
            {inRoute > 0 ? `${inRoute} điểm đã nằm trong tuyến của bạn.` : 'Chưa điểm nào nằm trong tuyến hiện tại.'}
          </CollectorNotice>

          {online ? (
            <NearbyMap orders={data} center={location} />
          ) : (
            <CollectorNotice tone="warning" icon="wifi_off" title="Đang ngoại tuyến">
              Bản đồ cần mạng để tải. Dưới đây là danh sách điểm sắp xếp theo khoảng cách.
            </CollectorNotice>
          )}

          <section className="collector-map-list">
            {data.map((order) => (
              <NearbyOrderRow key={order.order_id} order={order} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function NearbyMap({ orders, center }: { orders: CollectorNearbyOrder[]; center: GeoPoint | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    let map: LeafletMap | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const leaflet = await import('leaflet');
        await import('leaflet/dist/leaflet.css');
        if (cancelled || !containerRef.current) return;

        const first = orders[0];
        const origin = center ?? (first ? { lat: first.lat, lng: first.lng } : { lat: 21.0221, lng: 105.8524 });
        map = leaflet.map(element, { attributionControl: true }).setView([origin.lat, origin.lng], 14);
        leaflet
          .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap',
          })
          .addTo(map);

        if (center) {
          leaflet
            .circleMarker([center.lat, center.lng], { radius: 7, color: '#1b6d24', fillColor: '#1b6d24', fillOpacity: 1 })
            .bindPopup('Vị trí của bạn')
            .addTo(map);
        }

        for (const order of orders) {
          const color = order.in_current_route ? '#1b6d24' : '#b7791f';
          leaflet
            .circleMarker([order.lat, order.lng], { radius: 9, color, fillColor: color, fillOpacity: 0.85, weight: 2 })
            .bindPopup(
              `<strong>${escapeHtml(order.merchant_name)}</strong><br/>${
                order.expected_liters === null ? 'Chưa rõ số lít' : `${order.expected_liters} lít dự kiến`
              }${order.in_current_route ? '<br/>Đang trong tuyến của bạn' : ''}`,
            )
            .addTo(map);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [center, orders]);

  if (failed) {
    return (
      <CollectorNotice tone="warning" icon="map" title="Chưa tải được bản đồ">
        Vẫn xem được danh sách điểm bên dưới.
      </CollectorNotice>
    );
  }

  return <div ref={containerRef} className="collector-map-canvas" role="img" aria-label="Bản đồ các điểm chờ thu gom" />;
}

function NearbyOrderRow({ order }: { order: CollectorNearbyOrder }) {
  const [mapError, setMapError] = useState<string | null>(null);
  return (
    <article className={`collector-map-row ${order.in_current_route ? 'collector-map-row-in-route' : ''}`}>
      <div className="collector-map-row-body">
        <div className="collector-map-row-top">
          <strong>{order.merchant_name}</strong>
          {order.distance_m === null ? null : <span>{formatDistance(order.distance_m)}</span>}
        </div>
        <span>{order.address ?? 'Chưa có địa chỉ'}</span>
        <span className="collector-map-row-meta">
          {order.expected_liters === null ? 'Chưa rõ số lít' : `${formatLiters(order.expected_liters)} dự kiến`}
          {order.in_current_route ? ' · Đang trong tuyến' : ''}
        </span>
        {mapError ? <p className="error-text">{mapError}</p> : null}
      </div>
      <div className="collector-map-row-actions">
        {order.phone ? (
          <button className="btn btn-secondary" onClick={() => { void zaloClient.openPhone(order.phone ?? '').catch(() => undefined); }}>
            <Icon name="call" size={16} />
            <span>Gọi</span>
          </button>
        ) : null}
        <button
          className="btn btn-secondary"
          onClick={() => {
            setMapError(null);
            void zaloClient
              .openDirections({ lat: order.lat, lng: order.lng }, order.address)
              .catch((error: unknown) => setMapError(error instanceof Error ? error.message : 'Không mở được chỉ đường.'));
          }}
        >
          <Icon name="directions" size={16} />
          <span>Chỉ đường</span>
        </button>
      </div>
    </article>
  );
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) =>
    char === '&' ? '&amp;' : char === '<' ? '&lt;' : char === '>' ? '&gt;' : char === '"' ? '&quot;' : '&#39;',
  );
}
