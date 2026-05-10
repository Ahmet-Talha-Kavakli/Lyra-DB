import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './shared/filters/http-exception.filter';

async function bootstrap() {
  // rawBody:true → Clerk webhook svix signature verification needs raw bytes
  // (any JSON re-serialize would break the HMAC). Per-route opt-in via
  // @Req() req.rawBody.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.enableCors({
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);

  console.log(`API running on http://localhost:${port}`);
}

bootstrap();
