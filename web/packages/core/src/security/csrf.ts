/**
 * CSRF protection for everything that changes state (POST, PUT, PATCH, DELETE).
 *
 * The session cookie is SameSite=Lax, so other *sites* can't send it with a POST. That isn't
 * enough on its own: subdomains of the same domain (spa.example.com, shop.example.com) are the
 * same "site", and old browsers/webviews ignore SameSite. So every state-changing request must
 * also come from our own origin (APP_URL), which a browser proves with the Origin header (or
 * Sec-Fetch-Site), and which a page on another origin cannot forge.
 *
 * Used by src/proxy.ts for every request, and called again inside each state-changing Route
 * Handler (a matcher change must never silently remove the check). Server Actions additionally
 * get Next.js' built-in Origin/Host check.
 *
 * No 'server-only' import: the proxy loads this file.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function isStateChanging(method: string): boolean {
  return !SAFE_METHODS.has(method.toUpperCase());
}

function appOrigin(): string {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error('Missing environment variable APP_URL (see .env.example)');
  return new URL(appUrl).origin;
}

/**
 * True when a state-changing request provably comes from a page of this app.
 * - Origin present: must equal APP_URL's origin exactly ("null" and other origins are refused).
 * - Origin absent: Sec-Fetch-Site must be "same-origin".
 * - Neither header: refused. Every current browser sends at least one on a POST, so this only
 *   turns away non-browser clients, which have no business posting forms here.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (origin) return origin === appOrigin();
  return request.headers.get('sec-fetch-site') === 'same-origin';
}

/** null when the request may proceed, otherwise the 403 response to return. */
export function rejectCrossSite(request: Request): Response | null {
  if (!isStateChanging(request.method) || isSameOrigin(request)) return null;
  return new Response('Cross-site request blocked', {
    status: 403,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
