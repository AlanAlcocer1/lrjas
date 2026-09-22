import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

function resolveCorsOrigins(): string | string[] | boolean {
  if (process.env.NODE_ENV !== 'production') {
    // En local permitir cualquier origen (Vite puede saltar de puerto)
    return true;
  }
  const multi = process.env.FRONTEND_URLS;
  if (multi) {
    return multi.split(',').map((s) => s.trim()).filter(Boolean);
  }
  const single = process.env.FRONTEND_URL || 'http://localhost:5173';
  const actividades =
    process.env.ACTIVIDADES_PUBLIC_URL || 'http://localhost:5174';
  const origins = Array.from(new Set([single, actividades]));
  return origins.length === 1 ? origins[0] : origins;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: resolveCorsOrigins(),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`LRJAS API running on port ${port}`);
}
bootstrap();
