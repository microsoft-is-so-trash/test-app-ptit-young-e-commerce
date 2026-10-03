import type { GeoPoint, MerchantRegistrationRequest } from '@eco-oil/shared-types';

export interface MerchantResubmitForm {
  name: string;
  address: string;
  phone: string;
  business_type: string;
}

export type MerchantResubmitPayload = Pick<MerchantRegistrationRequest, 'name' | 'address' | 'phone' | 'business_type' | 'lat' | 'lng'>;

/**
 * Dữ liệu gửi lại hồ sơ quán bị từ chối. Không gửi `ward_id`: backend giữ nguyên phường hiện tại
 * của quán (gửi mã phường cố định từng làm quán bị chuyển sang phường khác).
 */
export function buildMerchantResubmitPayload(form: MerchantResubmitForm, point: GeoPoint): MerchantResubmitPayload {
  return {
    name: form.name,
    address: form.address,
    phone: form.phone,
    business_type: form.business_type,
    lat: point.lat,
    lng: point.lng,
  };
}
