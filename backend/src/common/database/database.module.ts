import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/app.config';

/**
 * Establishes the MongoDB connection for the whole app.
 *
 * The target instance runs as a single-node replica set (`rs0`), which is
 * required for the multi-document transactions used in the elections module.
 */
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        uri: config.get('mongodbUri', { infer: true }),
      }),
    }),
  ],
})
export class DatabaseModule {}
