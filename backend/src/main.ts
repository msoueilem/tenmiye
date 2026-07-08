import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfig } from './common/config/app.config';

const REQUIRED_ENV = [
  'JWT_SECRET',
  'MONGODB_URI',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_WEB_API_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
] as const;

function assertEnv() {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

async function bootstrap() {
  assertEnv();
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // All API routes are served under /api (e.g. /api/health, /api/auth/...).
  // Static uploads remain at /uploads (served by ServeStaticModule).
  app.setGlobalPrefix('api');

  const appConfig = app.get(ConfigService<AppConfig, true>);
  app.enableCors({
    origin: appConfig.get('frontendUrls', { infer: true }),
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Tenmiye API')
    .setDescription('Will Group for Development — backend API')
    .setVersion('1.0')
    .addServer('/api')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  // Swagger UI at /api/docs, OpenAPI JSON at /api/openapi.json
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/openapi.json',
  });

  await app.listen(appConfig.get('port', { infer: true }));
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
