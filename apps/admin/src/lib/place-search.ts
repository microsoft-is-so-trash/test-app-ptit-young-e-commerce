/** Tìm vị trí trạm theo địa chỉ (I1.1). Gõ ≥ 3 ký tự và dừng 300 ms mới gọi API (Q27). */
export const PLACES_MIN_CHARS = 3;
export const PLACES_MAX_CHARS = 200;
export const PLACES_DEBOUNCE_MS = 300;

export function shouldSearchPlaces(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.length >= PLACES_MIN_CHARS && trimmed.length <= PLACES_MAX_CHARS;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

/** Toạ độ đang có trong form, null nếu chưa nhập hoặc không hợp lệ. */
export function parseCoordinates(lat: string, lng: string): Coordinates | null {
  if (!lat.trim() || !lng.trim()) return null;
  const values = { lat: Number(lat), lng: Number(lng) };
  if (!Number.isFinite(values.lat) || !Number.isFinite(values.lng)) return null;
  if (values.lat < -90 || values.lat > 90 || values.lng < -180 || values.lng > 180) return null;
  return values;
}

/** 6 chữ số thập phân (khoảng 0,1 m), đủ cho vị trí trạm. */
export function formatCoordinate(value: number): string {
  return value.toFixed(6);
}

export function newPlacesSessionToken(): string {
  return crypto.randomUUID();
}

export interface PlaceSuggestion {
  place_id: string;
  text: string;
  main_text: string | null;
  secondary_text: string | null;
}

export interface PlaceLocation {
  place_id: string;
  address: string | null;
  lat: number;
  lng: number;
}
