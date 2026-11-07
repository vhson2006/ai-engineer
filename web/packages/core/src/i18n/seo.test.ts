import { describe, expect, it } from 'vitest';
import { languageAlternates, localizedAlternates, localizedSitemap } from './seo';

const LOCALES = ['en', 'vi'] as const;

describe('alternates', () => {
  it('lists every language plus x-default (the path without a locale)', () => {
    expect(languageAlternates(LOCALES, '/about')).toEqual({ en: '/en/about', vi: '/vi/about', 'x-default': '/about' });
    expect(languageAlternates(LOCALES, '/')).toEqual({ en: '/en', vi: '/vi', 'x-default': '/' });
  });

  it('uses the page language as canonical', () => {
    expect(localizedAlternates(LOCALES, 'vi', '/about').canonical).toBe('/vi/about');
  });
});

describe('localizedSitemap', () => {
  const date = new Date('2026-11-07T00:00:00Z');
  const entries = localizedSitemap('https://www.example.com', LOCALES, [{ path: '/', priority: 1 }, { path: '/about' }], date);

  it('has one absolute entry per page and language', () => {
    expect(entries.map((e) => e.url)).toEqual([
      'https://www.example.com/en',
      'https://www.example.com/vi',
      'https://www.example.com/en/about',
      'https://www.example.com/vi/about',
    ]);
    expect(entries[0]).toMatchObject({ priority: 1, changeFrequency: 'monthly', lastModified: date });
    expect(entries[2].priority).toBe(0.5);
  });

  it('declares the hreflang alternates with absolute URLs', () => {
    expect(entries[3].alternates.languages).toEqual({
      en: 'https://www.example.com/en/about',
      vi: 'https://www.example.com/vi/about',
      'x-default': 'https://www.example.com/about',
    });
  });
});
