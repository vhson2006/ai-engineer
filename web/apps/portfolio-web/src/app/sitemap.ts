import type { MetadataRoute } from 'next';
import { localizedSitemap } from '@web/core/i18n/seo';
import { LOCALE_CODES } from '@/i18n/locales';
import { BUILT_AT, PUBLIC_PAGES, SITE_URL } from '@/site';

/**
 * /sitemap.xml: every public page in every language, with its hreflang alternates (ADR 0021).
 * Private pages (sign-in, dashboard) are never listed. Built once per build (static).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return localizedSitemap(SITE_URL, LOCALE_CODES, PUBLIC_PAGES, BUILT_AT);
}
