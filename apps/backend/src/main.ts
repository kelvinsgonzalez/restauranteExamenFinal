import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        process.env.FRONTEND_ORIGIN ?? '',
      ].filter(Boolean),
      credentials: true,
    },
  });

  const configService = app.get(ConfigService);
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: true,
    }),
  );

  const prefix = configService.get<string>('API_PREFIX', '/api/v1');
  app.setGlobalPrefix(prefix);

  const port = configService.get<number>('API_PORT', 3000);
  await app.listen(port);
  console.log(`API ready on http://localhost:${port}${prefix}`);
}

bootstrap();

