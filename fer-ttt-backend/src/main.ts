import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      transform: true, // Transform payloads to DTOs
      forbidNonWhitelisted: true, // Throw errors if non-whitelisted properties are present
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
