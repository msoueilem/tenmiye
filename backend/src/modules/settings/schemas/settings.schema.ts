import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SettingsDocument = HydratedDocument<Settings>;

/**
 * The landing-page CMS document. Content is dynamic (arbitrary nested fields
 * managed through the dashboard), so the schema is intentionally non-strict —
 * unknown fields are persisted as-is. Stored as a singleton with `_id: 'public'`.
 */
@Schema({
  collection: 'settings',
  strict: false,
  minimize: false,
  versionKey: false,
  timestamps: { createdAt: false, updatedAt: true },
})
export class Settings {
  @Prop({ type: String })
  _id!: string;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
