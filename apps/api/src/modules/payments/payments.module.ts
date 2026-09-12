import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  AdminOilPricesController,
  AdminPaymentsController,
  MerchantOilPriceController,
  MerchantPaymentsController,
} from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminPaymentsController, AdminOilPricesController, MerchantPaymentsController, MerchantOilPriceController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
