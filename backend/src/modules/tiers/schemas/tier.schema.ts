import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TierDocument = HydratedDocument<Tier>;

@Schema({ timestamps: true, collection: 'tiers' })
export class Tier {
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) slug!: string;
  @Prop() description?: string;
  @Prop({ required: true }) monthlyAmount!: number;
  @Prop({ default: true }) isActive!: boolean;
  @Prop() createdBy?: string;
}

export const TierSchema = SchemaFactory.createForClass(Tier);
