import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import type { Site } from '../generated/prisma/client';

/**
 * Languages of a set of translations (article or category) against the site's languages:
 *   the same language twice   → 400 (the request itself is malformed)
 *   a language the site lacks → 422 unsupported_locale (valid input, but this site's data refuses it)
 */
export function assertSiteLocales(translations: { locale: string }[], site: Site): void {
  const seen = new Set<string>();
  for (const { locale } of translations) {
    if (seen.has(locale)) {
      throw new BadRequestException(`translations has language ${locale} more than once`);
    }
    if (!site.locales.includes(locale)) {
      throw new UnprocessableEntityException({
        message: `${locale} is not a language of site ${site.id} (${site.locales.join(', ')})`,
        code: 'unsupported_locale',
      });
    }
    seen.add(locale);
  }
}

/** Publishing (or changing a live article) needs a translation in EVERY language of the site. */
export function assertAllLocales(translations: { locale: string }[], site: Site): void {
  const present = new Set(translations.map((t) => t.locale));
  const missing = site.locales.filter((locale) => !present.has(locale));
  if (missing.length) {
    throw new UnprocessableEntityException({
      message: `Every language of the site is needed: missing ${missing.join(', ')}`,
      code: 'missing_translations',
    });
  }
}
