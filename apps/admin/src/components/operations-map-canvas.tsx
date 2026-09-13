'use client';

import 'leaflet/dist/leaflet.css';

import { useEffect, useRef, useState } from 'react';
import type * as LeafletNamespace from 'leaflet';
import type { Map as LeafletMap } from 'leaflet';
import type {
  AdminActiveRoute,
  AdminOperationsMapMerchant,
  AdminOperationsMapStation,
  AdminOperationsMapWard,
  MerchantEfficiencyLevel,
} from '@eco-oil/shared-types';

/** Màu theo mức độ vận hành — xanh ổn, vàng trung bình, đỏ cảnh báo, xám chưa đủ dữ liệu. */
export const LEVEL_COLOR: Record<MerchantEfficiencyLevel, string> = {
  HEALTHY: '#1b6d24',
  WATCH: '#b45309',
  AT_RISK: '#ba1a1a',
  INSUFFICIENT_DATA: '#717971',
};

export const LEVEL_LABEL: Record<MerchantEfficiencyLevel, string> = {
  HEALTHY: 'Vận hành ổn',
  WATCH: 'Cần để mắt',
  AT_RISK: 'Cảnh báo',
  INSUFFICIENT_DATA: 'Chưa đủ dữ liệu',
};

/** Mỗi tuyến một màu để phân biệt khi nhiều xe chạy chồng địa bàn. */
const ROUTE_COLORS = ['#1d4ed8', '#7c3aed', '#0891b2', '#c2410c', '#4d7c0f'];

const HANOI_CENTER: [number, number] = [21.0278, 105.8342];

interface OperationsMapCanvasProps {
  merchants: AdminOperationsMapMerchant[];
  wards: AdminOperationsMapWard[];
  stations: AdminOperationsMapStation[];
  routes: AdminActiveRoute[];
  showWardZones: boolean;
  showRoutes: boolean;
}

export function OperationsMapCanvas({
  merchants,
  wards,
  stations,
  routes,
  showWardZones,
  showRoutes,
}: OperationsMapCanvasProps) {
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
        if (cancelled || !containerRef.current) return;

        map = leaflet.map(element, { attributionControl: true }).setView(HANOI_CENTER, 13);
        leaflet
          .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap',
          })
          .addTo(map);

        if (showWardZones) drawWardZones(leaflet, map, wards);
        if (showRoutes) drawRoutes(leaflet, map, routes);
        drawStations(leaflet, map, stations);
        drawMerchants(leaflet, map, merchants);

        const points = merchants
          .map((merchant) => [merchant.lat, merchant.lng] as [number, number])
          .concat(
            stations
              .filter((station) => station.lat !== null && station.lng !== null)
              .map((station) => [station.lat as number, station.lng as number]),
          );
        if (points.length > 0) map.fitBounds(leaflet.latLngBounds(points).pad(0.15));
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [merchants, routes, showRoutes, showWardZones, stations, wards]);

  if (failed) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-outline-variant/50 bg-surface-container-low p-5">
        <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">map</span>
        <div>
          <p className="font-semibold text-on-surface">Chưa tải được bản đồ</p>
          <p className="text-sm text-on-surface-variant">
            Kiểm tra kết nối tới máy chủ bản đồ. Bảng thống kê theo khu vực bên dưới vẫn dùng được.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[620px] w-full rounded-2xl border border-outline-variant/50"
      role="img"
      aria-label="Bản đồ vận hành: vị trí quán, trạm, vùng khu vực và tuyến thu gom đang chạy"
    />
  );
}

type Leaflet = typeof LeafletNamespace;

/**
 * Vùng khu vực vẽ bằng hình tròn quanh tâm phường: bảng wards có cột boundary
 * dạng MultiPolygon nhưng chưa có dữ liệu, nên tạm dùng bán kính theo sản lượng.
 */
function drawWardZones(leaflet: Leaflet, map: LeafletMap, wards: AdminOperationsMapWard[]): void {
  const maxLiters = Math.max(...wards.map((ward) => ward.expected_liters), 1);
  for (const ward of wards) {
    if (ward.center_lat === null || ward.center_lng === null) continue;
    const share = ward.expected_liters / maxLiters;
    const color = LEVEL_COLOR[ward.efficiency_level];
    leaflet
      .circle([ward.center_lat, ward.center_lng], {
        radius: 400 + share * 900,
        color,
        fillColor: color,
        fillOpacity: 0.12,
        weight: 1.5,
        opacity: 0.55,
      })
      .bindPopup(
        `<strong>${escapeHtml(ward.name)}</strong><br/>${escapeHtml(ward.district)}` +
          `<br/>${formatLiters(ward.expected_liters)} dự kiến` +
          `<br/>${ward.merchant_count} quán · ${LEVEL_LABEL[ward.efficiency_level]}`,
      )
      .addTo(map);
  }
}

