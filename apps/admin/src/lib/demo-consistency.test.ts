import { describe, expect, it } from 'vitest';
import {
  DEMO_COLLECTORS,
  DEMO_CONTAINERS,
  DEMO_MERCHANTS,
  DEMO_OIL_UNIT_PRICE,
  DEMO_WARDS,
  WARD_CENTER,
} from './demo-dataset';
import { demoCurrentStations } from './demo-admin-store';
// Nhập thẳng dữ liệu demo của miniapp để hai bên không trôi khỏi nhau.
import {
  DEMO_STATIONS as MINIAPP_STATIONS,
  demoCollectorProfile,
  demoNearbyOrders,
} from '../../../miniapp/src/lib/demo-collector-fixtures';

/**
 * Bảng quản trị và app của quán / người thu gom phải nói về cùng một địa bàn.
 * Nếu ai đó đổi dữ liệu demo ở một bên mà quên bên kia, các test này phải đỏ.
 */
describe('dữ liệu demo của admin khớp với miniapp', () => {
  it('dùng chung tâm phường Hàng Bài', () => {
    const wardHangBai = DEMO_WARDS.find((ward) => ward.code === '00091');

    expect(wardHangBai).toBeDefined();
    expect(wardHangBai?.name).toBe('Phường Hàng Bài');
    expect(wardHangBai?.center_lat).toBe(WARD_CENTER.lat);
    expect(wardHangBai?.center_lng).toBe(WARD_CENTER.lng);
  });

  it('giữ đúng tên, số điện thoại và sức chứa xe của hai người thu gom', () => {
    for (const collectorId of ['demo-collector-001', 'demo-collector-002']) {
      const fromMiniapp = demoCollectorProfile(collectorId);
      const fromAdmin = DEMO_COLLECTORS.find((collector) => collector.id === collectorId);

      expect(fromAdmin, `thiếu ${collectorId} trong dữ liệu admin`).toBeDefined();
      expect(fromAdmin?.display_name).toBe(fromMiniapp.display_name);
      expect(fromAdmin?.contact_phone).toBe(fromMiniapp.contact_phone);
      expect(fromAdmin?.vehicle_type).toBe(fromMiniapp.vehicle_type);
      expect(fromAdmin?.max_capacity_l).toBe(fromMiniapp.max_capacity_l);
    }
  });

  it('có đủ các quán mà người thu gom nhìn thấy trên bản đồ của họ', () => {
    const nearby = demoNearbyOrders('demo-collector-001');
    const adminNames = new Set(DEMO_MERCHANTS.map((merchant) => merchant.name));

    for (const order of nearby) {
      expect(adminNames, `quán "${order.merchant_name}" chưa có trong dữ liệu admin`).toContain(
        order.merchant_name,
      );
    }
  });

  it('đặt các quán trong tuyến đúng toạ độ mà người thu gom thấy', () => {
    const nearby = demoNearbyOrders('demo-collector-001');

    for (const order of nearby) {
      const merchant = DEMO_MERCHANTS.find((item) => item.name === order.merchant_name);
      expect(merchant).toBeDefined();
      expect(merchant?.lat).toBeCloseTo(order.lat, 6);
      expect(merchant?.lng).toBeCloseTo(order.lng, 6);
    }
  });

  it('dùng đúng mã can mà người thu gom quét', () => {
    const nearby = demoNearbyOrders('demo-collector-001');
    const adminCodes = new Set(DEMO_CONTAINERS.map((container) => container.qr_code));

    for (const order of nearby) {
      if (order.container_code === null) continue;
      expect(adminCodes, `can ${order.container_code} chưa có trong kho demo`).toContain(
        order.container_code,
      );
    }
  });

  it('dùng chung hai trạm tập kết', () => {
    const adminStations = demoCurrentStations();

    for (const station of MINIAPP_STATIONS) {
      const match = adminStations.find((item) => item.id === station.id);
      expect(match, `thiếu trạm ${station.name}`).toBeDefined();
      expect(match?.name).toBe(station.name);
      expect(match?.address).toBe(station.address);
      expect(match?.lat).toBe(station.lat);
      expect(match?.lng).toBe(station.lng);
      expect(match?.capacity_l).toBe(station.capacity_l);
      expect(match?.current_volume_l).toBe(station.current_volume_l);
    }
  });

  it('giữ quán Cô Ba là quán đã duyệt, đúng id mà miniapp dùng', () => {
    const coBa = DEMO_MERCHANTS.find((merchant) => merchant.id === 'demo-merchant-001');

    expect(coBa?.name).toBe('Quán ăn Cô Ba');
    expect(coBa?.phone).toBe('0908123456');
    expect(coBa?.container_code).toBe('ECO-0142');
    expect(coBa?.approval_status).toBe('APPROVED');
  });

  it('giữ quán Hương Liên ở trạng thái chờ duyệt để tab Duyệt quán có việc', () => {
    const huongLien = DEMO_MERCHANTS.find((merchant) => merchant.id === 'demo-merchant-002');

    expect(huongLien?.name).toBe('Bún chả Hương Liên');
    expect(huongLien?.approval_status).toBe('PENDING');
  });

  it('dùng chung đơn giá dầu 6.000 đ/lít', () => {
    expect(DEMO_OIL_UNIT_PRICE).toBe(6000);
  });
});
