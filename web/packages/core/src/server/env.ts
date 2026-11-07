import 'server-only';

/**
 * Server-side configuration, read lazily (never at build time) and validated once.
 * See .env.example for the meaning of each variable.
 */
export interface ServerEnv {
  appUrl: string;
  apiUrl: string;
  redisUrl: string;
  keycloakIssuer: string;
  keycloakClientId: string;
  keycloakClientSecret: string;
}

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (cached) return cached;

  const required = (name: string): string => {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Missing environment variable ${name} (see .env.example)`);
    }
    return value.replace(/\/$/, '');
  };

  cached = {
    appUrl: required('APP_URL'),
    apiUrl: required('API_URL'),
    redisUrl: required('REDIS_URL'),
    keycloakIssuer: required('KEYCLOAK_ISSUER'),
    keycloakClientId: required('KEYCLOAK_CLIENT_ID'),
    keycloakClientSecret: required('KEYCLOAK_CLIENT_SECRET'),
  };
  return cached;
}

/**
 * Prefix of every Redis key this app writes (`REDIS_KEY_PREFIX`, default `web:`). Each app has its
 * own prefix AND its own Redis ACL user restricted to it (portfolio-web `web:*`, admin-web
 * `admin-web:*`): one app can neither read nor wipe the other's sessions. Read on its own (not via
 * serverEnv()) so pure helpers and their tests don't need the whole environment.
 */
export function redisKeyPrefix(): string {
  const prefix = process.env.REDIS_KEY_PREFIX || 'web:';
  if (!/^[a-z][a-z0-9-]*:$/.test(prefix)) {
    throw new Error(`REDIS_KEY_PREFIX must look like "name:" (got "${prefix}")`);
  }
  return prefix;
}

/** A client role the user must have to use this app at all, e.g. admin-web:admin. */
export interface RequiredRole {
  client: string;
  role: string;
}

/**
 * `KEYCLOAK_REQUIRED_ROLE=<client>:<role>` (optional; admin-web sets `admin-web:admin`). Without
 * it, any user of the realm may sign in (portfolio-web). Checked at sign-in AND on every token
 * refresh, so removing the role in Keycloak ends the session at the next refresh.
 */
export function requiredRole(): RequiredRole | undefined {
  const value = process.env.KEYCLOAK_REQUIRED_ROLE?.trim();
  if (!value) return undefined;
  // Role names may contain ':' themselves (deployment:admin): the client id never does.
  const first = value.indexOf(':');
  if (first <= 0 || first === value.length - 1) {
    throw new Error(`KEYCLOAK_REQUIRED_ROLE must be "<client>:<role>" (got "${value}")`);
  }
  return { client: value.slice(0, first), role: value.slice(first + 1) };
}
