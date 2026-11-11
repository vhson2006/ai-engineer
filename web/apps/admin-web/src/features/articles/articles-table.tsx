import Link from 'next/link';
import type { Article, Category, Site } from '@web/core/api';
import { format } from '@web/core/i18n/format';
import { Badge } from '@web/ui';
import { LocalDate } from '@/components/local-date';
import type { Messages } from '@/i18n/messages';
import { ArticleStatusBadge } from './status-badge';

type T = Messages['articles'];

/** The translation in the first preferred language present, else any. */
export function displayTranslation<X extends { locale: string }>(translations: X[], preferred: string[]): X | undefined {
  for (const locale of preferred) {
    const found = translations.find((t) => t.locale === locale);
    if (found) return found;
  }
  return translations[0];
}

export function ArticlesTable({
  articles,
  site,
  categories,
  t,
  uiLocale,
  intlLocale,
  editHref,
  empty,
}: {
  articles: Article[];
  site: Site;
  categories: Category[];
  t: T;
  uiLocale: string;
  intlLocale: string;
  editHref: (id: string) => string;
  empty: string;
}) {
  if (articles.length === 0) return <p className="p-6 text-sm text-muted">{empty}</p>;
  const preferred = [uiLocale, site.defaultLocale];
  const categoryName = (id: string) => {
    const category = categories.find((c) => c.id === id);
    return category ? (displayTranslation(category.translations, preferred)?.name ?? category.key) : '–';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{format(t.caption, { site: site.name })}</caption>
        <thead className="border-b border-border text-xs uppercase tracking-wide text-subtle">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              {t.columns.title}
            </th>
            <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
              {t.columns.category}
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              {t.columns.status}
            </th>
            <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">
              {t.columns.languages}
            </th>
            <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">
              {t.columns.date}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {articles.map((article) => {
            const main = displayTranslation(article.translations, preferred);
            const [whenIso, whenTemplate] =
              article.status === 'scheduled' && article.scheduledAt
                ? [article.scheduledAt, t.scheduledFor]
                : article.status === 'published' && article.publishedAt
                  ? [article.publishedAt, t.publishedOn]
                  : [article.updatedAt, t.updatedOn];
            return (
              <tr key={article.id} className="hover:bg-surface-2/60">
                <td className="max-w-md px-4 py-3">
                  <Link href={editHref(article.id)} className="font-medium hover:text-brand hover:underline">
                    {main?.title || t.untitled}
                  </Link>
                  {article.featured && (
                    <span aria-hidden className="ml-2 align-middle text-xs text-brand">
                      ★
                    </span>
                  )}
                  {main && <p className="mt-0.5 truncate text-xs text-subtle">/{main.slug}</p>}
                </td>
                <td className="hidden px-4 py-3 text-muted md:table-cell">{categoryName(article.categoryId)}</td>
                <td className="px-4 py-3">
                  <ArticleStatusBadge status={article.status} label={t.status[article.status]} />
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <ul className="flex gap-1">
                    {site.locales.map((locale) => {
                      const has = article.translations.some((tr) => tr.locale === locale);
                      return (
                        <li key={locale}>
                          <Badge tone={has ? 'brand' : 'neutral'} className={has ? undefined : 'line-through opacity-60'}>
                            {locale}
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3 text-muted lg:table-cell">
                  <LocalDate iso={whenIso} intlLocale={intlLocale} template={whenTemplate} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
