import 'server-only';
import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import * as client from 'openid-client';
import { LOCALE_COOKIE } from '../i18n/routing';
import { rejectCrossSite } from '../security/csrf';
import { clientIp, LIMITS, rateLimit } from '../security/rate-limit';
import { hashedKey, seal, unseal } from '../security/sealed';
import { redisKeyPrefix, serverEnv } from '../server/env';
import { redis } from '../server/redis';
import { AUTH_TXN_COOKIE, clearCookie, SESSION_COOKIE, sessionCookieOptions } from './cookies';
import { appUrl, oidcConfig, redirectUri } from './oidc';
import { safeReturnTo } from './safe-redirect';
import { createSession, destroySession } from './session';

/**
 * The three OIDC Route Handlers every web app needs, written once (ADR 0019). In an app:
 *
 *   // src/app/auth/login/route.ts
 *   export const GET = createLoginRoute({ locales: LOCALE_CODES });
 *   // src/app/auth/callback/route.ts
 *   export const GET = createCallbackRoute();
 *   // src/app/auth/logout/route.ts
 *   export const POST = createLogoutRoute();
 *
 * App differences come from env (KEYCLOAK_CLIENT_ID, KEYCLOAK_REQUIRED_ROLE, REDIS_KEY_PREFIX...).
 * Errors go to `/login?error=<code>`; the app's proxy adds the visitor's language.
 */

const TXN_TTL_S = 600; // the user has 10 minutes to finish logging in at Keycloak
const txnKey = (txnId: string) => hashedKey(`${redisKeyPrefix()}auth-txn:`, txnId);

interface AuthTransaction {
  codeVerifier: string;
  state: string;
  nonce: string;
  returnTo: string;
}

export interface LoginRouteOptions {
  /** The app's languages: the saved one is sent to Keycloak as `ui_locales`. */
  locales?: readonly string[];
  /** Where to go after sign-in when no valid `returnTo` is given (default '/'). */
  defaultReturnTo?: string;
}

/**
 * GET /auth/login?returnTo=/vi/dashboard
 * Starts Authorization Code + PKCE: stores state, nonce and the PKCE verifier server-side,
 * then redirects the browser to Keycloak's login page.
 */
export function createLoginRoute(options: LoginRouteOptions = {}) {
  return async function GET(request: NextRequest): Promise<Response> {
    const returnTo = safeReturnTo(request.nextUrl.searchParams.get('returnTo'), options.defaultReturnTo ?? '/');

    // Every call stores a login transaction in Redis: limit it per client IP (ADR 0017).
    const limit = await rateLimit(LIMITS.login, clientIp(request.headers));
    if (!limit.allowed) {
      const response = NextResponse.redirect(appUrl('/login?error=rate_limited'));
      response.headers.set('Retry-After', String(limit.retryAfterS));
      return response;
    }

    let config: client.Configuration;
    try {
      config = await oidcConfig();
    } catch {
      return NextResponse.redirect(appUrl('/login?error=unavailable'));
    }

    const codeVerifier = client.randomPKCECodeVerifier();
    const state = client.randomState();
    const nonce = client.randomNonce();
    const txnId = randomBytes(24).toString('base64url');

    // The PKCE verifier is a secret too: hashed key, encrypted value, like the session.
    const key = txnKey(txnId);
    try {
      await redis().set(key, seal({ codeVerifier, state, nonce, returnTo }, key), 'EX', TXN_TTL_S);
    } catch (error) {
      // Session store down: a friendly "try again" page (not a bare 500, not blamed on Keycloak).
      console.error('[auth] login: cannot store the login transaction in Redis:', error instanceof Error ? error.message : error);
      return NextResponse.redirect(appUrl('/login?error=session_unavailable'));
    }

    const locale = request.cookies.get(LOCALE_COOKIE)?.value;
    const authorizationUrl = client.buildAuthorizationUrl(config, {
      redirect_uri: redirectUri(),
      scope: 'openid profile email',
      code_challenge: await client.calculatePKCECodeChallenge(codeVerifier),
      code_challenge_method: 'S256',
      state,
      nonce,
      // Keycloak's login page in the site's language (ignored if the realm doesn't offer it).
      ...(locale && options.locales?.includes(locale) ? { ui_locales: locale } : {}),
    });

    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(AUTH_TXN_COOKIE, txnId, { ...sessionCookieOptions, maxAge: TXN_TTL_S });
    return response;
  };
}

