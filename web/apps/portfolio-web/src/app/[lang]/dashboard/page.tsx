import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Badge, Card, Container, buttonClass, cn } from '@web/ui';
import { listDeployments, type Deployment, type DeploymentStatus } from '@web/core/api';
import { getSessionUser, type SessionUser } from '@web/core/auth/session';
import { format } from '@web/core/i18n/format';
import { href, LOCALES, type Locale } from '@/i18n/locales';
import { privatePageRobots } from '@/seo';
import { getLocale, getMessages, type Messages } from '@/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).dashboard.title, robots: privatePageRobots };
}

type SearchParams = PageProps<'/[lang]/dashboard'>['searchParams'];
type T = Messages['dashboard'];

export default async function DashboardPage({ searchParams }: PageProps<'/[lang]/dashboard'>) {
  const [messages, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <Container className="py-12 sm:py-16">
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard searchParams={searchParams} t={messages.dashboard} locale={locale} />
      </Suspense>
    </Container>
  );
}

async function Dashboard({ searchParams, t, locale }: { searchParams: SearchParams; t: T; locale: Locale }) {
  const user = await getSessionUser().catch(() => null);
  const self = href(locale, '/dashboard');
  if (!user) {
    redirect(`${href(locale, '/login')}?returnTo=${encodeURIComponent(self)}`);
  }

  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(String(params.page ?? '1'), 10) || 1);
  const search = typeof params.search === 'string' ? params.search.trim().slice(0, 100) : '';
  const result = await listDeployments({ page, search: search || undefined });

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-subtle">{t.eyebrow}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{format(t.welcome, { name: user.name.split(' ')[0] })}</h1>
          <p className="mt-2 text-muted">{t.subtitle}</p>
        </div>
        <RoleBadges roles={user.roles} t={t} />
      </header>

      {result.ok ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              label={t.stats.deployments}
              value={new Intl.NumberFormat(LOCALES[locale].intl).format(result.data.meta.total)}
              hint={search ? format(t.stats.matching, { search }) : t.stats.inTotal}
            />
            <Stat label={t.stats.access} value={accessLevel(user, t)} hint={user.username} />
            <Stat
              label={t.stats.page}
              value={`${result.data.meta.totalPages === 0 ? 0 : result.data.meta.page} / ${result.data.meta.totalPages}`}
              hint={format(t.stats.perPage, { limit: result.data.meta.limit })}
            />
          </div>

          <Card padding="p-0" className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-semibold">{t.list.title}</h2>
              <SearchForm search={search} action={self} t={t} />
            </div>
            {result.data.data.length === 0 ? (
              <EmptyState search={search} clearHref={self} t={t} />
            ) : (
              <DeploymentList deployments={result.data.data} userId={user.id} t={t} locale={locale} />
            )}
            <Pagination page={result.data.meta.page} totalPages={result.data.meta.totalPages} search={search} base={self} t={t} />
          </Card>
        </>
      ) : (
        <ApiError status={result.status} message={result.message} requestId={result.requestId} t={t} returnTo={self} />
      )}
    </div>
  );
}

/* ───────────────────────────── pieces ───────────────────────────── */

const STATUS_STYLE: Record<DeploymentStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  running: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  succeeded: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
};

function StatusBadge({ status, t }: { status: DeploymentStatus; t: T }) {
  return (
    <Badge className={STATUS_STYLE[status]}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {t.status[status]}
    </Badge>
  );
}

