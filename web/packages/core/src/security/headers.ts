/**
 * Security headers for every page and route response, set at RUNTIME by src/proxy.ts (the origins
 * come from env, and the production image is built once for every environment: next.config's
 * headers() would freeze them at build time). Static headers that never change stay in
 * next.config.ts (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy).
 *
 * CSP without nonces (ADR 0016): nonces force every page to render dynamically and are
 * incompatible with Cache Components / partial prerendering, which this site uses for its static
 * pages. So scripts and styles allow 'unsafe-inline' (Next's inline bootstrap and RSC payload
 * scripts), and everything else is locked down: no foreign script or style hosts, no plugins, no
 * <base> hijack, no framing, forms only to us and Keycloak, network calls only to us and object
 * storage (data exfiltration). Hash-based SRI (experimental in Next) can later remove
 * 'unsafe-inline' for scripts.
 *
 * No 'server-only': the proxy imports it.
 */

export interface SecurityHeaderOptions {
  /** APP_URL: this site. */
  appUrl: string;
  /**
   * KEYCLOAK_ISSUER: logout is a form POST that redirects there (form-action applies to redirects).
   * Omitted by a site without sign-in (e.g. nails-web): forms then post only to the site itself.
   */
  keycloakIssuer?: string;
  /** STORAGE_ORIGINS: object storage / CDN origins (presigned PUT uploads, images, inline files). */
  storageOrigins: string[];
  /**
   * Third-party pages this site embeds in an <iframe> (e.g. a Google Maps embed), listed by the app
   * one by one (ADR 0016: explicit origins, never a wildcard). Omitted: no iframe may load.
   */
  frameOrigins?: string[];
  /**
   * Third-party image hosts, one by one (e.g. https://i.ytimg.com for YouTube thumbnails,
   * ADR 0040). Omitted: images only from this site and object storage.
   */
  imageOrigins?: string[];
  /** `next dev`: React needs eval for debugging, HMR needs a websocket. */
  dev: boolean;
}

const origin = (url: string) => new URL(url).origin;

export function contentSecurityPolicy(options: SecurityHeaderOptions): string {
  const app = new URL(options.appUrl);
  const storage = options.storageOrigins.map(origin);
  const https = app.protocol === 'https:';
  const hmr = options.dev ? [`${https ? 'wss' : 'ws'}://${app.host}`] : [];

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(options.dev ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', ...storage, ...(options.imageOrigins ?? []).map(origin)],
    'media-src': ["'self'", ...storage],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", ...storage, ...hmr],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'", ...(options.keycloakIssuer ? [origin(options.keycloakIssuer)] : [])],
    'frame-ancestors': ["'none'"],
    // Without it, default-src 'self' applies: no foreign iframe.
    ...(options.frameOrigins?.length ? { 'frame-src': ["'self'", ...options.frameOrigins.map(origin)] } : {}),
  };
  const policy = Object.entries(directives).map(([name, values]) => `${name} ${[...new Set(values)].join(' ')}`);
  if (https) policy.push('upgrade-insecure-requests'); // never on plain-HTTP dev: it would break same-origin requests
  return policy.join('; ');
}

export function securityHeaders(options: SecurityHeaderOptions): Record<string, string> {
  return {
    'Content-Security-Policy': contentSecurityPolicy(options),
    // A page we open (or that opens us) can't keep a handle on our window.
    'Cross-Origin-Opener-Policy': 'same-origin',
    'X-DNS-Prefetch-Control': 'off',
    'Origin-Agent-Cluster': '?1',
  };
}

let cached: Record<string, string> | undefined;

/** From env, computed once per process. Throws if APP_URL / KEYCLOAK_ISSUER are missing. */
export function securityHeadersFromEnv(): Record<string, string> {
  if (cached) return cached;
  const required = (name: string) => {
    const value = process.env[name];
    if (!value) throw new Error(`Missing environment variable ${name} (see .env.example)`);
    return value;
  };
  cached = securityHeaders({
    appUrl: required('APP_URL'),
    keycloakIssuer: required('KEYCLOAK_ISSUER'),
    storageOrigins: (process.env.STORAGE_ORIGINS ?? '').split(/[\s,]+/).filter(Boolean),
    dev: process.env.NODE_ENV === 'development',
  });
  return cached;
}
