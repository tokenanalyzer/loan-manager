import Joi from 'joi';

/**
 * Joi schema used by ConfigModule to validate process.env at startup.
 *
 * Fails fast with a clear error if required configuration is missing,
 * rather than allowing the app to start in a partially-configured state.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),

  BACKEND_PORT: Joi.number().port().default(3000),
  BACKEND_HOST: Joi.string().default('0.0.0.0'),
  API_PREFIX: Joi.string().default('api'),
  CORS_ORIGIN: Joi.string().default('*'),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),

  // Database — required so misconfiguration is caught at boot, not on first query.
  DATABASE_URL: Joi.string().uri().required(),
  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_LOGGING: Joi.boolean().default(false),
  DATABASE_MAX_CONNECTIONS: Joi.number().integer().min(1).default(10),

  // Firebase Admin — optional in Phase 2. When absent, the Firebase module
  // no-ops instead of throwing, so the backend still starts successfully.
  FIREBASE_ENABLED: Joi.boolean().default(false),
  FIREBASE_ADMIN_PROJECT_ID: Joi.string().allow('').optional(),
  FIREBASE_ADMIN_CLIENT_EMAIL: Joi.string().allow('').optional(),
  FIREBASE_ADMIN_PRIVATE_KEY: Joi.string().allow('').optional(),

  // Local file storage (Phase 6 — Documents). See src/storage/.
  UPLOADS_DIR: Joi.string().default('./uploads'),
}).unknown(true);
