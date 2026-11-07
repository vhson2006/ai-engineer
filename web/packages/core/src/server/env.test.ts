import { afterEach, describe, expect, it, vi } from 'vitest';
import { redisKeyPrefix, requiredRole } from './env';

afterEach(() => vi.unstubAllEnvs());

describe('redisKeyPrefix', () => {
  it('defaults to web: and accepts an app prefix', () => {
    vi.stubEnv('REDIS_KEY_PREFIX', '');
    expect(redisKeyPrefix()).toBe('web:');
    vi.stubEnv('REDIS_KEY_PREFIX', 'admin-web:');
    expect(redisKeyPrefix()).toBe('admin-web:');
  });

  it.each(['admin', 'Admin:', '*:', 'a b:', 'web:*'])('refuses %s', (value) => {
    vi.stubEnv('REDIS_KEY_PREFIX', value);
    expect(() => redisKeyPrefix()).toThrow(/REDIS_KEY_PREFIX/);
  });
});

describe('requiredRole', () => {
  it('is optional', () => {
    vi.stubEnv('KEYCLOAK_REQUIRED_ROLE', '');
    expect(requiredRole()).toBeUndefined();
  });

  it('splits on the first colon (role names may contain one)', () => {
    vi.stubEnv('KEYCLOAK_REQUIRED_ROLE', 'admin-web:admin');
    expect(requiredRole()).toEqual({ client: 'admin-web', role: 'admin' });
    vi.stubEnv('KEYCLOAK_REQUIRED_ROLE', 'deployments-api:deployment:admin');
    expect(requiredRole()).toEqual({ client: 'deployments-api', role: 'deployment:admin' });
  });

  it.each(['admin', ':admin', 'admin-web:'])('refuses %s', (value) => {
    vi.stubEnv('KEYCLOAK_REQUIRED_ROLE', value);
    expect(() => requiredRole()).toThrow(/KEYCLOAK_REQUIRED_ROLE/);
  });
});
