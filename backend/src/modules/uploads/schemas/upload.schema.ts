import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UploadDocument = HydratedDocument<Upload>;

@Schema({ timestamps: true, collection: 'uploads' })
export class Upload {
  @Prop({ required: true }) originalName!: string;
  @Prop({ required: true }) mimeType!: string;
  @Prop({ required: true }) extension!: string;
  @Prop({ required: true }) sizeBytes!: number;
  @Prop({ required: true }) storagePath!: string;
  @Prop({ type: String, default: null }) downloadUrl!: string | null;
  @Prop({ type: Date, default: null }) urlExpiresAt!: Date | null;
  @Prop({ default: false }) storageDeleted!: boolean;
  @Prop({ type: Date, default: null }) storageDeletedAt!: Date | null;
  @Prop({ required: true }) ownerType!: string;
  @Prop({ required: true }) ownerId!: string;
  @Prop({ required: true }) purpose!: string;
  @Prop({ default: 'active' }) status!: string;
  @Prop({ default: 'passed' }) validationStatus!: string;
  @Prop({ type: [String], default: null }) validationErrors!: string[] | null;
  @Prop({ required: true }) uploadedBy!: string;
  @Prop({ type: Date, default: null }) uploadedAt!: Date | null;
  @Prop({ default: false }) deleted!: boolean;
  @Prop({ type: Date, default: null }) deletedAt!: Date | null;
  @Prop({ type: String, default: null }) deletedBy!: string | null;
  @Prop({ type: String, default: null }) deletionReason!: string | null;
  @Prop({ type: String, default: null }) deletionNote!: string | null;
  @Prop({ type: String, default: null }) replacedBy!: string | null;
  @Prop({ type: Date, default: null }) replacedAt!: Date | null;
  @Prop({ type: Object, default: null }) dimensions!: { width: number; height: number } | null;
  @Prop({ type: String, default: null }) thumbnailPath!: string | null;
  @Prop({ type: String, default: null }) thumbnailUrl!: string | null;
  @Prop({ default: 0 }) referenceCount!: number;
  @Prop({ type: [Object], default: [] }) history!: Record<string, unknown>[];
  @Prop({ type: String, default: null }) updatedBy!: string | null;
}

export const UploadSchema = SchemaFactory.createForClass(Upload);
