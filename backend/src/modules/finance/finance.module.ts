import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { PaymentChannel, PaymentChannelSchema } from './schemas/payment-channel.schema';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { Upload, UploadSchema } from '../uploads/schemas/upload.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentChannel.name, schema: PaymentChannelSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Upload.name, schema: UploadSchema },
    ]),
  ],
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
