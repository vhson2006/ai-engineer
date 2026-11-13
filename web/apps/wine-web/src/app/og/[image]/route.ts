import { cachedCard, ogCard, ogResponse } from '@/features/articles/og-card';
import { loadMessages } from '@/i18n/dictionaries';
import { isLocale, LOCALE_CODES } from '@/i18n/locales';

/**
 * The site's link preview card, one per language: /og/vi.png, /og/en.png (outside [lang], and
 * skipped by the proxy for its extension). Every page's metadata points to it (src/seo.ts) unless
 * an article has its own image. Prerendered at build.
 */
export function generateStaticParams() {
  return LOCALE_CODES.map((locale) => ({ image: `${locale}.png` }));
}

const rendered = new Map<string, Promise<ArrayBuffer>>();

export async function GET(_request: Request, { params }: RouteContext<'/og/[image]'>) {
  const { image } = await params;
  const locale = image.replace(/\.png$/, '');
  if (!image.endsWith('.png') || !isLocale(locale)) return new Response(null, { status: 404 });
  return ogResponse(
    cachedCard(rendered, locale, async () => {
      const t = await loadMessages(locale);
      return ogCard({ kicker: t.hero.eyebrow, title: t.hero.titleAccent, footer: t.legal.drive });
    }),
  );
}
