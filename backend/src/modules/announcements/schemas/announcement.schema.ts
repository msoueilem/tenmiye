import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AnnouncementDocument = HydratedDocument<Announcement>;

@Schema({ timestamps: true, collection: 'announcements' })
export class Announcement {
  @Prop({ required: true }) message!: string;
  @Prop({ required: true }) type!: string; // 'info' | 'warning' | 'event'
  @Prop({ default: true }) isActive!: boolean;
  @Prop({ type: Date, default: null }) startDate!: Date | null;
  @Prop({ type: Date, default: null }) endDate!: Date | null;
  @Prop({ type: String, default: null }) ctaLabel!: string | null;
  @Prop({ type: String, default: null }) ctaUrl!: string | null;
  @Prop() createdBy?: string;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);
