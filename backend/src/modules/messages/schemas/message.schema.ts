import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true, collection: 'messages' })
export class Message {
  @Prop({ required: true }) name!: string;
  @Prop() email?: string;
  @Prop() phone?: string;
  @Prop({ required: true }) body!: string;
  @Prop({ default: false }) read!: boolean;
  @Prop({ type: Date, default: null }) readAt!: Date | null;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
