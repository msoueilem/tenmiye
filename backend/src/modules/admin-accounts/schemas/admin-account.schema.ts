import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AdminAccountDocument = HydratedDocument<AdminAccount>;

@Schema({ timestamps: true, collection: 'adminAccounts' })
export class AdminAccount {
  @Prop({ required: true }) googleEmail!: string;
  @Prop({ type: String, default: null }) userId!: string | null;
  @Prop({ type: [String], default: [] }) permissions!: string[];
  @Prop({ default: 'active' }) status!: string;
}

export const AdminAccountSchema = SchemaFactory.createForClass(AdminAccount);
