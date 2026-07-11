/**
 * Typed, namespaced configuration factory consumed via ConfigService.
 *
 * Usage: configService.get<number>('app.port')
 */
export interface AppConfig {
  env: string;
  port: number;
  host: string;
  apiPrefix: string;
  corsOrigin: string;
  logLevel: string;
}

export interface DatabaseConfig {
  url: string;
  ssl: boolean;
  logging: boolean;
  maxConnections: number;
}

export interface FirebaseConfig {
  enabled: boolean;
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
}

export interface StorageConfig {
  localRoot: string;
}

export default () => ({
  app: {
    env: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.BACKEND_PORT ?? '3000', 10),
    host: process.env.BACKEND_HOST ?? '0.0.0.0',
    apiPrefix: process.env.API_PREFIX ?? 'api',
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
    logLevel: process.env.LOG_LEVEL ?? 'info',
  } satisfies AppConfig,
  database: {
    url: process.env.DATABASE_URL ?? '',
    ssl: process.env.DATABASE_SSL === 'true',
    logging: process.env.DATABASE_LOGGING === 'true',
    maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS ?? '10', 10),
  } satisfies DatabaseConfig,
  firebase: {
    enabled: process.env.FIREBASE_ENABLED === 'true',
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || undefined,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || undefined,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY || undefined,
  } satisfies FirebaseConfig,
  storage: {
    localRoot: process.env.UPLOADS_DIR ?? './uploads',
  } satisfies StorageConfig,
});
