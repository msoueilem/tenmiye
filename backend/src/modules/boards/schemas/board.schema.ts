import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BoardDocument = HydratedDocument<Board>;

@Schema({ timestamps: true, collection: 'boards' })
export class Board {
  @Prop({ required: true }) name!: string;
  @Prop({ type: String, default: null }) description!: string | null;
  @Prop({ type: [String], default: [] }) roleIds!: string[];
  @Prop({ type: String, default: null }) logoUploadId!: string | null;
  @Prop({ type: Date, required: true }) termStartDate!: Date;
  @Prop({ type: Date, required: true }) termEndDate!: Date;
  @Prop({ default: 'upcoming' }) status!: string;
  @Prop({ type: [String], default: [] }) mandates!: string[];
  @Prop({ type: [String], default: [] }) obligations!: string[];
  @Prop({ type: [Object], default: [] }) achievements!: Record<string, unknown>[];
  @Prop({ type: String, default: null }) electionId!: string | null;
  @Prop({ type: String, default: null }) predecessorBoardId!: string | null;
}

export const BoardSchema = SchemaFactory.createForClass(Board);
