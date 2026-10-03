process.env.NODE_ENV = 'test';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ROUTE_MATRIX_URL } from '../src/modules/stations/road-distance';
import { DEMO_COLLECTOR, DEMO_ORIGIN, DEMO_SECOND_COLLECTOR, DEMO_STATION, loginZalo } from './helpers/demo-seed';

// Nghiệm thu I1: dùng key sai hoặc mất mạng tới Google thì vẫn gợi ý trạm theo đường chim bay.
describe('Station recommendation fallback (e2e, I1.2)', () => {
  let app: INestApplication;
  let collectorToken: string;
  const originalKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  const realFetch = globalThis.fetch;

  beforeAll(async () => {
    process.env.GOOGLE_MAPS_SERVER_KEY = 'invalid-e2e-key';
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    collectorToken = await loginZalo(app, DEMO_COLLECTOR.zaloId, DEMO_COLLECTOR.phone);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    if (originalKey === undefined) delete process.env.GOOGLE_MAPS_SERVER_KEY;
    else process.env.GOOGLE_MAPS_SERVER_KEY = originalKey;
    await app.close();
  });

  function googleOnly(response: () => Promise<Response>) {
    // Chỉ chặn lời gọi tới Google; test không bao giờ gọi Google thật (không phát sinh phí).
    return jest.spyOn(globalThis, 'fetch').mockImplementation((input, init) =>
      String(input) === ROUTE_MATRIX_URL ? response() : realFetch(input, init),
    );
  }

  async function recommend(lat: number) {
    return request(app.getHttpServer())
      .get(`/api/v1/stations/recommend?lat=${lat}&lng=${DEMO_ORIGIN.lng}&liters=10`)
      .set('Authorization', `Bearer ${collectorToken}`)
      .expect(200);
  }

  it('recommends stations by straight line distance when Google rejects the key', async () => {
    const fetchSpy = googleOnly(async () => new Response('{"error":{"status":"PERMISSION_DENIED"}}', { status: 403 }));
    const response = await recommend(DEMO_ORIGIN.lat);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body.some((station: { id: string }) => station.id === DEMO_STATION.id)).toBe(true);
    expect(response.body.every((station: { distance_source: string }) => station.distance_source === 'straight')).toBe(true);
    const distances = response.body.map((station: { distance_m: number }) => station.distance_m);
    expect(distances).toEqual([...distances].sort((a: number, b: number) => a - b));
    expect(fetchSpy.mock.calls.filter(([input]) => String(input) === ROUTE_MATRIX_URL)).toHaveLength(1);
  });

  it('limits station recommendations to 20 calls per minute per account (Q28)', async () => {
    googleOnly(async () => new Response('{}', { status: 403 }));
    const token = await loginZalo(app, DEMO_SECOND_COLLECTOR.zaloId, DEMO_SECOND_COLLECTOR.phone);
    const call = () =>
      request(app.getHttpServer())
        .get(`/api/v1/stations/recommend?lat=${DEMO_ORIGIN.lat}&lng=${DEMO_ORIGIN.lng}&liters=10`)
        .set('Authorization', `Bearer ${token}`);
    for (let index = 0; index < 20; index += 1) {
      expect((await call()).status).toBe(200);
    }
    const limited = await call().expect(429);
    expect(limited.body).toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('recommends stations by straight line distance when Google cannot be reached', async () => {
    const fetchSpy = googleOnly(async () => {
      throw new TypeError('fetch failed');
    });
    // Vị trí khác để không trúng cache của test trước.
    const response = await recommend(DEMO_ORIGIN.lat + 0.01);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body.every((station: { distance_source: string }) => station.distance_source === 'straight')).toBe(true);
    expect(fetchSpy.mock.calls.filter(([input]) => String(input) === ROUTE_MATRIX_URL).length).toBeGreaterThanOrEqual(1);
  });
});
