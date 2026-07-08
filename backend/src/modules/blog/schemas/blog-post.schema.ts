import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BlogPostDocument = HydratedDocument<BlogPost>;

// `strict: false` preserves the richer fields present on imported posts
// (excerpt, contentFormat, viewCount, …) that the current API doesn't manage.
@Schema({ timestamps: true, collection: 'blogs', strict: false })
export class BlogPost {
  @Prop({ required: true }) title!: string;
  @Prop({ required: true }) slug!: string;
  @Prop({ type: String, default: '' }) content!: string;
  @Prop({ type: [String], default: [] }) tags!: string[];
  @Prop({ type: String, default: null }) featureImageId!: string | null;
  @Prop({ default: 'draft' }) status!: string;
  @Prop({ type: Date, default: null }) publishedAt!: Date | null;
  @Prop({ type: String, default: null }) authorId!: string | null;
}

export const BlogPostSchema = SchemaFactory.createForClass(BlogPost);
