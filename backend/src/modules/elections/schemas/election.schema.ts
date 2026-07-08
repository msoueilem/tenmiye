import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ElectionDocument = HydratedDocument<Election>;

// strict:false keeps nested/board-lifecycle fields (rounds, results, nominees)
// flexible without over-specifying every shape.
@Schema({ timestamps: true, collection: 'elections', strict: false })
export class Election {
  @Prop({ required: true }) title!: string;
  @Prop({ type: String, default: null }) description!: string | null;
  @Prop({ required: true }) type!: string; // yes_no | multiple_choice | board
  @Prop({ default: 'draft' }) status!: string;
  @Prop({ type: [Object], default: [] }) options!: Record<string, unknown>[];
  @Prop({ type: Date, default: null }) startTime!: Date | null;
  @Prop({ type: Date, default: null }) endTime!: Date | null;
  @Prop({ type: Date, default: null }) nominationStart!: Date | null;
  @Prop({ type: Date, default: null }) nominationEnd!: Date | null;
  @Prop({ type: Date, default: null }) dismissalStart!: Date | null;
  @Prop({ type: Date, default: null }) dismissalEnd!: Date | null;
  @Prop({ type: Date, default: null }) votingStart!: Date | null;
  @Prop({ type: Date, default: null }) votingEnd!: Date | null;
  @Prop({ type: Object, default: null }) boardConfig!: Record<string, unknown> | null;
  @Prop({ type: [Object], default: null }) nominees!: Record<string, unknown>[] | null;
  @Prop({ type: [Object], default: null }) rounds!: Record<string, unknown>[] | null;
  @Prop({ type: Number, default: null }) currentRound!: number | null;
  @Prop({ type: Object, default: null }) results!: Record<string, unknown> | null;
  @Prop({ type: String, default: null }) cancellationReason!: string | null;
  @Prop() createdBy?: string;
}

export const ElectionSchema = SchemaFactory.createForClass(Election);
