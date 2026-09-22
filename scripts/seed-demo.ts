import {
  ContainerState,
  EntityStatus,
  MerchantApprovalStatus,
  OilGrade,
  OrderStatus,
  PaymentStatus,
  PrismaClient,
  Quality,
  Role,
} from '@prisma/client';
import { getDemoWardId, upsertDemoWards } from '../apps/api/src/demo/seed-demo-wards';
import { paymentPeriodFor } from '../apps/api/src/modules/payments/payment-period';

const prisma = new PrismaClient();

const merchants = [
  [
    '71000000-0000-4000-8000-000000000001',
    '71100000-0000-4000-8000-000000000001',
    'zalo_demo_merchant_01',
    '0901000001',
    'Bún Chả Phố Cổ',
    '18 Hàng Bạc, Hoàn Kiếm, Hà Nội',
    'HB-HK-DEMO',
    21.0338,
    105.8511,
  ],
  [
    '71000000-0000-4000-8000-000000000002',
    '71100000-0000-4000-8000-000000000002',
    'zalo_demo_merchant_02',
    '0901000002',
    'Bếp Xanh Cống Vị',
    '52 Đội Cấn, Ba Đình, Hà Nội',
    'CV-BD-DEMO',
    21.0352,
    105.8151,
  ],
  [
    '71000000-0000-4000-8000-000000000003',
    '71100000-0000-4000-8000-000000000003',
    'zalo_demo_merchant_03',
    '0901000003',
    'Phở Nguyễn Du',
    '40 Nguyễn Du, Hai Bà Trưng, Hà Nội',
    'NT-HBT-DEMO',
    21.0187,
    105.8458,
  ],
  [
    '71000000-0000-4000-8000-000000000004',
    '71100000-0000-4000-8000-000000000004',
    'zalo_demo_merchant_04',
    '0901000004',
    'Cơm Nhà Hồ Gươm',
    '8 Đinh Tiên Hoàng, Hoàn Kiếm, Hà Nội',
    'HB-HK-DEMO',
    21.0288,
    105.8524,
  ],
  [
    '71000000-0000-4000-8000-000000000005',
    '71100000-0000-4000-8000-000000000005',
    'zalo_demo_merchant_05',
    '0901000005',
    'Bún Riêu Trung Tự',
    '16 Phạm Ngọc Thạch, Đống Đa, Hà Nội',
    'TD-DD-DEMO',
    21.0097,
    105.8302,
  ],
] as const;

