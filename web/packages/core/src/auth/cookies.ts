import type { NextResponse } from 'next/server';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * In production the cookies use the __Host- prefix. Browsers then only accept them when they are
 * Secure, have Path=/ and NO Domain attribute, so a sibling subdomain (or an attacker controlling
 * one) can neither set nor overwrite them ("cookie tossing"). In dev (http://localhost) the prefix
 * would require Secure, so the plain name is used.
 */
const name = (base: string) => (isProduction ? `__Host-${base}` : base);

/** Session id cookie (the only thing the browser holds; tokens stay in Redis). */
export const SESSION_COOKIE = name('pw_session');

/** Short-lived cookie that ties the Keycloak redirect back to the login attempt that started it. */
export const AUTH_TXN_COOKIE = name('pw_auth_txn');

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const, // sent on top-level navigation (Keycloak redirect), not on cross-site POSTs
  secure: isProduction,
  path: '/',
};

/**
 * Deletes a cookie with the same attributes it was set with. A bare delete omits Secure, and
 * browsers ignore a Set-Cookie for a __Host- cookie without it, leaving the cookie in place.
 */
export function clearCookie(response: NextResponse, cookieName: string): void {
  response.cookies.set(cookieName, '', { ...sessionCookieOptions, maxAge: 0 });
}
