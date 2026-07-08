import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type JoinRequestDocument = HydratedDocument<JoinRequest>;

@Schema({ timestamps: true, collection: 'join-requests' })
export class JoinRequest {
  @Prop({ required: true }) fullName!: string;
  @Prop({ required: true }) phone!: string;
  @Prop({ type: String, default: null }) tierId!: string | null;
  @Prop({ type: String, default: null }) city!: string | null;
  @Prop({ type: String, default: null }) message!: string | null;
  @Prop({ default: 'pending' }) status!: string;
  @Prop({ type: String, default: null }) rejectionReason!: string | null;
  @Prop({ type: String, default: null }) reviewedBy!: string | null;
  @Prop({ type: Date, default: null }) reviewedAt!: Date | null;
  @Prop({ type: String, default: null }) createdUserId!: string | null;
}

export const JoinRequestSchema = SchemaFactory.createForClass(JoinRequest);
