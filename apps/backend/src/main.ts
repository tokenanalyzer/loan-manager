import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

/**
 * Application bootstrap.
 *
 * Phase 1 scope: process entry point only. No routes, guards,
 * interceptors, or business logic are wired up yet — those arrive
 * in later phases alongside the API and database work.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const port = process.env.BACKEND_PORT ?? 3000;
  await app.listen(port);
}

void bootstrap();
