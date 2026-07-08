import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema({ timestamps: true, collection: 'transactions' })
export class Transaction {
  @Prop({ required: true }) type!: string; // contribution | donation | expense
  @Prop({ required: true }) amount!: number;
  @Prop({ type: Date, required: true }) date!: Date;
  @Prop({ required: true }) year!: number;
  @Prop({ required: true }) month!: number;
  @Prop({ required: true }) paymentChannelId!: string;
  @Prop({ type: String, default: null }) receivedBy!: string | null;
  @Prop({ type: String, default: null }) receivedByNote!: string | null;
  @Prop({ type: String, default: null }) screenshotUploadId!: string | null;
  @Prop({ type: String, default: null }) userId!: string | null;
  @Prop({ type: String, default: null }) period!: string | null;
  @Prop({ type: String, default: null }) paidTo!: string | null;
  @Prop({ type: String, default: null }) purpose!: string | null;
  @Prop({ type: String, default: null }) receiptUploadId!: string | null;
  @Prop({ type: String, default: null }) notes!: string | null;
  @Prop({ required: true }) recordedBy!: string;
  @Prop({ type: String, default: null }) verifiedBy!: string | null;
  @Prop({ type: Date, default: null }) verifiedAt!: Date | null;
  @Prop({ default: true }) isActive!: boolean;
  @Prop({ type: String, default: null }) disabledBy!: string | null;
  @Prop({ type: Date, default: null }) disabledAt!: Date | null;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
