import { cachedCard, OG_CONTENT_TYPE, OG_SIZE, ogCard, ogResponse } from '@/features/articles/og-card';
import { getArticle } from '@/features/articles/data';
import { loadMessages } from '@/i18n/dictionaries';
import { isLocale, type Locale } from '@/i18n/locales';

/** Each article's link preview: its topic and title on the brand card (rendered once per process). */
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Khang Hưng Tửu';

const rendered = new Map<string, Promise<ArrayBuffer>>();

export default async function ArticleImage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  const locale: Locale = isLocale(lang) ? lang : 'vi';
  return ogResponse(
    cachedCard(rendered, `${locale}/${slug}`, async () => {
      const [t, article] = await Promise.all([loadMessages(locale), getArticle(locale, slug)]);
      return ogCard({
        kicker: article ? t.articles.categories[article.category] : t.articles.eyebrow,
        title: article?.title ?? t.articles.title,
        footer: t.legal.drive,
      });
    }),
  );
}
