import type { Metadata } from 'next';
import Link from 'next/link';
import { isUuid } from '@web/core/actions/result';
import { listArticles } from '@web/core/api';
import { format } from '@web/core/i18n/format';
import { buttonClass, Card } from '@web/ui';
import { Pagination } from '@web/ui/pagination';
import { Skeleton } from '@web/ui/skeleton';
import { PlusIcon, SparklesIcon } from 'lucide-react';
import { ApiFailure } from '@/components/api-failure';
import { PageHeader, PageShell } from '@/components/page';
import { ArticlesTable } from '@/features/articles/articles-table';
import { ArticlesToolbar } from '@/features/articles/articles-toolbar';
import { loadArticlesParams } from '@/features/articles/search-params';
import { requireUser } from '@/features/auth/require-user';
import { categoryOptions } from '@/features/categories/display';
import { siteCategories, siteOr404 } from '@/features/sites/data';
import { href, LOCALES, type Locale } from '@/i18n/locales';
import { getLocale, getMessages, type Messages } from '@/i18n/messages';

type Props = PageProps<'/[lang]/sites/[siteId]/articles'>;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).articles.title };
}

/** The articles of one site (ADR 0030): the API answers only for a site the user belongs to. */
export default async function ArticlesPage({ params, searchParams }: Props) {
  // params (and the session) only inside <Suspense>: the static shell prerenders without them.
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <PageShell fallback={<ListSkeleton />}>
      <Articles t={t} locale={locale} params={params} searchParams={searchParams} />
    </PageShell>
  );
}

async function Articles({
  t,
  locale,
  params,
  searchParams,
}: {
  t: Messages;
  locale: Locale;
  params: Props['params'];
  searchParams: Props['searchParams'];
}) {
  const { siteId } = await params;
  const self = href(locale, `/sites/${siteId}/articles`);
  await requireUser(locale, self);

  const site = await siteOr404(siteId);
  const a = t.articles;
  if (!site.ok) return <ApiFailure t={t} failure={site} />;

  const query = await loadArticlesParams(searchParams);
  const search = query.search.trim().slice(0, 100);
  const categoryId = isUuid(query.category) ? query.category : undefined;
  const [result, categories] = await Promise.all([
    listArticles(siteId, { page: Math.max(1, query.page), status: query.status ?? undefined, categoryId, search: search || undefined }),
    siteCategories(siteId),
  ]);
  const categoryList = categories.ok ? categories.data : [];
  const filtered = Boolean(search || query.status || categoryId);
  const pageHref = (target: number) =>
    `${self}?${new URLSearchParams({
      ...(query.status && { status: query.status }),
      ...(categoryId && { category: categoryId }),
      ...(search && { search }),
      ...(target > 1 && { page: String(target) }),
    })}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={site.data.name}
        title={a.title}
        subtitle={format(a.subtitle, { site: site.data.name })}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`${self}/ai/new`} className={buttonClass.secondary}>
              <SparklesIcon aria-hidden className="size-4" />
              {a.writeWithAi}
            </Link>
            <Link href={`${self}/new`} className={buttonClass.primary}>
              <PlusIcon aria-hidden className="size-4" />
              {a.new}
            </Link>
          </div>
        }
      />

      <Card padding="p-0" className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <ArticlesToolbar
            categories={categoryOptions(categoryList, [locale, site.data.defaultLocale])}
            labels={{ ...a.filters, search: a.search.label, placeholder: a.search.placeholder, statuses: a.status }}
          />
          {result.ok && (
            <p className="shrink-0 text-sm text-muted tabular-nums">
              {format(a.total, { count: new Intl.NumberFormat(LOCALES[locale].intl).format(result.data.meta.total) })}
            </p>
          )}
        </div>

        {result.ok ? (
          <>
            <ArticlesTable
              articles={result.data.data}
              site={site.data}
              categories={categoryList}
              t={a}
              uiLocale={locale}
              intlLocale={LOCALES[locale].intl}
              editHref={(id) => `${self}/${id}`}
              empty={filtered ? a.emptyFiltered : a.empty}
            />
            {result.data.meta.totalPages > 1 && (
              <Pagination
                className="border-t border-border p-4"
                page={result.data.meta.page}
                totalPages={result.data.meta.totalPages}
                href={pageHref}
                labels={{
                  nav: a.pagination.nav,
                  previous: a.pagination.previous,
                  next: a.pagination.next,
                  status: format(a.pagination.status, { page: result.data.meta.page, total: result.data.meta.totalPages }),
                }}
              />
            )}
          </>
        ) : (
          <ApiFailure t={t} failure={result} bare />
        )}
      </Card>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 w-80" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
