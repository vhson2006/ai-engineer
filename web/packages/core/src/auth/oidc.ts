import 'server-only';
import * as client from 'openid-client';
import { serverEnv } from '../server/env';

/**
 * Keycloak client "web" (confidential, Authorization Code + PKCE), discovered from the realm's
 * /.well-known/openid-configuration once per process.
 */
let configPromise: Promise<client.Configuration> | undefined;
const KEYCLOAK_TIMEOUT_S = 5;

export function oidcConfig(): Promise<client.Configuration> {
  configPromise ??= (async () => {
    const env = serverEnv();
    const issuer = new URL(env.keycloakIssuer);
    return client.discovery(issuer, env.keycloakClientId, env.keycloakClientSecret, undefined, {
      // Seconds, for discovery AND every later call (code exchange, refresh). The default (30 s)
      // would hang a page render; it also must stay below the refresh lock TTL (10 s).
      timeout: KEYCLOAK_TIMEOUT_S,
      // Local Keycloak is plain HTTP (localhost, or *.localtest.me through the dev Gateway).
      // Never allowed for any other host, and *.localtest.me never in production.
      execute: isLocalHttp(issuer) ? [client.allowInsecureRequests] : [],
    });
  })().catch((error: unknown) => {
    configPromise = undefined; // retry discovery on the next request (Keycloak may be starting)
    throw error;
  });
  return configPromise;
}

function isLocalHttp(url: URL): boolean {
  if (url.protocol !== 'http:') return false;
  if (['localhost', '127.0.0.1'].includes(url.hostname)) return true;
  // *.localtest.me is public DNS for 127.0.0.1 (the local edge Gateway).
  return process.env.NODE_ENV !== 'production' && url.hostname.endsWith('.localtest.me');
}

export const redirectUri = () => `${serverEnv().appUrl}/auth/callback`;

/**
 * Absolute URL on this site for redirects. Built from APP_URL, never from request.url: behind the
 * Gateway (or any reverse proxy) request.url is the internal address (localhost:3000).
 */
export const appUrl = (path: string) => new URL(path, `${serverEnv().appUrl}/`);
