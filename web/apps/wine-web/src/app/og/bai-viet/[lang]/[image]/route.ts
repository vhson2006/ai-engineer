import { getArticle, listArticles } from '@/features/articles/data';
import { cachedCard, ogCard, ogResponse } from '@/features/articles/og-card';
import { loadMessages } from '@/i18n/dictionaries';
import { isLocale, LOCALE_CODES } from '@/i18n/locales';

/**
 * An article's link preview when it has no cover of its own: its topic and title on the brand
 * card, /og/bai-viet/<lang>/<slug>.png (src/seo.ts articlePreview). Prerendered for the articles
 * published at build time; a newer one is drawn on its first request.
 */
export async function generateStaticParams() {
  const lists = await Promise.all(
    LOCALE_CODES.map(async (lang) =>
      (await listArticles(lang).catch(() => [])).map((article) => ({ lang, image: `${article.slug}.png` })),
    ),
  );
  const params = lists.flat();
  return params.length ? params : [{ lang: LOCALE_CODES[0], image: 'none.png' }];
}

const rendered = new Map<string, Promise<ArrayBuffer>>();

export async function GET(_request: Request, { params }: RouteContext<'/og/bai-viet/[lang]/[image]'>) {
  const { lang, image } = await params;
  const slug = image.replace(/\.png$/, '');
  if (!image.endsWith('.png') || !isLocale(lang)) return new Response(null, { status: 404 });
  const article = await getArticle(lang, slug);
  if (!article) return new Response(null, { status: 404 });
  return ogResponse(
    cachedCard(rendered, `${lang}/${article.id}/${article.title}`, async () => {
      const t = await loadMessages(lang);
      return ogCard({ kicker: article.topic.name, title: article.title, footer: t.legal.drive });
    }),
  );
}
