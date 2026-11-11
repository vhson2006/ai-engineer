import { winery } from '@/content/winery';
import { cachedCard, OG_CONTENT_TYPE, OG_SIZE, ogCard, ogResponse } from '@/features/articles/og-card';
import { loadMessages } from '@/i18n/dictionaries';
import { isLocale, type Locale } from '@/i18n/locales';

/** The site's link preview image, one per language (pages without their own image use it). */
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = winery.fullName;

const rendered = new Map<string, Promise<ArrayBuffer>>();

export default async function OpenGraphImage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : 'vi';
  return ogResponse(
    cachedCard(rendered, locale, async () => {
      const t = await loadMessages(locale);
      return ogCard({ kicker: t.hero.eyebrow, title: t.hero.titleAccent, footer: t.legal.drive });
    }),
  );
}
