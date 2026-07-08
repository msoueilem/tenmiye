import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true }) fullName!: string;
  @Prop({ type: String, default: null }) fullNameAr!: string | null;
  @Prop({ type: String, default: null }) fullNameFr!: string | null;
  @Prop({ required: true }) whatsappNumber!: string;
  @Prop({ required: true }) phoneNumber!: string;
  @Prop({ type: String, default: null }) nationalId!: string | null;
  @Prop({ type: String, default: null }) city!: string | null;
  @Prop({ type: String, default: null }) regionId!: string | null;
  @Prop({ type: String, default: null }) joinRequestId!: string | null;
  @Prop({ required: true }) roleId!: string;
  @Prop({ required: true }) tierId!: string;
  @Prop({ type: String, default: null }) profilePictureId!: string | null;
  @Prop({ default: false }) outsidePlatform!: boolean;
  @Prop({ default: false }) isBlocked!: boolean;
  @Prop({ default: false }) outsideWhatsapp!: boolean;
  @Prop({ default: 'pending' }) status!: string;
  @Prop({ type: String, default: null }) approvedBy!: string | null;
  @Prop({ type: Date, default: null }) approvedAt!: Date | null;
  @Prop({ type: Date, default: null }) lastLoginAt!: Date | null;
  // Set by the auth module; never returned by the API (see UserResponseDto).
  @Prop({ type: String, default: null }) passwordHash!: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