/**
 * GET /auth/callback?code=…&state=…  (Keycloak redirects here after login)
 * Exchanges the code (with the PKCE verifier and the client secret, over the back channel),
 * checks state + nonce, refuses users without KEYCLOAK_REQUIRED_ROLE, stores the tokens in Redis
 * and sets the session cookie.
 */
export function createCallbackRoute() {
  return async function GET(request: NextRequest): Promise<Response> {
    const fail = (reason: string, target: URL = appUrl(`/login?error=${reason}`)) => {
      const response = NextResponse.redirect(target);
      clearCookie(response, AUTH_TXN_COOKIE);
      return response;
    };

    // The user cancelled or Keycloak refused (e.g. access_denied).
    if (request.nextUrl.searchParams.has('error')) {
      return fail('denied');
    }

    const txnId = request.cookies.get(AUTH_TXN_COOKIE)?.value;
    const key = txnId ? txnKey(txnId) : undefined;
    let raw: string | null = null;
    try {
      raw = key ? await redis().getdel(key) : null; // single use
    } catch (error) {
      console.error('[auth] callback: cannot read the login transaction from Redis:', error instanceof Error ? error.message : error);
      return fail('session_unavailable');
    }
    const txn = raw && key ? unseal<AuthTransaction>(raw, key) : null;
    if (!txn) {
      return fail('expired');
    }

    let tokens: Awaited<ReturnType<typeof client.authorizationCodeGrant>>;
    let sessionId: string | null;
    try {
      // Rebuild the URL from APP_URL so it matches the registered redirect_uri exactly.
      const currentUrl = new URL(`${serverEnv().appUrl}/auth/callback${request.nextUrl.search}`);
      tokens = await client.authorizationCodeGrant(await oidcConfig(), currentUrl, {
        pkceCodeVerifier: txn.codeVerifier,
        expectedState: txn.state,
        expectedNonce: txn.nonce,
        idTokenExpected: true,
      });
      sessionId = await createSession(tokens);
    } catch (error) {
      console.error('[auth] code exchange failed:', error instanceof Error ? error.message : error);
      return fail('failed');
    }

    if (!sessionId) {
      // Signed in at Keycloak but not allowed here. End the Keycloak session too, so the user can
      // sign in with another account instead of bouncing straight back to this error.
      console.warn('[auth] sign-in refused: the user lacks KEYCLOAK_REQUIRED_ROLE');
      let target = appUrl('/login?error=forbidden');
      try {
        target = client.buildEndSessionUrl(await oidcConfig(), {
          post_logout_redirect_uri: target.href,
          ...(tokens.id_token ? { id_token_hint: tokens.id_token } : { client_id: serverEnv().keycloakClientId }),
        });
      } catch {
        // Keycloak unreachable: the error page is enough.
      }
      return fail('forbidden', target);
    }

    const response = NextResponse.redirect(appUrl(txn.returnTo));
    clearCookie(response, AUTH_TXN_COOKIE);
    response.cookies.set(SESSION_COOKIE, sessionId, sessionCookieOptions);
    return response;
  };
}

/**
 * POST /auth/logout  (a form button; POST so a link or an <img> on another site can't log you out,
 *                    and only from our own origin: see security/csrf.ts)
 * Deletes the server-side session, then ends the Keycloak SSO session too. Without the second
 * step, "Sign in" would log the user straight back in without asking for a password.
 */
export function createLogoutRoute() {
  return async function POST(request: NextRequest): Promise<Response> {
    const blocked = rejectCrossSite(request);
    if (blocked) return blocked;

    const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
    const idToken = sessionId ? await destroySession(sessionId).catch(() => undefined) : undefined;
    const home = `${serverEnv().appUrl}/`;

    let target: URL;
    try {
      target = client.buildEndSessionUrl(await oidcConfig(), {
        post_logout_redirect_uri: home,
        ...(idToken ? { id_token_hint: idToken } : { client_id: serverEnv().keycloakClientId }),
      });
    } catch {
      target = new URL(home); // Keycloak unreachable: at least the local session is gone
    }

    // 303: the browser follows with a GET, as a redirect after a POST should.
    const response = NextResponse.redirect(target, 303);
    clearCookie(response, SESSION_COOKIE);
    return response;
  };
}
