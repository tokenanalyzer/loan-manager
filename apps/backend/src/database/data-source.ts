import * as path from 'path';

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
  // Resolved relative to this file's own location so the same glob works
  // whether run via ts-node against src/ (dev, migration:generate/revert)
  // or via plain node against the compiled dist/ (production migration:run
  // — the prod Docker image ships dist/ only, no src/).
  migrations: [path.join(__dirname, `migrations/*.${__filename.endsWith('.ts') ? 'ts' : 'js'}`)],
  synchronize: false,
  // Default ('all') wraps every pending migration in a single transaction
  // per `migration:run` invocation, which breaks the documented
  // ALTER-TYPE-ADD-VALUE-then-use-it-later pattern already established by
  // AddCustomerEmployeeQueryWorkflow/AddPhotoDocumentCategory: Postgres
  // refuses to use a newly added enum value until it's actually committed.
  // 'each' commits every migration in its own transaction instead.
  migrationsTransactionMode: 'each',
});
