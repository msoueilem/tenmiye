import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

@Schema({ collection: 'refreshTokens', timestamps: { createdAt: true, updatedAt: false } })
export class RefreshToken {
  @Prop({ required: true }) userId!: string;
  @Prop({ required: true, index: true }) tokenHash!: string;
  @Prop({ type: Date, required: true }) expiresAt!: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
