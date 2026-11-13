import type { Metadata } from 'next';
import { Badge, Card, cn } from '@web/ui';
import { PageShell } from '@/components/page';
import { requireUser } from '@/features/auth/require-user';
import { DeploymentsTable } from '@/features/deployments/deployments-table';
import { OverviewCharts } from '@/features/deployments/overview-charts';
import { listDeployments, MAX_PAGE_SIZE, type Deployment, type DeploymentStatus } from '@web/core/api';
import { isSuperadmin } from '@web/core/auth/roles';
import type { SessionUser } from '@web/core/auth/session';
import { SitesOverview } from '@/features/sites/sites-overview';
import { format } from '@web/core/i18n/format';
import { href, LOCALES, type Locale } from '@/i18n/locales';
import { getLocale, getMessages, type Messages } from '@/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).overview.title };
}

type T = Messages['overview'];

/** The shell is static; everything that needs the session streams in. Admins only (proxy → login). */
export default async function OverviewPage() {
  const [messages, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <PageShell fallback={<OverviewSkeleton />}>
      <Overview t={messages.overview} deployments={messages.deployments} sites={messages.overviewSites} locale={locale} />
    </PageShell>
  );
}

async function Overview({ t, deployments, sites, locale }: { t: T; deployments: Messages['deployments']; sites: Messages['overviewSites']; locale: Locale }) {
  // Only sessions with KEYCLOAK_REQUIRED_ROLE exist in this app (@web/core/auth/session).
  const user = await requireUser(locale, href(locale, '/'));
  const superadmin = isSuperadmin(user);

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">{t.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-balance">{format(t.welcome, { name: user.name.split(' ')[0] })}</h1>
          <p className="mt-2 max-w-2xl text-pretty text-muted">{t.subtitle}</p>
        </div>
        <SecurityNote title={t.security.title} text={superadmin ? t.security.textSuperadmin : t.security.textSiteAdmin} />
      </header>

      <SitesOverview t={sites} locale={locale} />
      {superadmin && <DeploymentsOverview t={t} deployments={deployments} locale={locale} user={user} />}
    </div>
  );
}

/** Superadmins: the deployments of the platform (the old overview). */
async function DeploymentsOverview({
  t,
  deployments,
  locale,
  user,
}: {
  t: T;
  deployments: Messages['deployments'];
  locale: Locale;
  user: SessionUser;
}) {
  // The latest 100 (one API page): stats and charts. The table shows the 10 most recent.
  const result = await listDeployments({ page: 1, limit: MAX_PAGE_SIZE });
  const latest = result.ok ? result.data.data : [];
  const count = (status: DeploymentStatus) => latest.filter((d) => d.status === status).length;
  const number = new Intl.NumberFormat(LOCALES[locale].intl);
  const STATUSES: DeploymentStatus[] = ['pending', 'running', 'succeeded', 'failed'];

  return (
    <div className="space-y-8">
      {result.ok ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label={t.stats.deployments} value={number.format(result.data.meta.total)} hint={t.stats.deploymentsHint} tone="brand" />
            <Stat
              label={t.stats.running}
              value={number.format(count('running'))}
              hint={format(t.stats.latestHint, { count: latest.length })}
              tone="sky"
            />
            <Stat
              label={t.stats.failed}
              value={number.format(count('failed'))}
              hint={format(t.stats.latestHint, { count: latest.length })}
              tone="red"
            />
          </div>

          <OverviewCharts
            byStatus={STATUSES.map((status) => ({ status, label: t.status[status], count: count(status) }))}
            byDay={perDay(latest, LOCALES[locale].intl)}
            intlLocale={LOCALES[locale].intl}
            labels={{
              ...t.charts,
              status: format(t.charts.status, { count: latest.length }),
              statusLabel: format(t.charts.statusLabel, { count: latest.length }),
            }}
          />

          <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
            <Card padding="p-0" className="overflow-hidden">
              <h2 className="border-b border-border px-5 py-4 font-semibold">{t.recent.title}</h2>
              <DeploymentsTable
                data={latest.slice(0, 10)}
                intlLocale={LOCALES[locale].intl}
                labels={{ columns: deployments.columns, status: t.status, empty: t.recent.empty, caption: t.recent.title }}
              />
            </Card>
            <Card>
              <h2 className="font-semibold">{t.roles.title}</h2>
              <p className="mt-1 truncate text-sm text-subtle">{user.username}</p>
              {user.roles.length === 0 ? (
                <p className="mt-4 text-sm text-muted">{t.roles.none}</p>
              ) : (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {user.roles.map((role) => (
                    <li key={role}>
                      <Badge>{role}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      ) : (
        <Card className="border-red-200 dark:border-red-500/30">
          <h2 className="font-semibold">{t.errors.title}</h2>
          <p className="mt-2 text-sm text-subtle">
            {result.message} · {t.errors.requestId} <code className="font-mono">{result.requestId}</code>
          </p>
        </Card>
      )}
    </div>
  );
}

/** Deployments created per day over the last 14 days (UTC days), labelled in the user's language. */
function perDay(deployments: Deployment[], intlLocale: string): { day: string; count: number }[] {
  const label = new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const today = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
  const DAY = 86_400_000;
  return Array.from({ length: 14 }, (_, i) => {
    const start = today - (13 - i) * DAY;
    const count = deployments.filter((d) => {
      const at = Date.parse(d.createdAt);
      return at >= start && at < start + DAY;
    }).length;
    return { day: label.format(start), count };
  });
}

function SecurityNote({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex max-w-md items-start gap-3 rounded-2xl border border-brand/25 bg-brand-soft px-4 py-3 text-brand-soft-fg">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className="mt-0.5 size-5 shrink-0">
        <rect x="4" y="10" width="16" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 1 1 8 0v3" strokeLinecap="round" />
      </svg>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-sm leading-relaxed opacity-90">{text}</p>
      </div>
    </div>
  );
}

const TONES = {
  brand: 'bg-brand',
  sky: 'bg-sky-500',
  red: 'bg-red-500',
} as const;

function Stat({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: keyof typeof TONES }) {
  return (
    <Card className="relative overflow-hidden">
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', TONES[tone])} />
      <p className="text-sm text-subtle">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 truncate text-sm text-muted">{hint}</p>
    </Card>
  );
}

function OverviewSkeleton() {
  return (
    <div aria-hidden className="space-y-8">
      <div className="h-20 w-80 animate-pulse rounded-lg bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-2" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-surface-2" />
    </div>
  );
}
