import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VoteDocument = HydratedDocument<Vote>;

// _id is the composite `${electionId}_${userId}` — enforces one vote per member.
@Schema({ collection: 'votes', timestamps: { createdAt: false, updatedAt: false } })
export class Vote {
  @Prop({ type: String }) _id!: string;
  @Prop({ required: true }) electionId!: string;
  @Prop({ required: true }) userId!: string;
  @Prop({ type: String, default: null }) electionType!: string | null;
  @Prop({ type: [String], default: [] }) choices!: string[];
  @Prop({ type: Date, default: null }) castAt!: Date | null;
}

export const VoteSchema = SchemaFactory.createForClass(Vote);
