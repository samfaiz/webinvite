import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { join } from 'path';
import { AppModule } from './app.module';

// invitation content can embed base64 photos → allow large JSON bodies (cap ~300MB)
const BODY_LIMIT = '300mb';

async function bootstrap() {
  // disable the built-in 100kb body parser so we can raise the limit below
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const config = app.get(ConfigService);

  app.use(json({ limit: BODY_LIMIT }));
  app.use(urlencoded({ extended: true, limit: BODY_LIMIT }));

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