function drawRoutes(leaflet: Leaflet, map: LeafletMap, routes: AdminActiveRoute[]): void {
  routes.forEach((route, index) => {
    const color = ROUTE_COLORS[index % ROUTE_COLORS.length];
    const path = route.stops
      .filter((stop) => stop.lat !== null && stop.lng !== null)
      .map((stop) => [stop.lat as number, stop.lng as number] as [number, number]);
    const origin: [number, number] | null =
      route.origin_lat !== null && route.origin_lng !== null ? [route.origin_lat, route.origin_lng] : null;
    const line = origin ? [origin, ...path] : path;
    if (line.length < 2) return;

    leaflet
      .polyline(line, { color, weight: 4, opacity: 0.75 })
      .bindPopup(
        `<strong>${escapeHtml(route.collector_name)}</strong>` +
          `<br/>${route.completed_stop_count}/${route.stop_count} điểm đã thu` +
          `<br/>${formatLiters(route.total_expected_liters)} dự kiến`,
      )
      .addTo(map);

    if (origin) {
      leaflet
        .circleMarker(origin, { radius: 6, color, fillColor: '#ffffff', fillOpacity: 1, weight: 3 })
        .bindPopup(`Điểm xuất phát — ${escapeHtml(route.collector_name)}`)
        .addTo(map);
    }
  });
}

function drawStations(leaflet: Leaflet, map: LeafletMap, stations: AdminOperationsMapStation[]): void {
  for (const station of stations) {
    if (station.lat === null || station.lng === null) continue;
    leaflet
      .marker([station.lat, station.lng], {
        icon: leaflet.divIcon({
          className: '',
          html:
            '<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;' +
            'border-radius:9px;background:#39656b;color:#fff;font-size:17px;' +
            'box-shadow:0 2px 6px rgba(0,0,0,0.35)">&#127981;</div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
        title: station.name,
      })
      .bindPopup(
        `<strong>${escapeHtml(station.name)}</strong>` +
          `<br/>${escapeHtml(station.address ?? 'Chưa có địa chỉ')}` +
          `<br/>Đã chứa ${station.fill_pct.toFixed(0)}% (${formatLiters(station.current_volume_l)}/${formatLiters(station.capacity_l)})`,
      )
      .addTo(map);
  }
}

function drawMerchants(leaflet: Leaflet, map: LeafletMap, merchants: AdminOperationsMapMerchant[]): void {
  for (const merchant of merchants) {
    const color = LEVEL_COLOR[merchant.efficiency_level];
    // Điểm đỏ vẽ to hơn để nổi lên giữa đám chấm xanh.
    const radius = merchant.efficiency_level === 'AT_RISK' ? 9 : 7;
    leaflet
      .circleMarker([merchant.lat, merchant.lng], {
        radius,
        color,
        fillColor: color,
        fillOpacity: 0.85,
        weight: 2,
      })
      .bindPopup(buildMerchantPopup(merchant))
      .addTo(map);
  }
}

function buildMerchantPopup(merchant: AdminOperationsMapMerchant): string {
  const expected =
    merchant.expected_liters === null
      ? 'Chưa có số dự kiến'
      : `${formatLiters(merchant.expected_liters)} ${
          merchant.expected_liters_source === 'READY_ORDER' ? '(quán đã báo)' : '(AI dự báo)'
        }`;
  const reasons =
    merchant.efficiency_reasons.length === 0
      ? ''
      : `<br/><span style="color:${LEVEL_COLOR[merchant.efficiency_level]}">${merchant.efficiency_reasons
          .map((code) => escapeHtml(REASON_LABEL[code] ?? code))
          .join(' · ')}</span>`;

  return (
    `<strong>${escapeHtml(merchant.name)}</strong>` +
    `<br/>${escapeHtml(merchant.ward_name ?? 'Chưa rõ phường')}` +
    `<br/>${expected}` +
    `<br/>${LEVEL_LABEL[merchant.efficiency_level]}${
      merchant.efficiency_level === 'INSUFFICIENT_DATA' ? '' : ` · ${merchant.efficiency_score} điểm rủi ro`
    }` +
    reasons
  );
}

export const REASON_LABEL: Record<string, string> = {
  NO_COLLECTION_HISTORY: 'Chưa từng thu gom',
  NO_CADENCE_BASELINE: 'Chưa có nhịp thu chuẩn',
  SEVERELY_OVERDUE: 'Quá hạn rất lâu',
  OVERDUE: 'Quá hạn thu gom',
  DUE_NOW: 'Đến hạn thu',
  VERY_LOW_YIELD: 'Mỗi lượt rất ít dầu',
  LOW_YIELD: 'Mỗi lượt ít dầu',
  SUSPECTED_ADULTERATION: 'Nghi ngờ pha lẫn',
  MULTIPLE_OPEN_ALERTS: 'Nhiều cảnh báo chưa xử lý',
  OPEN_ALERT: 'Có cảnh báo chưa xử lý',
  FAR_FROM_STATION: 'Xa trạm',
  MISSING_DISTANCE: 'Chưa rõ khoảng cách',
};

export function formatLiters(value: number): string {
  return `${value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} L`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) =>
    char === '&' ? '&amp;' : char === '<' ? '&lt;' : char === '>' ? '&gt;' : char === '"' ? '&quot;' : '&#39;',
  );
}
