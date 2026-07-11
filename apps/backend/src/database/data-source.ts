import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

import { ALL_ENTITIES } from './entities';

/**
 * Standalone TypeORM DataSource for the CLI (migration:generate/run/revert).
 *
 * Kept separate from the Nest DI-managed connection in `database.module.ts`
 * because the TypeORM CLI needs a plain DataSource instance, not a Nest
 * module. Uses the same explicit entity list and naming strategy as
 * `database.module.ts` so migrations generated/run via this CLI always
 * match the runtime connection's expected schema exactly.
 */
loadEnv();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  logging: process.env.DATABASE_LOGGING === 'true',
  entities: ALL_ENTITIES,
  namingStrategy: new SnakeNamingStrategy(),
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});

export default AppDataSource;
