import 'reflect-metadata';

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { Logger, PinoLogger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * Application bootstrap — server configuration.
 *
 * Phase 2 scope: process entry point, global middleware, pipes, and
 * error handling. No routes/controllers are registered yet — those
 * arrive alongside the API work in a later phase.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const config = app.get(ConfigService);

  // Structured logging (Pino) replaces Nest's default console logger.
  app.useLogger(app.get(Logger));

  // Security headers.
  app.use(helmet());

  // CORS — origin is configurable per environment. `credentials: false`
  // is deliberate: auth uses a Bearer token (Authorization header), not
  // cookies, so no credentialed/cookie-based cross-origin requests ever
  // happen. This also avoids an invalid combination some browsers
  // reject outright: `origin: '*'` together with `credentials: true`.
  // In production, set CORS_ORIGIN to the admin panel's real origin(s)
  // rather than leaving the local-dev default of '*'.
  app.enableCors({
    origin: config.get<string>('app.corsOrigin'),
    credentials: false,
  });

  // Consistent request validation for all future DTOs.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Consistent, centrally-logged error responses.
  app.useGlobalFilters(new AllExceptionsFilter(await app.resolve(PinoLogger)));

  // Reserved for future controllers (e.g. /api/v1/...). No routes exist yet.
  app.setGlobalPrefix(config.get<string>('app.apiPrefix') ?? 'api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Graceful shutdown on SIGTERM/SIGINT (container orchestration friendly).
  app.enableShutdownHooks();

  const port = config.get<number>('app.port') ?? 3000;
  const host = config.get<string>('app.host') ?? '0.0.0.0';

  await app.listen(port, host);
}

void bootstrap();