function DeploymentList({ deployments, userId, t, locale }: { deployments: Deployment[]; userId: string; t: T; locale: Locale }) {
  // Dates in the reader's language and conventions (vi-VN: 7 thg 11, 2026 ...).
  const dateFormat = new Intl.DateTimeFormat(LOCALES[locale].intl, { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <>
      {/* Table from sm up */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wider text-subtle">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">{t.list.name}</th>
              <th scope="col" className="px-4 py-3 font-medium">{t.list.version}</th>
              <th scope="col" className="px-4 py-3 font-medium">{t.list.environment}</th>
              <th scope="col" className="px-4 py-3 font-medium">{t.list.status}</th>
              <th scope="col" className="px-4 py-3 font-medium">{t.list.owner}</th>
              <th scope="col" className="px-4 py-3 font-medium">{t.list.created}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {deployments.map((d) => (
              <tr key={d.id} className="hover:bg-surface-2/60">
                <td className="px-4 py-3">
                  <p className="font-medium">{d.name}</p>
                  {d.description && <p className="max-w-xs truncate text-subtle">{d.description}</p>}
                </td>
                <td className="px-4 py-3 font-mono">{d.version}</td>
                <td className="px-4 py-3">
                  <Badge className="bg-surface-2 text-muted">{d.environment}</Badge>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={d.status} t={t} />
                </td>
                <td className="px-4 py-3 text-muted">{owner(d, userId, t)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">{dateFormat.format(new Date(d.createdAt))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards on phones */}
      <ul className="divide-y divide-border sm:hidden">
        {deployments.map((d) => (
          <li key={d.id} className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">
                {d.name} <span className="font-mono text-sm text-subtle">{d.version}</span>
              </p>
              <StatusBadge status={d.status} t={t} />
            </div>
            <p className="text-sm text-muted">
              {d.environment} · {owner(d, userId, t)} · {dateFormat.format(new Date(d.createdAt))}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}

function owner(d: Deployment, userId: string, t: T): string {
  if (!d.createdBy) return '—';
  return d.createdBy === userId ? t.list.you : t.list.someoneElse;
}

function SearchForm({ search, action, t }: { search: string; action: string; t: T }) {
  // A plain GET form: works without client JavaScript, and the URL is shareable.
  return (
    <form action={action} method="get" className="flex gap-2" role="search">
      <label htmlFor="search" className="sr-only">{t.search.label}</label>
      <input
        id="search"
        name="search"
        defaultValue={search}
        maxLength={100}
        placeholder={t.search.placeholder}
        className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none placeholder:text-subtle focus:border-brand sm:w-64"
      />
      <button type="submit" className={buttonClass.secondary}>{t.search.button}</button>
    </form>
  );
}

function Pagination({ page, totalPages, search, base, t }: { page: number; totalPages: number; search: string; base: string; t: T }) {
  if (totalPages <= 1) return null;
  const pageHref = (p: number) => `${base}?${new URLSearchParams({ page: String(p), ...(search && { search }) })}`;
  const linkClass = (disabled: boolean) => cn(buttonClass.secondary, disabled && 'pointer-events-none opacity-40');

  return (
    <nav aria-label={t.pagination.label} className="flex items-center justify-between border-t border-border p-4 text-sm">
      <Link href={pageHref(page - 1)} className={linkClass(page <= 1)} aria-disabled={page <= 1}>
        {t.pagination.previous}
      </Link>
      <span className="text-muted">{format(t.pagination.pageOf, { page, total: totalPages })}</span>
      <Link href={pageHref(page + 1)} className={linkClass(page >= totalPages)} aria-disabled={page >= totalPages}>
        {t.pagination.next}
      </Link>
    </nav>
  );
}

function EmptyState({ search, clearHref, t }: { search: string; clearHref: string; t: T }) {
  return (
    <div className="px-4 py-16 text-center">
      <p className="font-medium">{search ? t.empty.noMatch : t.empty.none}</p>
      <p className="mt-1 text-sm text-muted">
        {search ? (
          <Link href={clearHref} className="text-brand hover:underline">{t.empty.clear}</Link>
        ) : (
          t.empty.hint
        )}
      </p>
    </div>
  );
}

function ApiError({
  status,
  message,
  requestId,
  t,
  returnTo,
}: {
  status: number;
  message: string;
  requestId: string;
  t: T;
  returnTo: string;
}) {
  const title = status === 401 ? t.errors.expiredTitle : status === 403 ? t.errors.forbiddenTitle : t.errors.failedTitle;
  const help = status === 401 ? t.errors.expiredHelp : status === 403 ? t.errors.forbiddenHelp : t.errors.failedHelp;

  return (
    <Card className="border-red-200 dark:border-red-500/30">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-muted">{help}</p>
      <p className="mt-3 text-sm text-subtle">
        {message} · {t.errors.requestId} <code className="font-mono">{requestId}</code>
      </p>
      {status === 401 && (
        <a href={`/auth/login?returnTo=${encodeURIComponent(returnTo)}`} className={`${buttonClass.primary} mt-4`}>
          {t.errors.signInAgain}
        </a>
      )}
    </Card>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <p className="text-sm text-subtle">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 truncate text-sm text-muted">{hint}</p>
    </Card>
  );
}

function RoleBadges({ roles, t }: { roles: string[]; t: T }) {
  if (roles.length === 0) return <Badge className="bg-surface-2 text-muted">{t.roles.none}</Badge>;
  return (
    <ul className="flex flex-wrap gap-2" aria-label={t.roles.label}>
      {roles.map((role) => (
        <li key={role}><Badge>{role}</Badge></li>
      ))}
    </ul>
  );
}

function accessLevel(user: SessionUser, t: T): string {
  if (user.roles.includes('deployment:admin')) return t.access.admin;
  if (user.roles.includes('deployment:write')) return t.access.readWrite;
  if (user.roles.includes('deployment:read')) return t.access.readOnly;
  return t.access.none;
}

function DashboardSkeleton() {
  return (
    <div aria-hidden className="space-y-8">
      <div className="h-16 w-72 animate-pulse rounded-lg bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-2" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-surface-2" />
    </div>
  );
}
