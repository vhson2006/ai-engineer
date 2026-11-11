import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy, securityHeaders } from './headers';

const prod = {
  appUrl: 'https://www.example.com',
  keycloakIssuer: 'https://auth.example.com/realms/nest-microservice',
  storageOrigins: ['https://example-private-files.sgp1.digitaloceanspaces.com', 'https://cdn.example.com/'],
  dev: false,
};
const dev = {
  appUrl: 'http://www.localtest.me:8000',
  keycloakIssuer: 'http://auth.localtest.me:8000/realms/nest-microservice',
  storageOrigins: ['http://localhost:8333'],
  dev: true,
};

const directive = (csp: string, name: string) => csp.split('; ').find((d) => d.startsWith(`${name} `) || d === name);

describe('content security policy', () => {
  it('production: locked down, no eval, HTTPS upgrade, storage + Keycloak only where needed', () => {
    const csp = contentSecurityPolicy(prod);
    expect(directive(csp, 'default-src')).toBe("default-src 'self'");
    expect(directive(csp, 'script-src')).toBe("script-src 'self' 'unsafe-inline'");
    expect(directive(csp, 'object-src')).toBe("object-src 'none'");
    expect(directive(csp, 'base-uri')).toBe("base-uri 'self'");
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'");
    // logout POST → 303 to Keycloak: form-action applies to the redirect
    expect(directive(csp, 'form-action')).toBe("form-action 'self' https://auth.example.com");
    // presigned PUT uploads + images/inline files from storage and the CDN (origins only, no path)
    expect(directive(csp, 'connect-src')).toBe(
      "connect-src 'self' https://example-private-files.sgp1.digitaloceanspaces.com https://cdn.example.com",
    );
    expect(directive(csp, 'img-src')).toContain('https://cdn.example.com');
    expect(directive(csp, 'upgrade-insecure-requests')).toBe('upgrade-insecure-requests');
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toContain('ws:');
  });

  it('frames: none by default, only the listed origins otherwise (no path, no wildcard)', () => {
    expect(directive(contentSecurityPolicy(prod), 'frame-src')).toBeUndefined();
    const csp = contentSecurityPolicy({ ...prod, frameOrigins: ['https://www.google.com/maps'] });
    expect(directive(csp, 'frame-src')).toBe("frame-src 'self' https://www.google.com");
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'");
  });

  it('a site without sign-in: forms post only to itself', () => {
    const csp = contentSecurityPolicy({ ...prod, keycloakIssuer: undefined });
    expect(directive(csp, 'form-action')).toBe("form-action 'self'");
  });

  it('dev: eval for React debugging, HMR websocket, no HTTPS upgrade on plain HTTP', () => {
    const csp = contentSecurityPolicy(dev);
    expect(directive(csp, 'script-src')).toBe("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(directive(csp, 'connect-src')).toBe("connect-src 'self' http://localhost:8333 ws://www.localtest.me:8000");
    expect(directive(csp, 'form-action')).toBe("form-action 'self' http://auth.localtest.me:8000");
    expect(directive(csp, 'upgrade-insecure-requests')).toBeUndefined();
  });

  it('never allows foreign script hosts or wildcards', () => {
    for (const options of [prod, dev]) {
      const csp = contentSecurityPolicy(options);
      expect(directive(csp, 'script-src')).not.toMatch(/https?:|\*/);
      expect(csp).not.toContain(' * ');
    }
  });

  it('extra headers', () => {
    expect(securityHeaders(prod)).toMatchObject({
      'Cross-Origin-Opener-Policy': 'same-origin',
      'X-DNS-Prefetch-Control': 'off',
      'Origin-Agent-Cluster': '?1',
    });
  });
});
