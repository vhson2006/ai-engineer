import { describe, expect, it } from 'vitest';
import { fullAddress, type Business } from './business';
import { defineWebsite } from './website';

const business: Business = {
  siteId: 'demo',
  name: 'Demo',
  fullName: 'Demo Shop',
  sample: true,
  phone: { display: '0900 000 000', href: 'tel:+84900000000' },
  address: { street: '1 Lê Lợi', ward: 'Phường Sài Gòn', city: 'TP.HCM', region: 'Thành phố Hồ Chí Minh' },
  mapQuery: 'Demo',
  hours: [],
  schema: { type: 'Store' },
  cookieName: 'demo_locale',
};

describe('defineWebsite', () => {
  it('has the sample sites’ defaults: Vietnamese first, /bai-viet, three legal pages', () => {
    const site = defineWebsite(business);
    expect(site.locales).toEqual(['vi', 'en']);
    expect(site.defaultLocale).toBe('vi');
    expect(site.paths.article('pho')).toBe('/bai-viet/pho');
    expect(site.paths.topic('mon-an')).toBe('/bai-viet/chu-de/mon-an');
    expect(site.legalPages).toEqual(['privacy', 'terms', 'dataDeletion']);
    expect(site.routing).toMatchObject({ locales: ['vi', 'en'], defaultLocale: 'vi', detectLanguage: false, cookieName: 'demo_locale' });
    expect(site.publicPages.map((page) => page.path)).toEqual(['/', '/bai-viet', '/chinh-sach-bao-mat', '/dieu-khoan-su-dung', '/xoa-du-lieu']);
  });

  it('takes a site’s own languages, URLs, legal pages and formats', () => {
    const site = defineWebsite(business, {
      locales: ['en', 'vi'],
      intl: { en: 'en-US' },
      timeZone: 'America/New_York',
      paths: { articles: '/blog', topics: '/blog/topic', legal: { privacy: '/privacy-policy' } },
      legalUpdated: { privacy: '2023-05-19' },
    });
    expect(site.defaultLocale).toBe('en');
    expect(site.localeOptions.map((option) => option.code)).toEqual(['en', 'vi']);
    expect(site.paths.topic('care')).toBe('/blog/topic/care');
    expect(site.legalPages).toEqual(['privacy']);
    expect(() => site.legalPath('terms')).toThrow();
    expect(site.legalUpdated('privacy')).toBe('2023-05-19');
    expect(site.hours('en', { open: '09:30', close: '19:00' })).toBe('09:30 AM – 07:00 PM');
    // Late on Nov 12 in New York is already Nov 13 in UTC: the business's date wins.
    expect(site.instantDate('en', '2026-11-13T03:00:00.000Z')).toBe('November 12, 2026');
  });
});

describe('fullAddress', () => {
  it('writes a Vietnamese address street, ward, city', () => {
    expect(fullAddress(business)).toBe('1 Lê Lợi, Phường Sài Gòn, TP.HCM');
  });

  it('writes a US address with its state and ZIP code', () => {
    const us = { ...business, address: { street: '2241 Treelight Way', city: 'Wendell', region: 'NC', postalCode: '27591', country: 'US' } };
    expect(fullAddress(us)).toBe('2241 Treelight Way, Wendell, NC 27591');
  });
});
