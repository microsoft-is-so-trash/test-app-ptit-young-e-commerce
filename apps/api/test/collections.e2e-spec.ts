process.env.NODE_ENV = 'test';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { paymentPeriodFor } from '../src/modules/payments/payment-period';

import { addTestContainer, assignDemoCollectorWards, DEMO_COLLECTOR, DEMO_MERCHANTS, demoAdminUserId, ensureOpenOilPrice, type TestContainer } from './helpers/demo-seed';

const collectorUserId = DEMO_COLLECTOR.userId;
const collectorId = DEMO_COLLECTOR.id;
const [merchantOne, merchantTwo, merchantThree, merchantFour, merchantFive] = DEMO_MERCHANTS;
const merchantFourId = merchantFour.id;
// seed-demo mỗi quán có 1 can; test cần 8 can nên tự tạo thêm (Q25).
let containerOne: TestContainer;
let containerTwo: TestContainer;
let containerThree: TestContainer;
let containerFour: TestContainer;
let containerFive: TestContainer;
let containerSix: TestContainer;
let containerSeven: TestContainer;
let containerEight: TestContainer;

describe('Collections idempotency and geo validation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let paymentsService: PaymentsService;
  let adminUserId: string;
  let createdOpenPriceId: string | null = null;
  let merchantSnapshots: Array<{ id: string; avgDailyLiters: Prisma.Decimal | null; lastCollectedAt: Date | null }> = [];

  async function login(zaloId: string, phone: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/zalo')
      .send({ zalo_id: zaloId, phone })
      .expect(201);
    return response.body.access_token as string;
  }

  async function createOrder(token: string, containerId: string, expectedLiters?: number) {
    return request(app.getHttpServer())
      .post('/api/v1/orders/ready')
      .set('Authorization', 'Bearer ' + token)
      .send({ container_id: containerId, ...(expectedLiters === undefined ? {} : { expected_liters: expectedLiters }) })
      .expect(201);
  }

  async function prepareContainer(containerId: string) {
    await prisma.collectionOrder.updateMany({
      where: { containerId, status: { in: ['READY', 'ASSIGNED'] } },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    await prisma.container.update({ where: { id: containerId }, data: { state: 'AT_MERCHANT', lastSeenAt: null } });
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    paymentsService = app.get(PaymentsService);
    adminUserId = await demoAdminUserId(prisma);
    createdOpenPriceId = await ensureOpenOilPrice(prisma);
    await assignDemoCollectorWards(prisma, ['CV-BD-DEMO', 'NT-HBT-DEMO', 'TD-DD-DEMO']);
    merchantSnapshots = await prisma.merchant.findMany({
      where: { id: { in: DEMO_MERCHANTS.map((merchant) => merchant.id) } },
      select: { id: true, avgDailyLiters: true, lastCollectedAt: true },
    });
    containerOne = await addTestContainer(prisma, merchantOne, 'COL');
    containerTwo = await addTestContainer(prisma, merchantOne, 'COL');
    containerThree = await addTestContainer(prisma, merchantTwo, 'COL');
    containerFour = await addTestContainer(prisma, merchantTwo, 'COL');
    containerFive = await addTestContainer(prisma, merchantThree, 'COL');
    containerSix = await addTestContainer(prisma, merchantThree, 'COL');
    containerSeven = await addTestContainer(prisma, merchantFour, 'COL');
    containerEight = await addTestContainer(prisma, merchantFive, 'COL');

    await prisma.collectionOrder.updateMany({
      where: { status: { in: ['READY', 'ASSIGNED'] } },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    await prisma.container.updateMany({
      where: { id: { in: [containerOne.id, containerTwo.id, containerThree.id, containerFour.id, containerFive.id, containerSix.id, containerSeven.id, containerEight.id] } },
      data: { state: 'AT_MERCHANT', lastSeenAt: null },
    });
    await prisma.user.update({ where: { id: collectorUserId }, data: { role: Role.COLLECTOR } });
    await prisma.collector.update({ where: { id: collectorId }, data: { status: 'ACTIVE', maxCapacityLiters: 100 } });
  });

  afterAll(async () => {
    for (const snapshot of merchantSnapshots) {
      await prisma.merchant.update({ where: { id: snapshot.id }, data: { avgDailyLiters: snapshot.avgDailyLiters, lastCollectedAt: snapshot.lastCollectedAt } });
    }
    if (createdOpenPriceId) await prisma.oilPrice.delete({ where: { id: createdOpenPriceId } }).catch(() => undefined);
    await app.close();
  });

  it('inserts once, replays safely, applies side effects and keeps avg_daily_liters unchanged on replay', async () => {
    const merchantToken = await login(merchantFour.zaloId, merchantFour.phone);
    const collectorToken = await login(DEMO_COLLECTOR.zaloId, DEMO_COLLECTOR.phone);
    const order = await createOrder(merchantToken, containerSeven.id, 20);
    const clientUuid = randomUUID();
    const payload = {
      client_uuid: clientUuid,
      order_id: order.body.id,
      container_code: containerSeven.code,
      actual_liters: 18.5,
      quality: 'PASS',
      grade: 'A',
      collector_selected_grade: 'A',
      collector_grade_confirmed: true,
      geo: { lat: merchantFour.lat, lng: merchantFour.lng },
      photos: ['https://example.com/collection-1.jpg'],
      collected_at: '2026-08-11T13:00:00Z',
    };

    const first = await request(app.getHttpServer())
      .post('/api/v1/collections')
      .set('Authorization', 'Bearer ' + collectorToken)
      .send(payload)
      .expect(201);
    const avgAfterFirst = (await prisma.merchant.findUnique({ where: { id: merchantFourId }, select: { avgDailyLiters: true } }))?.avgDailyLiters;
    const firstCount = await prisma.collectionTransaction.count({ where: { clientUuid } });
    const firstOrder = await prisma.collectionOrder.findUnique({ where: { id: order.body.id } });
    const firstContainer = await prisma.container.findUnique({ where: { id: containerSeven.id } });
    expect(first.body).toMatchObject({ client_uuid: clientUuid, actual_liters: 18.5, quality: 'PASS' });
    expect(firstCount).toBe(1);
    expect(firstOrder?.status).toBe('COLLECTED');
    expect(firstContainer?.state).toBe('IN_TRANSIT');

    const replay = await request(app.getHttpServer())
      .post('/api/v1/collections')
      .set('Authorization', 'Bearer ' + collectorToken)
      .send(payload)
      .expect(200)
      .expect('X-Idempotent-Replay', 'true');
    const replayCount = await prisma.collectionTransaction.count({ where: { clientUuid } });
    const avgAfterReplay = (await prisma.merchant.findUnique({ where: { id: merchantFourId }, select: { avgDailyLiters: true } }))?.avgDailyLiters;
    expect(replay.body).toEqual(first.body);
    expect(replayCount).toBe(1);
    expect(avgAfterReplay?.toString()).toBe(avgAfterFirst?.toString());
  });

  it('handles five concurrent retries with one inserted transaction and no 500 responses', async () => {
    const merchantToken = await login(merchantFive.zaloId, merchantFive.phone);
    const collectorToken = await login(DEMO_COLLECTOR.zaloId, DEMO_COLLECTOR.phone);
    const order = await createOrder(merchantToken, containerEight.id, 20);
    const clientUuid = randomUUID();
    const payload = {
      client_uuid: clientUuid,
      order_id: order.body.id,
      container_code: containerEight.code,
      actual_liters: 18,
      quality: 'PASS',
      grade: 'A',
      collector_selected_grade: 'A',
      collector_grade_confirmed: true,
      geo: { lat: merchantFive.lat, lng: merchantFive.lng },
      photos: [],
      collected_at: '2026-08-11T13:01:00Z',
    };
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app.getHttpServer()).post('/api/v1/collections').set('Authorization', 'Bearer ' + collectorToken).send(payload),
      ),
    );
    const count = await prisma.collectionTransaction.count({ where: { clientUuid } });
    expect(responses.every((response) => response.status === 201 || response.status === 200)).toBe(true);
    expect(responses.filter((response) => response.status === 201)).toHaveLength(1);
    expect(count).toBe(1);
  });

  it('rejects liters above the 110 percent capacity limit', async () => {
    const merchantToken = await login(merchantOne.zaloId, merchantOne.phone);
    const collectorToken = await login(DEMO_COLLECTOR.zaloId, DEMO_COLLECTOR.phone);
    const order = await createOrder(merchantToken, containerTwo.id, 20);
    const response = await request(app.getHttpServer())
      .post('/api/v1/collections')
      .set('Authorization', 'Bearer ' + collectorToken)
      .send({
        client_uuid: randomUUID(),
        order_id: order.body.id,
        container_code: containerTwo.code,
        actual_liters: 999,
        quality: 'PASS',
        grade: 'A',
        collector_selected_grade: 'A',
        collector_grade_confirmed: true,
        geo: { lat: merchantOne.lat, lng: merchantOne.lng },
        photos: [],
      })
      .expect(422);
    expect(response.body.code).toBe('INVALID_LITERS');
  });

  it('records a far geo point as FLAG and creates one GEO_MISMATCH alert', async () => {
    const merchantToken = await login(merchantTwo.zaloId, merchantTwo.phone);
    const collectorToken = await login(DEMO_COLLECTOR.zaloId, DEMO_COLLECTOR.phone);
    const order = await createOrder(merchantToken, containerFour.id, 20);
    const response = await request(app.getHttpServer())
      .post('/api/v1/collections')
      .set('Authorization', 'Bearer ' + collectorToken)
      .send({
        client_uuid: randomUUID(),
        order_id: order.body.id,
        container_code: containerFour.code,
        actual_liters: 18,
        quality: 'PASS',
        grade: 'A',
        collector_selected_grade: 'A',
        collector_grade_confirmed: true,
        geo: { lat: merchantTwo.lat + 0.046, lng: merchantTwo.lng + 0.0156 },
        photos: [],
      })
      .expect(201);
    const alerts = await prisma.alert.count({ where: { transactionId: response.body.id, type: 'GEO_MISMATCH' } });
    const alert = await prisma.alert.findFirst({ where: { transactionId: response.body.id, type: 'GEO_MISMATCH' } });
    expect(response.body.quality).toBe('FLAG');
    expect(alerts).toBe(1);
    expect(alert?.severity).toBe('HIGH');
  });

  it('creates a MEDIUM COLLECTION_LITERS_DEVIATION alert for 17 reported and 30 collected liters', async () => {
    const merchantToken = await login(merchantOne.zaloId, merchantOne.phone);
    const collectorToken = await login(DEMO_COLLECTOR.zaloId, DEMO_COLLECTOR.phone);
    const order = await createOrder(merchantToken, containerOne.id, 17);
    const response = await request(app.getHttpServer())
      .post('/api/v1/collections')
      .set('Authorization', 'Bearer ' + collectorToken)
      .send({
        client_uuid: randomUUID(),
        order_id: order.body.id,
        container_code: containerOne.code,
        actual_liters: 30,
        quality: 'PASS',
        grade: 'A',
        collector_selected_grade: 'A',
        collector_grade_confirmed: true,
        geo: { lat: merchantOne.lat, lng: merchantOne.lng },
        photos: [],
      })
      .expect(201);
    const alert = await prisma.alert.findFirst({ where: { transactionId: response.body.id, type: 'COLLECTION_LITERS_DEVIATION' } });
    expect(alert).toMatchObject({ type: 'COLLECTION_LITERS_DEVIATION', severity: 'MEDIUM' });
    expect(alert?.message).toContain('17 L');
    expect(alert?.message).toContain('30 L');
    expect(alert?.message).toContain('76.5%');
    expect(response.body.quality).toBe('PASS');
  });

  it('does not create a deviation alert when 20 reported and 22 collected liters are within 30 percent', async () => {
    const merchantToken = await login(merchantTwo.zaloId, merchantTwo.phone);
    const collectorToken = await login(DEMO_COLLECTOR.zaloId, DEMO_COLLECTOR.phone);
    const order = await createOrder(merchantToken, containerThree.id, 20);
    const response = await request(app.getHttpServer())
      .post('/api/v1/collections')
      .set('Authorization', 'Bearer ' + collectorToken)
      .send({
        client_uuid: randomUUID(),
        order_id: order.body.id,
        container_code: containerThree.code,
        actual_liters: 22,
        quality: 'PASS',
        grade: 'A',
        collector_selected_grade: 'A',
        collector_grade_confirmed: true,
        geo: { lat: merchantTwo.lat, lng: merchantTwo.lng },
        photos: [],
      })
      .expect(201);
    expect(await prisma.alert.count({ where: { transactionId: response.body.id, type: 'COLLECTION_LITERS_DEVIATION' } })).toBe(0);
  });

  it('does not create a deviation alert when an order has no expected liters', async () => {
    const merchantToken = await login(merchantThree.zaloId, merchantThree.phone);
    const collectorToken = await login(DEMO_COLLECTOR.zaloId, DEMO_COLLECTOR.phone);
    const order = await createOrder(merchantToken, containerFive.id);
    const response = await request(app.getHttpServer())
      .post('/api/v1/collections')
      .set('Authorization', 'Bearer ' + collectorToken)
      .send({
        client_uuid: randomUUID(),
        order_id: order.body.id,
        container_code: containerFive.code,
        actual_liters: 30,
        quality: 'PASS',
        grade: 'A',
        collector_selected_grade: 'A',
        collector_grade_confirmed: true,
        geo: { lat: merchantThree.lat, lng: merchantThree.lng },
        photos: [],
      })
      .expect(201);
    expect(await prisma.alert.count({ where: { transactionId: response.body.id, type: 'COLLECTION_LITERS_DEVIATION' } })).toBe(0);
  });

  it('keeps a deviation transaction PASS and allows it to be finalized as a payment', async () => {
    const merchantToken = await login(merchantThree.zaloId, merchantThree.phone);
    const collectorToken = await login(DEMO_COLLECTOR.zaloId, DEMO_COLLECTOR.phone);
    const order = await createOrder(merchantToken, containerSix.id, 10);
    const response = await request(app.getHttpServer())
      .post('/api/v1/collections')
      .set('Authorization', 'Bearer ' + collectorToken)
      .send({
        client_uuid: randomUUID(),
        order_id: order.body.id,
        container_code: containerSix.code,
        actual_liters: 20,
        quality: 'PASS',
        grade: 'A',
        collector_selected_grade: 'A',
        collector_grade_confirmed: true,
        geo: { lat: merchantThree.lat, lng: merchantThree.lng },
        photos: [],
      })
      .expect(201);
    expect(response.body.quality).toBe('PASS');
    const transaction = await prisma.collectionTransaction.findUniqueOrThrow({ where: { id: response.body.id } });
    const period = paymentPeriodFor(transaction.collectedAt);
    await paymentsService.run(period, adminUserId);
    expect(await prisma.payment.findUnique({ where: { transactionId: response.body.id } })).not.toBeNull();
    await prisma.payment.delete({ where: { transactionId: response.body.id } });
  });

  it('records manually weighed mass as SCALE with no density factor', async () => {
    await prisma.container.update({ where: { id: containerOne.id }, data: { state: 'AT_MERCHANT' } });
    const merchantToken = await login(merchantOne.zaloId, merchantOne.phone);
    const collectorToken = await login(DEMO_COLLECTOR.zaloId, DEMO_COLLECTOR.phone);
    const order = await createOrder(merchantToken, containerOne.id, 10);
    const response = await request(app.getHttpServer())
      .post('/api/v1/collections')
      .set('Authorization', 'Bearer ' + collectorToken)
      .send({ client_uuid: randomUUID(), order_id: order.body.id, container_code: containerOne.code, actual_liters: 10, actual_kg: 9.2, quality: 'PASS', grade: 'A', collector_selected_grade: 'A', collector_grade_confirmed: true, geo: { lat: merchantOne.lat, lng: merchantOne.lng }, photos: [] })
      .expect(201);
    expect(response.body).toMatchObject({ actual_kg: 9.2, mass_source: 'SCALE', density_factor: null });
  });

  it('converts volume to estimated mass, stores the factor and creates a LOW alert', async () => {
    await prisma.container.update({ where: { id: containerThree.id }, data: { state: 'AT_MERCHANT' } });
    const merchantToken = await login(merchantTwo.zaloId, merchantTwo.phone);
    const collectorToken = await login(DEMO_COLLECTOR.zaloId, DEMO_COLLECTOR.phone);
    const order = await createOrder(merchantToken, containerThree.id, 10);
    const response = await request(app.getHttpServer())
      .post('/api/v1/collections')
      .set('Authorization', 'Bearer ' + collectorToken)
      .send({ client_uuid: randomUUID(), order_id: order.body.id, container_code: containerThree.code, actual_liters: 10, quality: 'PASS', grade: 'A', collector_selected_grade: 'A', collector_grade_confirmed: true, geo: { lat: merchantTwo.lat, lng: merchantTwo.lng }, photos: [] })
      .expect(201);
    expect(response.body).toMatchObject({ actual_kg: 9.1, mass_source: 'ESTIMATED_FROM_VOLUME', density_factor: 0.91 });
    expect(await prisma.alert.findFirst({ where: { transactionId: response.body.id, type: 'MASS_ESTIMATED_NOT_WEIGHED', severity: 'LOW' } })).not.toBeNull();
  });

  it('accepts kilogram-only collection input and derives liters with the stored density factor', async () => {
    await prepareContainer(containerOne.id);
    const merchantToken = await login(merchantOne.zaloId, merchantOne.phone);
    const collectorToken = await login(DEMO_COLLECTOR.zaloId, DEMO_COLLECTOR.phone);
    const order = await createOrder(merchantToken, containerOne.id, 10);
    const response = await request(app.getHttpServer())
      .post('/api/v1/collections')
      .set('Authorization', 'Bearer ' + collectorToken)
      .send({ client_uuid: randomUUID(), order_id: order.body.id, container_code: containerOne.code, actual_kg: 9.1, quality: 'PASS', grade: 'A', collector_selected_grade: 'A', collector_grade_confirmed: true, geo: { lat: merchantOne.lat, lng: merchantOne.lng }, photos: [] })
      .expect(201);
    expect(response.body).toMatchObject({ actual_liters: 10, actual_kg: 9.1, mass_source: 'SCALE', density_factor: 0.91 });
  });

  it('keeps both manually entered liters and kilograms without overwriting either value', async () => {
    await prepareContainer(containerTwo.id);
    const merchantToken = await login(merchantOne.zaloId, merchantOne.phone);
    const collectorToken = await login(DEMO_COLLECTOR.zaloId, DEMO_COLLECTOR.phone);
    const order = await createOrder(merchantToken, containerTwo.id, 10);
    const response = await request(app.getHttpServer())
      .post('/api/v1/collections')
      .set('Authorization', 'Bearer ' + collectorToken)
      .send({ client_uuid: randomUUID(), order_id: order.body.id, container_code: containerTwo.code, actual_liters: 10, actual_kg: 8.7, quality: 'PASS', grade: 'A', collector_selected_grade: 'A', collector_grade_confirmed: true, geo: { lat: merchantOne.lat, lng: merchantOne.lng }, photos: [] })
      .expect(201);
    expect(response.body).toMatchObject({ actual_liters: 10, actual_kg: 8.7, mass_source: 'SCALE', density_factor: null });
  });

  it('rejects a collection when neither liters nor kilograms is provided', async () => {
    await prepareContainer(containerFour.id);
    const merchantToken = await login(merchantTwo.zaloId, merchantTwo.phone);
    const collectorToken = await login(DEMO_COLLECTOR.zaloId, DEMO_COLLECTOR.phone);
    const order = await createOrder(merchantToken, containerFour.id, 10);
    const response = await request(app.getHttpServer())
      .post('/api/v1/collections')
      .set('Authorization', 'Bearer ' + collectorToken)
      .send({ client_uuid: randomUUID(), order_id: order.body.id, container_code: containerFour.code, grade: 'A', collector_selected_grade: 'A', collector_grade_confirmed: true, quality: 'PASS', geo: { lat: merchantTwo.lat, lng: merchantTwo.lng }, photos: [] })
      .expect(422);
    expect(response.body).toMatchObject({ code: 'INVALID_MASS_INPUT' });
    expect(response.body.message).toContain('Vui lòng nhập số kg hoặc số lít');
  });

  it('rejects kilogram-only input when its derived liters exceed container capacity', async () => {
    await prepareContainer(containerFive.id);
    const merchantToken = await login(merchantThree.zaloId, merchantThree.phone);
    const collectorToken = await login(DEMO_COLLECTOR.zaloId, DEMO_COLLECTOR.phone);
    const order = await createOrder(merchantToken, containerFive.id, 10);
    const response = await request(app.getHttpServer())
      .post('/api/v1/collections')
      .set('Authorization', 'Bearer ' + collectorToken)
      .send({ client_uuid: randomUUID(), order_id: order.body.id, container_code: containerFive.code, actual_kg: 31, grade: 'A', collector_selected_grade: 'A', collector_grade_confirmed: true, quality: 'PASS', geo: { lat: merchantThree.lat, lng: merchantThree.lng }, photos: [] })
      .expect(422);
    expect(response.body.code).toBe('INVALID_LITERS');
    expect(response.body.message).toContain('Số lít suy ra từ khối lượng');
  });

  it('rejects grade B without a photo with PHOTO_REQUIRED_FOR_GRADE', async () => {
    await prepareContainer(containerOne.id);
    const merchantToken = await login(merchantOne.zaloId, merchantOne.phone);
    const collectorToken = await login(DEMO_COLLECTOR.zaloId, DEMO_COLLECTOR.phone);
    const order = await createOrder(merchantToken, containerOne.id, 10);
    const response = await request(app.getHttpServer()).post('/api/v1/collections').set('Authorization', `Bearer ${collectorToken}`).send({
      client_uuid: randomUUID(), order_id: order.body.id, container_code: containerOne.code, actual_liters: 10, grade: 'B', collector_selected_grade: 'B', collector_grade_confirmed: true, quality: 'PASS', geo: { lat: merchantOne.lat, lng: merchantOne.lng }, photos: [],
    }).expect(422);
    expect(response.body.code).toBe('PHOTO_REQUIRED_FOR_GRADE');
  });

  it('accepts grade A without a photo', async () => {
    await prepareContainer(containerTwo.id);
    const merchantToken = await login(merchantOne.zaloId, merchantOne.phone);
    const collectorToken = await login(DEMO_COLLECTOR.zaloId, DEMO_COLLECTOR.phone);
    const order = await createOrder(merchantToken, containerTwo.id, 10);
    const response = await request(app.getHttpServer()).post('/api/v1/collections').set('Authorization', `Bearer ${collectorToken}`).send({
      client_uuid: randomUUID(), order_id: order.body.id, container_code: containerTwo.code, actual_liters: 10, grade: 'A', collector_selected_grade: 'A', collector_grade_confirmed: true, quality: 'PASS', geo: { lat: merchantOne.lat, lng: merchantOne.lng }, photos: [],
    }).expect(201);
    expect(response.body.grade).toBe('A');
    expect(response.body.grade_photo_url).toBeNull();
  });

  it('rejects grade A with suspected adulteration when no photo is provided', async () => {
    await prepareContainer(containerThree.id);
    const merchantToken = await login(merchantTwo.zaloId, merchantTwo.phone);
    const collectorToken = await login(DEMO_COLLECTOR.zaloId, DEMO_COLLECTOR.phone);
    const order = await createOrder(merchantToken, containerThree.id, 10);
    const response = await request(app.getHttpServer()).post('/api/v1/collections').set('Authorization', `Bearer ${collectorToken}`).send({
      client_uuid: randomUUID(), order_id: order.body.id, container_code: containerThree.code, actual_liters: 10, grade: 'A', collector_selected_grade: 'A', collector_grade_confirmed: true, suspected_adulteration: true, quality: 'PASS', geo: { lat: merchantTwo.lat, lng: merchantTwo.lng }, photos: [],
    }).expect(422);
    expect(response.body.code).toBe('PHOTO_REQUIRED_FOR_GRADE');
  });

  it('creates an OIL_GRADE_C alert for a grade C transaction', async () => {
    await prepareContainer(containerFour.id);
    const merchantToken = await login(merchantTwo.zaloId, merchantTwo.phone);
    const collectorToken = await login(DEMO_COLLECTOR.zaloId, DEMO_COLLECTOR.phone);
    const order = await createOrder(merchantToken, containerFour.id, 10);
    const response = await request(app.getHttpServer()).post('/api/v1/collections').set('Authorization', `Bearer ${collectorToken}`).send({
      client_uuid: randomUUID(), order_id: order.body.id, container_code: containerFour.code, actual_liters: 10, grade: 'C', collector_selected_grade: 'C', collector_grade_confirmed: true, quality: 'PASS', geo: { lat: merchantTwo.lat, lng: merchantTwo.lng }, photos: ['https://example.com/grade-c.jpg'],
    }).expect(201);
    expect(await prisma.alert.findFirst({ where: { transactionId: response.body.id, type: 'OIL_GRADE_C', severity: 'MEDIUM' } })).not.toBeNull();
    expect(response.body.quality).toBe('PASS');
  });

  it('creates a HIGH SUSPECTED_ADULTERATION alert with the selected grade and kilograms', async () => {
    await prepareContainer(containerFive.id);
    const merchantToken = await login(merchantThree.zaloId, merchantThree.phone);
    const collectorToken = await login(DEMO_COLLECTOR.zaloId, DEMO_COLLECTOR.phone);
    const order = await createOrder(merchantToken, containerFive.id, 10);
    const response = await request(app.getHttpServer()).post('/api/v1/collections').set('Authorization', `Bearer ${collectorToken}`).send({
      client_uuid: randomUUID(), order_id: order.body.id, container_code: containerFive.code, actual_liters: 10, actual_kg: 9.1, grade: 'A', collector_selected_grade: 'A', collector_grade_confirmed: true, suspected_adulteration: true, quality: 'PASS', geo: { lat: merchantThree.lat, lng: merchantThree.lng }, photos: ['https://example.com/adulteration.jpg'],
    }).expect(201);
    const alert = await prisma.alert.findFirst({ where: { transactionId: response.body.id, type: 'SUSPECTED_ADULTERATION' } });
    expect(alert).toMatchObject({ severity: 'HIGH' });
    expect(alert?.message).toContain('9.10 kg');
    expect(alert?.message).toContain('hạng A');
    expect(response.body.quality).toBe('PASS');
  });

  it('returns collection history for the collector', async () => {
    const collectorToken = await login(DEMO_COLLECTOR.zaloId, DEMO_COLLECTOR.phone);
    const response = await request(app.getHttpServer()).get('/api/v1/collections/me?page=1&limit=20').set('Authorization', 'Bearer ' + collectorToken).expect(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    expect(response.body.meta.page).toBe(1);
  });
});
