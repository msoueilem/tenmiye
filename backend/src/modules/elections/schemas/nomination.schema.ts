import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NominationDocument = HydratedDocument<Nomination>;

// _id is the composite `${electionId}_${nominatorUserId}` — one nomination per
// member per election (was a Firestore subcollection under the election).
@Schema({ collection: 'nominations', timestamps: { createdAt: false, updatedAt: false } })
export class Nomination {
  @Prop({ type: String }) _id!: string;
  @Prop({ required: true }) electionId!: string;
  @Prop({ required: true }) nominatorUserId!: string;
  @Prop({ type: [String], default: [] }) nominees!: string[];
  @Prop({ required: true }) round!: number;
  @Prop({ type: Date, default: null }) submittedAt!: Date | null;
}

export const NominationSchema = SchemaFactory.createForClass(Nomination);
