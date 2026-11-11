import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import type { Site } from '../../../src/generated/prisma/client';
import { assertAllLocales, assertSiteLocales } from '../../../src/common/translations';

describe('[translations] (unit)', () => {
  const site = { id: 'nails', locales: ['en', 'vi'] } as Site;

  it('accepts the site languages once each', () => {
    expect(() => assertSiteLocales([{ locale: 'en' }], site)).not.toThrow();
    expect(() => assertSiteLocales([{ locale: 'en' }, { locale: 'en' }], site)).toThrow(
      /more than once/,
    );
    expect(() => assertSiteLocales([{ locale: 'fr' }], site)).toThrow(UnprocessableEntityException);
    expect(() => assertSiteLocales([{ locale: 'en' }, { locale: 'en' }], site)).toThrow(
      BadRequestException,
    );
  });

  it('requires every language to publish (422 missing_translations)', () => {
    expect(() => assertAllLocales([{ locale: 'en' }, { locale: 'vi' }], site)).not.toThrow();
    expect(() => assertAllLocales([{ locale: 'en' }], site)).toThrow(/missing vi/);
  });
});
