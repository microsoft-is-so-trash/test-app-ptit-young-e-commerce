import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PAID_API_RATE_LIMITS } from './common/guards/user-throttler.guard';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContainersModule } from './modules/containers/containers.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { CollectorsModule } from './modules/collectors/collectors.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { OrdersModule } from './modules/orders/orders.module';
import { StationsModule } from './modules/stations/stations.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { StationDeliveriesModule } from './modules/station-deliveries/station-deliveries.module';
import { SyncModule } from './modules/sync/sync.module';
import { AdminModule } from './modules/admin/admin.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PlacesModule } from './modules/places/places.module';
import { ZaloVerificationModule } from './verification/zalo-verification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    // Chỉ dùng cho endpoint gọi API trả phí qua UserThrottlerGuard (Q28), không áp cho toàn API.
    ThrottlerModule.forRoot([PAID_API_RATE_LIMITS.stationsRecommend]),
    PrismaModule,
    RedisModule,
    AuthModule,
    MerchantsModule,
    OrdersModule,
    StationsModule,
    ContainersModule,
    CollectionsModule,
    CollectorsModule,
    StationDeliveriesModule,
    SyncModule,
    AdminModule,
    PaymentsModule,
    PlacesModule,
    ZaloVerificationModule,
    HealthModule,
  ],
})
export class AppModule {}
