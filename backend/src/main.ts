import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // Origen exacto del front (Cloudflare Pages / local). No usar '*' con credentials.
  const frontendOrigin = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(
    /\/$/,
    '',
  );
  app.enableCors({
    origin: frontendOrigin,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`LRJAS API listening on 0.0.0.0:${port}`);
}
bootstrap();
