import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RoadDistanceService } from './road-distance';
import { StationsController } from './stations.controller';
import { StationsService } from './stations.service';

@Module({
  imports: [PrismaModule],
  controllers: [StationsController],
  providers: [StationsService, RoadDistanceService],
})
export class StationsModule {}
