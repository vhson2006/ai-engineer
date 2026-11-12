import { notFound, redirect } from 'next/navigation';
import { isUuid } from '@web/core/actions/result';
import { getArticle, listMedia, listTranslationJobs } from '@web/core/api';
import { getSessionUser } from '@web/core/auth/session';
import { ApiFailure } from '@/components/api-failure';
import { siteCategories, siteOr404 } from '@/features/sites/data';
import { href, LOCALES, type Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';
import { ArticleEditor } from './article-editor';
import { displayTranslation } from './articles-table';

/**
 * The new / edit article screen (server part): session, site (404 if not the user's), topics,
 * and for an edit the article fresh from the API (reload before editing: ADR 0029).
 */
export async function ArticleEditorPage({
  t,
  locale,
  params,
}: {
  t: Messages;
  locale: Locale;
  /** The route params (awaited here, inside the page's <Suspense>); no `id` = a new article. */
  params: Promise<{ siteId: string; id?: string }>;
}) {
  const { siteId, id: articleId } = await params;
  const list = href(locale, `/sites/${siteId}/articles`);
  const self = articleId ? `${list}/${articleId}` : `${list}/new`;
  const user = await getSessionUser().catch(() => null);
  if (!user) redirect(`${href(locale, '/login')}?returnTo=${encodeURIComponent(self)}`);

  const site = await siteOr404(siteId);
  if (!site.ok) return <ApiFailure t={t} failure={site} />;
  if (articleId !== undefined && !isUuid(articleId)) notFound();

  const [categories, article, media, jobs] = await Promise.all([
    siteCategories(siteId),
    articleId ? getArticle(siteId, articleId) : null,
    // The library's newest images for the picker; without them the editor still works (upload).
    listMedia(siteId, { limit: 60 }),
    // Machine translations (ADR 0036): status and what to review, per language.
    articleId ? listTranslationJobs(siteId, articleId) : null,
  ]);
  if (article && !article.ok) {
    if (article.status === 404) notFound();
    return <ApiFailure t={t} failure={article} />;
  }
  if (!categories.ok) return <ApiFailure t={t} failure={categories} />;

  const preferred = [locale, site.data.defaultLocale];
  const current = article?.data;
  const heading = current ? (displayTranslation(current.translations, preferred)?.title ?? t.articles.form.titleEdit) : t.articles.form.titleNew;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-brand">{site.data.name}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-balance">{heading}</h1>
      </header>
      <ArticleEditor
        // A fresh editor per article (and after another admin's change: the key changes).
        key={current ? `${current.id}:${current.updatedAt}` : 'new'}
        site={{ id: site.data.id, name: site.data.name, locales: site.data.locales, defaultLocale: site.data.defaultLocale }}
        categories={categories.data.map((c) => ({ id: c.id, name: displayTranslation(c.translations, preferred)?.name ?? c.key }))}
        article={current}
        t={t.articles}
        common={t.common}
        media={media.ok ? media.data.data : []}
        mediaLabels={t.media}
        translationJobs={jobs?.ok ? jobs.data : []}
        validation={t.validation}
        listHref={list}
        categoriesHref={href(locale, `/sites/${siteId}/categories`)}
        editHrefTemplate={`${list}/{id}`}
        intlLocale={LOCALES[locale].intl}
      />
    </div>
  );
}
