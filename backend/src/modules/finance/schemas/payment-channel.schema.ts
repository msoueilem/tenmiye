import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PaymentChannelDocument = HydratedDocument<PaymentChannel>;

@Schema({ timestamps: true, collection: 'paymentChannels' })
export class PaymentChannel {
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) type!: string; // 'mobile' | 'cash'
  @Prop({ type: String, default: null }) walletNumber!: string | null;
  @Prop({ type: String, default: null }) walletOwner!: string | null;
  @Prop({ default: false }) requiresScreenshot!: boolean;
  @Prop({ default: false }) requiresReceiver!: boolean;
  @Prop({ default: true }) isActive!: boolean;
}

export const PaymentChannelSchema = SchemaFactory.createForClass(PaymentChannel);
