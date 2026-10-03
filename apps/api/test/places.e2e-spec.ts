process.env.NODE_ENV = 'test';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DEMO_COLLECTOR, loginAdmin, loginZalo } from './helpers/demo-seed';

// I1.1: tìm địa chỉ trạm chỉ dành cho admin; không gọi được Google thì báo rõ để admin nhập tay.
describe('Admin place search (e2e, I1.1)', () => {
  let app: INestApplication;
  let adminToken: string;
  let collectorToken: string;
  const originalKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  const session = '3f1c2a9e-0d7b-4c55-9a8e-2f6b1d0c7e11';

  beforeAll(async () => {
    delete process.env.GOOGLE_MAPS_SERVER_KEY;
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    adminToken = await loginAdmin(app);
    collectorToken = await loginZalo(app, DEMO_COLLECTOR.zaloId, DEMO_COLLECTOR.phone);
  });

  afterAll(async () => {
    if (originalKey !== undefined) process.env.GOOGLE_MAPS_SERVER_KEY = originalKey;
    await app.close();
  });

  it('tells the admin to enter coordinates by hand when no server key is configured', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/admin/places/autocomplete?input=${encodeURIComponent('22 Hàng Bạc')}&session_token=${session}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(503);
    expect(response.body).toMatchObject({ code: 'PLACES_UNAVAILABLE' });
    expect(response.body.message).toContain('nhập vĩ độ, kinh độ bằng tay');
  });

  it('rejects a search shorter than 3 characters before calling Google', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/admin/places/autocomplete?input=ab&session_token=${session}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });

  it('forbids non-admin roles', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/admin/places/details?place_id=place-1&session_token=${session}`)
      .set('Authorization', `Bearer ${collectorToken}`)
      .expect(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });
});
