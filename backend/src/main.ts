import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfig } from './common/config/app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const appConfig = app.get(ConfigService<AppConfig, true>);
  app.enableCors({
    origin: appConfig.get('frontendUrl', { infer: true }),
  });

  const config = new DocumentBuilder()
    .setTitle('Tenmiye API')
    .setDescription('Will Group for Development — backend API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(appConfig.get('port', { infer: true }));
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
