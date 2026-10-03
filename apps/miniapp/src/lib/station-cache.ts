import type { GeoPoint, StationRecommendation } from '@eco-oil/shared-types';
import { isValidGeoPoint } from './zalo-client';

const EARTH_RADIUS_M = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Khoảng cách đường chim bay (công thức haversine), dùng khi mất mạng (I1.3, E5). */
export function straightLineMeters(from: GeoPoint, to: GeoPoint): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Khoảng cách kèm nguồn: "đường ô tô" (Routes API) hoặc "đường chim bay" (dự phòng) — I1.2, Q23, Q26. */
export function stationDistanceLabel(station: Pick<StationRecommendation, 'distance_m' | 'distance_source'>): string {
  const distance = station.distance_m < 1000 ? `${Math.round(station.distance_m)} m` : `${(station.distance_m / 1000).toFixed(1)} km`;
  if (station.distance_source === 'road') return `${distance} · đường ô tô`;
  if (station.distance_source === 'straight') return `${distance} · đường chim bay`;
  return distance;
}

/**
 * Xếp lại danh sách trạm đã lưu lúc Bắt đầu ca theo vị trí hiện tại, lọc như máy chủ
 * (còn đủ chỗ cho số lít đang mang). Sức chứa là số liệu lúc lưu.
 */
export function recommendFromCachedStations(
  stations: ReadonlyArray<StationRecommendation>,
  location: GeoPoint,
  liters: number,
): StationRecommendation[] {
  return stations
    .filter((station) => isValidGeoPoint({ lat: station.lat, lng: station.lng }))
    .filter((station) => station.remaining_capacity_l >= liters)
    .map((station) => ({ ...station, distance_m: straightLineMeters(location, { lat: station.lat, lng: station.lng }), distance_source: 'straight' as const }))
    .sort((a, b) => a.distance_m - b.distance_m || a.id.localeCompare(b.id));
}
