import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StationsService } from '../stations/stations.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { OperationsMapService } from './operations-map.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [AdminService, OperationsMapService, StationsService],
})
export class AdminModule {}
