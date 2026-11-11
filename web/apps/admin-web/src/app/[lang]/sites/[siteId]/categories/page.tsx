import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getSessionUser } from '@web/core/auth/session';
import { format } from '@web/core/i18n/format';
import { Card, Container } from '@web/ui';
import { Skeleton } from '@web/ui/skeleton';
import { ApiFailure } from '@/components/api-failure';
import { displayTranslation } from '@/features/articles/articles-table';
import { CategoryDialog, DeleteCategoryButton } from '@/features/categories/category-dialog';
import { siteCategories, siteOr404 } from '@/features/sites/data';
import { href, type Locale } from '@/i18n/locales';
import { getLocale, getMessages, type Messages } from '@/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).categories.title };
}

export default async function CategoriesPage({ params }: PageProps<'/[lang]/sites/[siteId]/categories'>) {
  // params (and the session) only inside <Suspense>: the static shell prerenders without them.
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <Container className="py-10 sm:py-14">
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Categories t={t} locale={locale} params={params} />
      </Suspense>
    </Container>
  );
}

async function Categories({ t, locale, params }: { t: Messages; locale: Locale; params: PageProps<'/[lang]/sites/[siteId]/categories'>['params'] }) {
  const { siteId } = await params;
  const self = href(locale, `/sites/${siteId}/categories`);
  const user = await getSessionUser().catch(() => null);
  if (!user) redirect(`${href(locale, '/login')}?returnTo=${encodeURIComponent(self)}`);

  const site = await siteOr404(siteId);
  if (!site.ok) return <ApiFailure t={t} failure={site} />;
  const categories = await siteCategories(siteId);
  const c = t.categories;
  const labels = { t: c, common: t.common, validation: t.validation };
  const { locales } = site.data;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">{site.data.name}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{c.title}</h1>
          <p className="mt-2 max-w-2xl text-muted">{format(c.subtitle, { site: site.data.name })}</p>
        </div>
        <CategoryDialog siteId={siteId} locales={locales} labels={labels} />
      </header>

      {!categories.ok ? (
        <ApiFailure t={t} failure={categories} />
      ) : (
        <Card padding="p-0" className="overflow-hidden">
          {categories.data.length === 0 ? (
            <p className="p-6 text-sm text-muted">{c.empty}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">{format(c.caption, { site: site.data.name })}</caption>
                <thead className="border-b border-border text-xs uppercase tracking-wide text-subtle">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {c.columns.names}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {c.columns.key}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {c.columns.position}
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      <span className="sr-only">{c.columns.actions}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {categories.data.map((category) => {
                    const name = displayTranslation(category.translations, [locale, site.data.defaultLocale])?.name ?? category.key;
                    return (
                      <tr key={category.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium">{name}</p>
                          <p className="mt-0.5 text-xs text-subtle">
                            {category.translations.map((tr) => `${tr.locale}: /${tr.slug}`).join(' · ')}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-mono text-muted">{category.key}</td>
                        <td className="px-4 py-3 tabular-nums text-muted">{category.position}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <CategoryDialog siteId={siteId} locales={locales} category={category} labels={labels} />
                            <DeleteCategoryButton siteId={siteId} category={category} name={name} labels={labels} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
