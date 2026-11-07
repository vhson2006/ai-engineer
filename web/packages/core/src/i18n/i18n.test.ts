import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { format, plural } from './format';
import { negotiateLocale } from './negotiate';
import { LOCALE_COOKIE, localeOfPath, localizedPath, rememberLocale, routeLocale } from './routing';
import { NextResponse } from 'next/server';

const LOCALES = ['en', 'vi'] as const;
const ROUTING = { locales: LOCALES, defaultLocale: 'en' as const, bypass: ['/auth/', '/files/'] };

function request(path: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  return new NextRequest(new URL(path, 'http://www.example.test'), init);
}

describe('negotiateLocale', () => {
  it.each([
    [null, 'en'],
    ['', 'en'],
    ['vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7', 'vi'],
    ['en-US,en;q=0.9,vi;q=0.8', 'en'],
    ['fr-FR,fr;q=0.9,vi;q=0.5', 'vi'], // first supported one wins
    ['fr, de', 'en'], // nothing supported → default
    ['en;q=0.2, vi;q=0.8', 'vi'], // quality, not order
    ['vi;q=0, en', 'en'], // q=0 means "not acceptable"
    ['*', 'en'],
    ['VI', 'vi'], // case-insensitive
  ])('%s → %s', (header, expected) => {
    expect(negotiateLocale(header, LOCALES, 'en')).toBe(expected);
  });

  it('matches a supported region variant from a bare language', () => {
    expect(negotiateLocale('en', ['vi', 'en-GB'] as const, 'vi')).toBe('en-GB');
  });
});

describe('paths', () => {
  it('reads the locale segment only at the start', () => {
    expect(localeOfPath('/vi/about', LOCALES)).toBe('vi');
    expect(localeOfPath('/vi', LOCALES)).toBe('vi');
    expect(localeOfPath('/video', LOCALES)).toBeUndefined();
    expect(localeOfPath('/about/vi', LOCALES)).toBeUndefined();
  });

  it('prefixes a path with a locale', () => {
    expect(localizedPath('vi', '/')).toBe('/vi');
    expect(localizedPath('vi', '/about')).toBe('/vi/about');
    expect(localizedPath('vi', '/dashboard?page=2')).toBe('/vi/dashboard?page=2');
    expect(localizedPath('vi', '/?x=1')).toBe('/vi?x=1');
    expect(localizedPath('en', 'about')).toBe('/en/about');
  });
});

describe('routeLocale', () => {
  it('passes localized paths through and reports the locale', () => {
    expect(routeLocale(request('/vi/about'), ROUTING)).toEqual({ locale: 'vi' });
  });

  it('redirects a path without a locale, keeping the query (307)', () => {
    const { redirect } = routeLocale(
      request('/dashboard?page=2', { headers: { 'accept-language': 'vi-VN,vi;q=0.9' } }),
      ROUTING,
    );
    expect(redirect?.status).toBe(307);
    expect(redirect?.headers.get('location')).toBe('http://www.example.test/vi/dashboard?page=2');
  });

  it('prefers the saved choice over Accept-Language, ignores unsupported cookie values', () => {
    const saved = routeLocale(
      request('/', { headers: { cookie: `${LOCALE_COOKIE}=en`, 'accept-language': 'vi' } }),
      ROUTING,
    );
    expect(saved.redirect?.headers.get('location')).toBe('http://www.example.test/en');
    const bogus = routeLocale(
      request('/', { headers: { cookie: `${LOCALE_COOKIE}=xx`, 'accept-language': 'vi' } }),
      ROUTING,
    );
    expect(bogus.redirect?.headers.get('location')).toBe('http://www.example.test/vi');
  });

  it('leaves Route Handlers and non-GET requests alone', () => {
    expect(routeLocale(request('/auth/login'), ROUTING)).toEqual({});
    expect(routeLocale(request('/files/1/download'), ROUTING)).toEqual({});
    expect(routeLocale(request('/about', { method: 'POST' }), ROUTING)).toEqual({});
  });
});

describe('rememberLocale', () => {
  it('sets the cookie when the page locale differs from the saved one', () => {
    const response = NextResponse.next();
    rememberLocale(request('/vi', { headers: { cookie: `${LOCALE_COOKIE}=en` } }), response, 'vi');
    expect(response.cookies.get(LOCALE_COOKIE)?.value).toBe('vi');
  });

  it('does nothing when unchanged, or for router prefetches', () => {
    const same = NextResponse.next();
    rememberLocale(request('/vi', { headers: { cookie: `${LOCALE_COOKIE}=vi` } }), same, 'vi');
    expect(same.cookies.get(LOCALE_COOKIE)).toBeUndefined();
    const prefetch = NextResponse.next();
    rememberLocale(request('/vi', { headers: { 'next-router-prefetch': '1' } }), prefetch, 'vi');
    expect(prefetch.cookies.get(LOCALE_COOKIE)).toBeUndefined();
  });
});

describe('format / plural', () => {
  it('fills placeholders and leaves unknown ones', () => {
    expect(format('Hi, {name}! Page {page} of {total}', { name: 'An', page: 1, total: 3 })).toBe('Hi, An! Page 1 of 3');
    expect(format('Hi, {name}')).toBe('Hi, {name}');
  });

  it('picks the plural form of the locale', () => {
    const forms = { one: '{count} file', other: '{count} files' };
    expect(plural('en', 1, forms)).toBe('1 file');
    expect(plural('en', 2, forms)).toBe('2 files');
    expect(plural('vi', 1, { other: '{count} tệp' })).toBe('1 tệp');
  });
});
