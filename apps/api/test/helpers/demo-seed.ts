import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { PrismaService } from '../../src/prisma/prisma.service';

/**
 * Thực thể do `scripts/seed-demo.ts` tạo. CI chạy `pnpm db:seed` (seed-demo) trước test e2e,
 * nên test dùng lại các thực thể này (quyết định Q25, 03/10/2026). File seed-demo là vùng cấm:
 * chỉ chép lại định danh ở đây, không sửa seed. Dữ liệu test cần thêm (can, đơn, giá dầu…) do
 * từng test tự tạo.
 */
export type DemoWardCode = 'HB-HK-DEMO' | 'CV-BD-DEMO' | 'NT-HBT-DEMO' | 'TD-DD-DEMO';

export interface DemoMerchant {
  id: string;
  userId: string;
  zaloId: string;
  phone: string;
  name: string;
  wardCode: DemoWardCode;
  lat: number;
  lng: number;
  containerId: string;
  containerCode: string;
}

function demoMerchant(index: number, zaloId: string, name: string, wardCode: DemoWardCode, lat: number, lng: number): DemoMerchant {
  const seq = String(index).padStart(12, '0');
  return {
    id: `71000000-0000-4000-8000-${seq}`,
    userId: `71100000-0000-4000-8000-${seq}`,
    zaloId,
    phone: `090100000${index}`,
    name,
    wardCode,
    lat,
    lng,
    containerId: `72000000-0000-4000-8000-${seq}`,
    containerCode: `ECO-DEMO-${wardCode}-${String(index).padStart(3, '0')}`,
  };
}

export const DEMO_MERCHANTS = [
  demoMerchant(1, 'zalo_demo_merchant_01', 'Bún Chả Phố Cổ', 'HB-HK-DEMO', 21.0338, 105.8511),
  demoMerchant(2, 'zalo_demo_merchant_02', 'Bếp Xanh Cống Vị', 'CV-BD-DEMO', 21.0352, 105.8151),
  demoMerchant(3, 'zalo_demo_merchant_03', 'Phở Nguyễn Du', 'NT-HBT-DEMO', 21.0187, 105.8458),
  demoMerchant(4, 'zalo_demo_merchant_04', 'Cơm Nhà Hồ Gươm', 'HB-HK-DEMO', 21.0288, 105.8524),
  demoMerchant(5, 'zalo_demo_merchant_05', 'Bún Riêu Trung Tự', 'TD-DD-DEMO', 21.0097, 105.8302),
] as const;

export const DEMO_COLLECTOR = {
  id: '73000000-0000-4000-8000-000000000001',
  userId: '73100000-0000-4000-8000-000000000001',
  zaloId: 'zalo_demo_collector_01',
  phone: '0911000001',
  name: 'Nguyễn Thu Gom 1',
  wardCode: 'HB-HK-DEMO' as DemoWardCode,
} as const;

/** Người thu gom demo thứ hai (phường Nguyễn Du), dùng khi test cần bộ đếm theo tài khoản riêng. */
export const DEMO_SECOND_COLLECTOR = { zaloId: 'zalo_demo_collector_02', phone: '0911000002' } as const;

export const DEMO_STATION = {
  id: '74000000-0000-4000-8000-000000000001',
  name: 'Trạm ECollect Hồ Gươm',
  lat: 21.0328,
  lng: 105.8504,
} as const;

export const DEMO_ADMIN = { zaloId: 'zalo_admin_01', phone: '0900000000' } as const;

/** Tâm phường Hàng Bạc (HB-HK-DEMO), dùng làm vị trí người thu gom khi lấy tuyến. */
export const DEMO_ORIGIN = { lat: 21.0333, lng: 105.85 } as const;

export async function loginZalo(app: INestApplication, zaloId: string, phone: string): Promise<string> {
  const response = await request(app.getHttpServer()).post('/api/v1/auth/zalo').send({ zalo_id: zaloId, phone }).expect(201);
  return response.body.access_token as string;
}

/** Tài khoản ADMIN không đăng nhập bằng Zalo được (ADMIN_LOGIN_REQUIRES_PASSWORD). */
export async function loginAdmin(app: INestApplication): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/admin/login')
    .send({ zalo_id: DEMO_ADMIN.zaloId, phone: DEMO_ADMIN.phone })
    .expect(201);
  return response.body.access_token as string;
}

export async function demoAdminUserId(prisma: PrismaService): Promise<string> {
  const admin = await prisma.user.findUniqueOrThrow({ where: { zaloId: DEMO_ADMIN.zaloId }, select: { id: true } });
  return admin.id;
}

export async function demoWardId(prisma: PrismaService, code: DemoWardCode): Promise<string> {
  const ward = await prisma.ward.findUniqueOrThrow({ where: { code }, select: { id: true } });
  return ward.id;
}

/** Cho người thu gom demo phụ trách thêm các phường (thu gom chỉ nhận đơn trong phường mình). */
export async function assignDemoCollectorWards(prisma: PrismaService, codes: ReadonlyArray<DemoWardCode>): Promise<void> {
  for (const code of codes) {
    const wardId = await demoWardId(prisma, code);
    await prisma.collectorWard.upsert({
      where: { collectorId_wardId: { collectorId: DEMO_COLLECTOR.id, wardId } },
      update: {},
      create: { collectorId: DEMO_COLLECTOR.id, wardId },
    });
  }
}

export interface TestContainer {
  id: string;
  code: string;
}

/** Thêm can 30 lít ở quán cho test cần nhiều can hơn seed-demo (mỗi quán chỉ có 1 can). */
export async function addTestContainer(prisma: PrismaService, merchant: DemoMerchant, label: string): Promise<TestContainer> {
  const wardId = await demoWardId(prisma, merchant.wardCode);
  const code = `ECO-E2E-${label}-${randomUUID().slice(0, 8)}`.toUpperCase();
  const container = await prisma.container.create({
    data: { merchantId: merchant.id, wardId, qrCode: code, state: 'AT_MERCHANT', status: 'ACTIVE', isActive: true, capacityLiters: 30 },
    select: { id: true, qrCode: true },
  });
  return { id: container.id, code: container.qrCode };
}

/** Huỷ đơn đang mở và đưa can về quán, để tạo đơn mới cho can đó. */
export async function resetContainer(prisma: PrismaService, containerId: string): Promise<void> {
  await prisma.collectionOrder.updateMany({
    where: { containerId, status: { in: ['READY', 'ASSIGNED'] } },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });
  await prisma.container.update({ where: { id: containerId }, data: { state: 'AT_MERCHANT', lastSeenAt: null } });
}

/**
 * seed-demo không tạo giá dầu. Test cần giá đang hiệu lực thì tạo một giá mở và xoá khi xong.
 * Trả về id giá đã tạo, hoặc null nếu đã có sẵn giá mở.
 */
export async function ensureOpenOilPrice(prisma: PrismaService, unitPrice = 20000): Promise<string | null> {
  const open = await prisma.oilPrice.findFirst({ where: { effectiveTo: null } });
  if (open) return null;
  const created = await prisma.oilPrice.create({
    data: { unitPrice, unit: 'PER_LITER', effectiveFrom: new Date('2020-01-01T00:00:00.000Z'), note: 'e2e' },
    select: { id: true },
  });
  return created.id;
}
