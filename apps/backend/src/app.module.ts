import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';

/**
 * Root application module.
 *
 * Intentionally minimal for Phase 1 — no controllers, providers, or
 * feature modules are registered yet. ConfigModule is included as
 * foundational wiring so environment variables load consistently
 * across future modules.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
  ],
})
export class AppModule {}
