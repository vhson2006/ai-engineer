import 'server-only';
import * as client from 'openid-client';

/**
 * The token of a PUBLIC site's own server (no visitor signs in): Keycloak client credentials of
 * a confidential client with a service account (ADR 0032), e.g. laundry-web → content:read on
 * /sites/laundry. Server only, never sent to the browser; kept in memory until 30 s before it
 * expires, one request to Keycloak at a time.
 *
 * Env: KEYCLOAK_ISSUER, KEYCLOAK_CLIENT_ID, KEYCLOAK_CLIENT_SECRET (no Redis, no sessions).
 */
const SKEW_MS = 30_000;
const KEYCLOAK_TIMEOUT_S = 5;

let configPromise: Promise<client.Configuration> | undefined;
let current: { token: string; expiresAt: number } | undefined;
let pending: Promise<string> | undefined;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name} (see .env.example)`);
  return value.replace(/\/$/, '');
}

function config(): Promise<client.Configuration> {
  configPromise ??= (async () => {
    const issuer = new URL(env('KEYCLOAK_ISSUER'));
    const local = issuer.protocol === 'http:' && (['localhost', '127.0.0.1'].includes(issuer.hostname) || (process.env.NODE_ENV !== 'production' && issuer.hostname.endsWith('.localtest.me')));
    return client.discovery(issuer, env('KEYCLOAK_CLIENT_ID'), env('KEYCLOAK_CLIENT_SECRET'), undefined, {
      timeout: KEYCLOAK_TIMEOUT_S,
      execute: local ? [client.allowInsecureRequests] : [],
    });
  })().catch((error: unknown) => {
    configPromise = undefined; // Keycloak may be starting: try again next time
    throw error;
  });
  return configPromise;
}

async function fetchToken(): Promise<string> {
  const tokens = await client.clientCredentialsGrant(await config());
  current = { token: tokens.access_token, expiresAt: Date.now() + (tokens.expiresIn() ?? 60) * 1000 };
  return current.token;
}

/** A valid service token (cached). */
export function getServiceToken(): Promise<string> {
  if (current && current.expiresAt - SKEW_MS > Date.now()) return Promise.resolve(current.token);
  pending ??= fetchToken().finally(() => {
    pending = undefined;
  });
  return pending;
}

/** The API refused `rejected` (401): forget it and get a new one, once. */
export function renewServiceToken(rejected: string): Promise<string> {
  if (current?.token === rejected) current = undefined;
  return getServiceToken();
}
