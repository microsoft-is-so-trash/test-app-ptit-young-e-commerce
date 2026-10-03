import type { GeoPoint } from '@eco-oil/shared-types';
import { isValidGeoPoint } from './zalo-client';

/** Lấy GPS cho màn nhập thu gom; lỗi thì trả câu báo lỗi nói cách sửa (U10). */
export async function requestEntryGps(getLocation: () => Promise<GeoPoint | null>): Promise<{ point: GeoPoint | null; error: string | null }> {
  try {
    const point = await getLocation();
    if (!point || !isValidGeoPoint(point)) {
      return { point: null, error: 'GPS không trả về tọa độ hợp lệ. Hãy bật vị trí rồi bấm Lấy lại GPS.' };
    }
    return { point, error: null };
  } catch (error) {
    return { point: null, error: error instanceof Error ? error.message : 'Không lấy được GPS. Hãy kiểm tra quyền vị trí rồi thử lại.' };
  }
}

/** Màn nhập tự lấy GPS khi mở (C5.3); nút "Lấy lại GPS" chỉ hiện khi lỗi hoặc đang dùng tâm phường. */
export function entryGpsStatus({ locating, hasGeo, error, usedFallback }: { locating: boolean; hasGeo: boolean; error: string | null; usedFallback: boolean }): { text: string; showRetry: boolean } {
  if (locating) return { text: 'Đang lấy GPS…', showRetry: false };
  if (usedFallback) return { text: 'Đang dùng vị trí dự phòng là tâm phường, không phải GPS thực tế.', showRetry: true };
  if (error) return { text: `Chưa lấy được GPS: ${error}`, showRetry: true };
  if (hasGeo) return { text: 'Đã lấy vị trí GPS thực tế.', showRetry: false };
  return { text: 'GPS sẽ được lấy khi xác nhận.', showRetry: true };
}
