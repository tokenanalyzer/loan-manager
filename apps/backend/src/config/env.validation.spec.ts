import { envValidationSchema } from './env.validation';

describe('envValidationSchema', () => {
  it('rejects when DATABASE_URL is missing', () => {
    const { error } = envValidationSchema.validate({ NODE_ENV: 'test' });
    expect(error).toBeDefined();
    expect(error?.message).toContain('DATABASE_URL');
  });

  it('accepts a minimal valid configuration', () => {
    const { error, value } = envValidationSchema.validate({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    });

    expect(error).toBeUndefined();
    expect(value.BACKEND_PORT).toBe(3000);
    expect(value.LOG_LEVEL).toBe('info');
  });

  it('rejects an invalid NODE_ENV value', () => {
    const { error } = envValidationSchema.validate({
      NODE_ENV: 'not-a-real-env',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    });

    expect(error).toBeDefined();
  });
});