async function main() {
  const wardIdsByCode = await upsertDemoWards(prisma);

  for (const [
    index,
    [merchantId, userId, zaloId, phone, businessName, address, wardCode, lat, lng],
  ] of merchants.entries()) {
    const wardId = getDemoWardId(wardIdsByCode, wardCode);
    await prisma.user.upsert({
      where: { id: userId },
      update: { zaloId, phone, name: businessName, role: Role.MERCHANT, deletedAt: null },
      create: { id: userId, zaloId, phone, name: businessName, role: Role.MERCHANT },
    });
    await prisma.merchant.upsert({
      where: { id: merchantId },
      update: {
        userId,
        wardId,
        businessName,
        address,
        status: EntityStatus.ACTIVE,
        isActive: true,
        approvalStatus: MerchantApprovalStatus.APPROVED,
        deletedAt: null,
      },
      create: {
        id: merchantId,
        userId,
        wardId,
        businessName,
        address,
        status: EntityStatus.ACTIVE,
        isActive: true,
        approvalStatus: MerchantApprovalStatus.APPROVED,
      },
    });
    await prisma.$executeRaw`UPDATE "merchants" SET "location" = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography WHERE "id" = ${merchantId}::uuid`;
    const containerId = `72000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
    await prisma.container.upsert({
      where: { id: containerId },
      update: {
        merchantId,
        wardId,
        qrCode: `ECO-DEMO-${wardCode}-${String(index + 1).padStart(3, '0')}`,
        state: ContainerState.AT_MERCHANT,
        status: EntityStatus.ACTIVE,
        isActive: true,
        capacityLiters: 30,
        deletedAt: null,
      },
      create: {
        id: containerId,
        merchantId,
        wardId,
        qrCode: `ECO-DEMO-${wardCode}-${String(index + 1).padStart(3, '0')}`,
        state: ContainerState.AT_MERCHANT,
        status: EntityStatus.ACTIVE,
        isActive: true,
        capacityLiters: 30,
      },
    });
  }

  const collectors = [
    [
      '73000000-0000-4000-8000-000000000001',
      '73100000-0000-4000-8000-000000000001',
      'zalo_demo_collector_01',
      '0911000001',
      'Nguyễn Thu Gom 1',
      'HB-HK-DEMO',
    ],
    [
      '73000000-0000-4000-8000-000000000002',
      '73100000-0000-4000-8000-000000000002',
      'zalo_demo_collector_02',
      '0911000002',
      'Trần Thu Gom 2',
      'NT-HBT-DEMO',
    ],
  ] as const;
  for (const [collectorId, userId, zaloId, phone, name, wardCode] of collectors) {
    const wardId = getDemoWardId(wardIdsByCode, wardCode);
    await prisma.user.upsert({
      where: { id: userId },
      update: { zaloId, phone, name, role: Role.COLLECTOR, deletedAt: null },
      create: { id: userId, zaloId, phone, name, role: Role.COLLECTOR },
    });
    await prisma.collector.upsert({
      where: { id: collectorId },
      update: {
        userId,
        displayName: name,
        vehicleType: 'Xe tải nhỏ',
        maxCapacityLiters: 100,
        status: EntityStatus.ACTIVE,
        isActive: true,
        deletedAt: null,
      },
      create: {
        id: collectorId,
        userId,
        displayName: name,
        vehicleType: 'Xe tải nhỏ',
        maxCapacityLiters: 100,
        status: EntityStatus.ACTIVE,
        isActive: true,
      },
    });
    await prisma.collectorWard.upsert({
      where: { collectorId_wardId: { collectorId, wardId } },
      update: {},
      create: { collectorId, wardId },
    });
  }

  const stationUserId = '74100000-0000-4000-8000-000000000001';
  const stationId = '74000000-0000-4000-8000-000000000001';
  const stationWardId = getDemoWardId(wardIdsByCode, 'HB-HK-DEMO');
  await prisma.user.upsert({
    where: { id: stationUserId },
    update: {
      zaloId: 'zalo_demo_station_01',
      phone: '0921000001',
      name: 'Trạm ECollect Hồ Gươm',
      role: Role.STATION,
      deletedAt: null,
    },
    create: {
      id: stationUserId,
      zaloId: 'zalo_demo_station_01',
      phone: '0921000001',
      name: 'Trạm ECollect Hồ Gươm',
      role: Role.STATION,
    },
  });
  await prisma.station.upsert({
    where: { id: stationId },
    update: {
      userId: stationUserId,
      wardId: stationWardId,
      name: 'Trạm ECollect Hồ Gươm',
      address: '22 Hàng Bạc, Hoàn Kiếm, Hà Nội',
      capacityLiters: 1000,
      currentVolumeLiters: 0,
      status: EntityStatus.ACTIVE,
      isActive: true,
      deletedAt: null,
    },
    create: {
      id: stationId,
      userId: stationUserId,
      wardId: stationWardId,
      name: 'Trạm ECollect Hồ Gươm',
      address: '22 Hàng Bạc, Hoàn Kiếm, Hà Nội',
      capacityLiters: 1000,
      currentVolumeLiters: 0,
      status: EntityStatus.ACTIVE,
      isActive: true,
    },
  });
  await prisma.$executeRaw`UPDATE "stations" SET "location" = ST_SetSRID(ST_MakePoint(105.8504, 21.0328), 4326)::geography WHERE "id" = ${stationId}::uuid`;

  const secondStationUserId = '74100000-0000-4000-8000-000000000002';
  const secondStationId = '74000000-0000-4000-8000-000000000002';
  const secondStationWardId = getDemoWardId(wardIdsByCode, 'CV-BD-DEMO');
  await prisma.user.upsert({
    where: { id: secondStationUserId },
    update: {
      zaloId: null,
      phone: null,
      name: 'Trạm ECollect Cống Vị',
      role: Role.STATION,
      deletedAt: null,
    },
    create: { id: secondStationUserId, name: 'Trạm ECollect Cống Vị', role: Role.STATION },
  });
  await prisma.station.upsert({
    where: { id: secondStationId },
    update: {
      userId: secondStationUserId,
      wardId: secondStationWardId,
      name: 'Trạm ECollect Cống Vị',
      address: '80 Đội Cấn, Ba Đình, Hà Nội',
      capacityLiters: 1500,
      currentVolumeLiters: 120,
      status: EntityStatus.ACTIVE,
      isActive: true,
      deletedAt: null,
    },
    create: {
      id: secondStationId,
      userId: secondStationUserId,
      wardId: secondStationWardId,
      name: 'Trạm ECollect Cống Vị',
      address: '80 Đội Cấn, Ba Đình, Hà Nội',
      capacityLiters: 1500,
      currentVolumeLiters: 120,
      status: EntityStatus.ACTIVE,
      isActive: true,
    },
  });
  await prisma.$executeRaw`UPDATE "stations" SET "location" = ST_SetSRID(ST_MakePoint(105.8151, 21.0352), 4326)::geography WHERE "id" = ${secondStationId}::uuid`;

  const firstCollectorId = '73000000-0000-4000-8000-000000000001';

  // Bốn quán đầu: hai quán phường Hàng Bạc, một Cống Vị, một Nguyễn Du. Nhờ vậy
  // cả hai người thu gom đều có điểm phải ghé trong địa bàn mình phụ trách.
  const demoOrders = merchants.slice(0, 4).map(([merchantId], index) => ({
    id: `76000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    merchantId,
    containerId: `72000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    expectedLiters: 20 + index * 5,
  }));

  // Đơn đầu tiên có giao dịch kèm theo nên để COLLECTED cho khớp thực tế.
  // Các đơn còn lại để READY và chưa gán người thu: tuyến thu gom, bản đồ điểm
  // thu và ô "dầu dự kiến" của trang quản trị đều chỉ đếm đơn READY, nên nếu
  // seed để ASSIGNED thì mở app lên sẽ không thấy gì để thu.
  for (const [index, order] of demoOrders.entries()) {
    const collected = index === 0;
    const data = {
      ...order,
      status: collected ? OrderStatus.COLLECTED : OrderStatus.READY,
      collectorId: collected ? firstCollectorId : null,
      completedAt: collected ? new Date() : null,
    };
    await prisma.collectionOrder.upsert({
      where: { id: order.id },
      update: { ...data, deletedAt: null },
      create: data,
    });
  }
  await prisma.collectionTransaction.upsert({
    where: { id: '77000000-0000-4000-8000-000000000001' },
    update: {
      orderId: demoOrders[0].id,
      containerId: demoOrders[0].containerId,
      merchantId: demoOrders[0].merchantId,
      collectorId: firstCollectorId,
      actualLiters: 18,
      grade: OilGrade.A,
      quality: Quality.PASS,
      deletedAt: null,
    },
    create: {
      id: '77000000-0000-4000-8000-000000000001',
      clientUuid: '77100000-0000-4000-8000-000000000001',
      orderId: demoOrders[0].id,
      containerId: demoOrders[0].containerId,
      merchantId: demoOrders[0].merchantId,
      collectorId: firstCollectorId,
      actualLiters: 18,
      grade: OilGrade.A,
      quality: Quality.PASS,
    },
  });

  // Tài khoản demo-picker (khác dữ liệu tổ chức thật đã tích luỹ qua test) chỉ có
  // đúng 1 giao dịch ở trên — vào Thống kê/Lịch sử/Hành trình xanh/Thanh toán của
  // người thu gom lẫn quán đều thấy trống trơn. Rải thêm lịch sử nhiều tháng cho cả
  // 5 quán và 2 người thu gom mẫu để demo bằng tài khoản picker cũng đầy đủ như
  // dữ liệu thật. Giao dịch quá PAID_CUTOFF_DAYS thì chốt thanh toán (PAID) luôn —
  // chỉ vài giao dịch gần nhất để nguyên PENDING cho khớp luồng "chờ thanh toán".
  const secondCollectorId = '73000000-0000-4000-8000-000000000002';
  const PAID_CUTOFF_DAYS = 5;
  const PRICE_CHANGE_AT = new Date('2026-09-20T09:29:00.000Z');

  function unitPriceAt(date: Date): number {
    return date >= PRICE_CHANGE_AT ? 20000 : 5500;
  }

  function daysAgo(days: number): Date {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - days);
    return date;
  }

  const collectionHistory = [
    { seq: 10, merchantIndex: 0, collectorId: firstCollectorId, daysAgo: 85, liters: 20, grade: OilGrade.A },
    { seq: 11, merchantIndex: 0, collectorId: firstCollectorId, daysAgo: 55, liters: 24, grade: OilGrade.A },
    { seq: 12, merchantIndex: 0, collectorId: firstCollectorId, daysAgo: 25, liters: 19, grade: OilGrade.A },
    { seq: 13, merchantIndex: 0, collectorId: firstCollectorId, daysAgo: 7, liters: 25, grade: OilGrade.A },
    { seq: 14, merchantIndex: 3, collectorId: firstCollectorId, daysAgo: 80, liters: 28, grade: OilGrade.A },
    { seq: 15, merchantIndex: 3, collectorId: firstCollectorId, daysAgo: 50, liters: 22, grade: OilGrade.B },
    { seq: 16, merchantIndex: 3, collectorId: firstCollectorId, daysAgo: 20, liters: 30, grade: OilGrade.A },
    { seq: 17, merchantIndex: 3, collectorId: firstCollectorId, daysAgo: 4, liters: 26, grade: OilGrade.A },
    { seq: 18, merchantIndex: 1, collectorId: secondCollectorId, daysAgo: 60, liters: 26, grade: OilGrade.A },
    { seq: 19, merchantIndex: 1, collectorId: firstCollectorId, daysAgo: 30, liters: 20, grade: OilGrade.B },
    { seq: 20, merchantIndex: 1, collectorId: firstCollectorId, daysAgo: 8, liters: 24, grade: OilGrade.A },
    { seq: 21, merchantIndex: 2, collectorId: secondCollectorId, daysAgo: 75, liters: 18, grade: OilGrade.A },
    { seq: 22, merchantIndex: 2, collectorId: secondCollectorId, daysAgo: 45, liters: 21, grade: OilGrade.A },
    { seq: 23, merchantIndex: 2, collectorId: secondCollectorId, daysAgo: 15, liters: 17, grade: OilGrade.A },
    { seq: 24, merchantIndex: 2, collectorId: secondCollectorId, daysAgo: 5, liters: 23, grade: OilGrade.A },
    { seq: 25, merchantIndex: 4, collectorId: firstCollectorId, daysAgo: 65, liters: 23, grade: OilGrade.A },
    { seq: 26, merchantIndex: 4, collectorId: secondCollectorId, daysAgo: 35, liters: 19, grade: OilGrade.A },
    { seq: 27, merchantIndex: 4, collectorId: secondCollectorId, daysAgo: 9, liters: 27, grade: OilGrade.A },
  ] as const;

  for (const entry of collectionHistory) {
    const merchantId = merchants[entry.merchantIndex][0];
    const containerId = `72000000-0000-4000-8000-${String(entry.merchantIndex + 1).padStart(12, '0')}`;
    const orderId = `76000000-0000-4000-8000-${String(entry.seq).padStart(12, '0')}`;
    const transactionId = `77000000-0000-4000-8000-${String(entry.seq).padStart(12, '0')}`;
    const clientUuid = `77100000-0000-4000-8000-${String(entry.seq).padStart(12, '0')}`;
    const collectedAt = daysAgo(entry.daysAgo);

    await prisma.collectionOrder.upsert({
      where: { id: orderId },
      update: {
        merchantId,
        containerId,
        collectorId: entry.collectorId,
        status: OrderStatus.COLLECTED,
        expectedLiters: entry.liters,
        requestedAt: collectedAt,
        assignedAt: collectedAt,
        completedAt: collectedAt,
        deletedAt: null,
      },
      create: {
        id: orderId,
        merchantId,
        containerId,
        collectorId: entry.collectorId,
        status: OrderStatus.COLLECTED,
        expectedLiters: entry.liters,
        requestedAt: collectedAt,
        assignedAt: collectedAt,
        completedAt: collectedAt,
      },
    });

    await prisma.collectionTransaction.upsert({
      where: { id: transactionId },
      update: {
        orderId,
        containerId,
        merchantId,
        collectorId: entry.collectorId,
        actualLiters: entry.liters,
        grade: entry.grade,
        quality: Quality.PASS,
        collectedAt,
        createdAt: collectedAt,
        deletedAt: null,
      },
      create: {
        id: transactionId,
        clientUuid,
        orderId,
        containerId,
        merchantId,
        collectorId: entry.collectorId,
        actualLiters: entry.liters,
        grade: entry.grade,
        quality: Quality.PASS,
        collectedAt,
        createdAt: collectedAt,
      },
    });

    if (entry.daysAgo > PAID_CUTOFF_DAYS) {
      const unitPrice = unitPriceAt(collectedAt);
      const amount = Math.round(entry.liters * unitPrice);
      const paymentId = `78000000-0000-4000-8000-${String(entry.seq).padStart(12, '0')}`;
      const paidAt = new Date(collectedAt.getTime() + 2 * 60 * 60 * 1000);
      await prisma.payment.upsert({
        where: { transactionId },
        update: {
          merchantId,
          liters: entry.liters,
          unitPrice,
          amount,
          period: paymentPeriodFor(collectedAt),
          status: PaymentStatus.PAID,
          paidAt,
        },
        create: {
          id: paymentId,
          merchantId,
          transactionId,
          liters: entry.liters,
          unitPrice,
          amount,
          period: paymentPeriodFor(collectedAt),
          status: PaymentStatus.PAID,
          paidAt,
        },
      });
    }
  }

  const admin = await prisma.user.findUnique({ where: { zaloId: 'zalo_admin_01' } });
  if (admin) {
    await prisma.user.update({
      where: { id: admin.id },
      data: { phone: '0900000000', name: 'ECollect Admin', role: Role.ADMIN, deletedAt: null },
    });
  } else {
    await prisma.user.create({
      data: {
        id: '75000000-0000-4000-8000-000000000001',
        zaloId: 'zalo_admin_01',
        phone: '0900000000',
        name: 'ECollect Admin',
        role: Role.ADMIN,
      },
    });
  }
  console.log(
    'Demo seed complete: 4 Hanoi wards, 5 merchants, 2 collectors, 2 stations, 5 containers, ' +
      '22 orders (19 COLLECTED across ~3 months + 3 READY), 19 transactions, 16 payments (PAID).',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
