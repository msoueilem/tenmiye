import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RoleDocument = HydratedDocument<Role>;

@Schema({ timestamps: true, collection: 'roles' })
export class Role {
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) slug!: string;
  @Prop() description?: string;
  @Prop({ type: [String], default: [] }) responsibilities!: string[];
  @Prop({ type: [String], required: true }) permissions!: string[];
  @Prop({ default: true }) isActive!: boolean;
  @Prop() createdBy?: string;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
