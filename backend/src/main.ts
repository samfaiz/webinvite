import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // behind nginx: honour X-Forwarded-Proto/Host so absolute upload URLs are https + real domain
  app.set('trust proxy', 1);

  // serve uploaded design images / media at /uploads/*
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config.get<string>('FRONTEND_ORIGIN') || 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = config.get<number>('PORT') || 4000;
  await app.listen(port);
  console.log(`✅ API running on http://localhost:${port}/api`);
}
bootstrap();
