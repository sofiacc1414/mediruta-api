import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { exceptionFactoryEnEspanol } from './shared/infrastructure/pipes/mensajes-validacion';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilita req.cookies — necesario para leer el refresh token del flujo
  // Web, que viaja en una cookie HttpOnly (ver refresh-cookie.ts).
  app.use(cookieParser());

  // Orígenes permitidos para el panel Web (CORS). Lista separada por comas
  // en CORS_ORIGINS — por defecto solo el dev server local de Vite.
  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // class-validator arma sus mensajes default en inglés — todo el
      // resto de la API responde en español, esto traduce esa única
      // fuente que quedaba afuera (ver mensajes-validacion.ts).
      exceptionFactory: exceptionFactoryEnEspanol,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
