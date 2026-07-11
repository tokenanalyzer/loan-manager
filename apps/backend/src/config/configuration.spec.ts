import configuration from './configuration';

describe('configuration()', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('applies sensible defaults when optional env vars are unset', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    delete process.env.BACKEND_PORT;
    delete process.env.LOG_LEVEL;

    const result = configuration();

    expect(result.app.port).toBe(3000);
    expect(result.app.logLevel).toBe('info');
    expect(result.database.ssl).toBe(false);
    expect(result.firebase.enabled).toBe(false);
  });

  it('reflects explicitly set environment variables', () => {
    process.env.BACKEND_PORT = '4000';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.FIREBASE_ENABLED = 'true';
    process.env.FIREBASE_ADMIN_PROJECT_ID = 'demo-project';

    const result = configuration();

    expect(result.app.port).toBe(4000);
    expect(result.firebase.enabled).toBe(true);
    expect(result.firebase.projectId).toBe('demo-project');
  });
});
