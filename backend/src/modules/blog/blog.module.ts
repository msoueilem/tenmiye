import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { BlogPost, BlogPostSchema } from './schemas/blog-post.schema';
import { Upload, UploadSchema } from '../uploads/schemas/upload.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BlogPost.name, schema: BlogPostSchema },
      { name: Upload.name, schema: UploadSchema },
    ]),
  ],
  controllers: [BlogController],
  providers: [BlogService],
})
export class BlogModule {}
