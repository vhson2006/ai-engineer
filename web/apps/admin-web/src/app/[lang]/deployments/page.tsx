import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { listDeployments } from '@web/core/api';
import { isSuperadmin } from '@web/core/auth/roles';
import { getSessionUser } from '@web/core/auth/session';
import { format } from '@web/core/i18n/format';
import { Container } from '@web/ui';
import { Button } from '@web/ui/button';
import { Card } from '@web/ui/card';
import { DownloadIcon } from 'lucide-react';
import { Pagination } from '@web/ui/pagination';
import { Skeleton } from '@web/ui/skeleton';
import { CreateDeploymentDialog } from '@/features/deployments/create-deployment-dialog';
import { DeploymentsTable } from '@/features/deployments/deployments-table';
import { loadDeploymentsParams } from '@/features/deployments/search-params';
import { DeploymentsToolbar } from '@/features/deployments/toolbar';
import { href, LOCALES, type Locale } from '@/i18n/locales';
import { getLocale, getMessages, type Messages } from '@/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).deployments.title };
}

/** Static shell (title, toolbar placeholders); the list depends on the session and the URL: streamed. */
export default async function DeploymentsPage({ searchParams }: PageProps<'/[lang]/deployments'>) {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <Container className="py-10 sm:py-14">
      <Suspense fallback={<ListSkeleton />}>
        <Deployments t={t} locale={locale} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Deployments({
  t,
  locale,
  searchParams,
}: {
  t: Messages;
  locale: Locale;
  searchParams: PageProps<'/[lang]/deployments'>['searchParams'];
}) {
  const self = href(locale, '/deployments');
  const user = await getSessionUser().catch(() => null);
  if (!user) redirect(`${href(locale, '/login')}?returnTo=${encodeURIComponent(self)}`);
  if (!isSuperadmin(user)) notFound(); // a system page (ADR 0030); the API refuses site admins anyway

  const params = await loadDeploymentsParams(searchParams);
  const search = params.search.trim().slice(0, 100);
  const page = params.page;
  const d = t.deployments;
  const result = await listDeployments({ page: Math.max(1, page), search: search || undefined });
  const pageHref = (target: number) => `${self}?${new URLSearchParams({ ...(search && { search }), ...(target > 1 && { page: String(target) }) })}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{d.title}</h1>
          <p className="mt-2 text-muted">{d.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* A plain download link (GET, read-only): the export of exactly what is listed. */}
          <Button asChild variant="secondary">
            <a href={`/exports/deployments${search ? `?${new URLSearchParams({ search })}` : ''}`} download>
              <DownloadIcon />
              {d.export.button}
            </a>
          </Button>
          <CreateDeploymentDialog
            labels={{ ...d.create, cancel: t.common.cancel, close: t.common.close, requestId: t.common.requestId, validation: t.validation }}
          />
        </div>
      </header>

      <Card padding="p-0" className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <DeploymentsToolbar labels={{ search: d.search.label, placeholder: d.search.placeholder }} />
          {result.ok && (
            <p className="text-sm text-muted tabular-nums">
              {format(d.total, { count: new Intl.NumberFormat(LOCALES[locale].intl).format(result.data.meta.total) })}
            </p>
          )}
        </div>

        {result.ok ? (
          <>
            <DeploymentsTable
              data={result.data.data}
              intlLocale={LOCALES[locale].intl}
              labels={{
                columns: d.columns,
                status: t.overview.status,
                empty: search ? format(d.emptySearch, { search }) : d.empty,
                caption: d.title,
              }}
            />
            <Pagination
              className="border-t border-border p-4"
              page={result.data.meta.page}
              totalPages={result.data.meta.totalPages}
              href={pageHref}
              labels={{
                nav: d.pagination.nav,
                previous: d.pagination.previous,
                next: d.pagination.next,
                status: format(d.pagination.status, { page: result.data.meta.page, total: result.data.meta.totalPages }),
              }}
            />
          </>
        ) : (
          <div className="p-6">
            <p className="font-semibold">{t.overview.errors.title}</p>
            <p className="mt-2 text-sm text-subtle">
              {result.message} · {t.common.requestId} <code className="font-mono">{result.requestId}</code>
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 w-72" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
