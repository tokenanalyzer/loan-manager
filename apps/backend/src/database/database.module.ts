import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

import { ALL_ENTITIES } from './entities';

/**
 * DatabaseModule — PostgreSQL connection configuration.
 *
 * Phase 3 scope: registers the schema's entities (see
 * `src/database/entities/`) and applies the same snake_case naming
 * strategy used by the standalone CLI DataSource, so runtime column
 * names always match what the migrations create.
 *
 * `synchronize` stays `false` — schema changes are owned entirely by
 * migrations (`src/database/migrations/`), never by TypeORM's
 * auto-sync, which is unsafe for anything beyond local prototyping.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.get<string>('database.url'),
        ssl: config.get<boolean>('database.ssl') ? { rejectUnauthorized: false } : false,
        logging: config.get<boolean>('database.logging'),
        extra: {
          max: config.get<number>('database.maxConnections'),
        },
        entities: ALL_ENTITIES,
        namingStrategy: new SnakeNamingStrategy(),
        synchronize: false,
        migrationsRun: false,
        autoLoadEntities: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
