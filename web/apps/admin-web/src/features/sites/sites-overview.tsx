import Link from 'next/link';
import { listArticles, type ArticleStatus, type Site } from '@web/core/api';
import { format } from '@web/core/i18n/format';
import { buttonClass, Card } from '@web/ui';
import { ArrowRightIcon } from 'lucide-react';
import { href, LOCALES, type Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';
import { mySites } from './data';

const STATUSES: ArticleStatus[] = ['draft', 'scheduled', 'published'];

/** One card per site the user manages, with its article counts. */
export async function SitesOverview({ t, locale }: { t: Messages['overviewSites']; locale: Locale }) {
  const sites = await mySites();
  const list = sites.ok ? sites.data : [];

  return (
    <section aria-labelledby="sites-title" className="space-y-4">
      <div>
        <h2 id="sites-title" className="text-xl font-semibold tracking-tight">
          {t.title}
        </h2>
        <p className="mt-1 text-sm text-muted">{t.subtitle}</p>
      </div>
      {!sites.ok ? (
        <Card>
          <p className="text-sm text-subtle">
            {sites.message} · <code className="font-mono">{sites.requestId}</code>
          </p>
        </Card>
      ) : list.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">{t.empty}</p>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((site) => (
            <li key={site.id}>
              <SiteCard site={site} t={t} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function SiteCard({ site, t, locale }: { site: Site; t: Messages['overviewSites']; locale: Locale }) {
  // Only the totals: one row per status (limit 1).
  const totals = await Promise.all(
    STATUSES.map(async (status) => {
      const result = await listArticles(site.id, { status, limit: 1 });
      return result.ok ? result.data.meta.total : null;
    }),
  );
  const number = new Intl.NumberFormat(LOCALES[locale].intl);
  const labels = { draft: t.drafts, scheduled: t.scheduled, published: t.published };

  return (
    <Card className="flex h-full flex-col gap-4">
      <div>
        <h3 className="font-semibold">{site.name}</h3>
        <p className="mt-0.5 text-sm text-subtle">{format(t.languages, { locales: site.locales.join(', ') })}</p>
      </div>
      <dl className="grid grid-cols-3 gap-2">
        {STATUSES.map((status, i) => (
          <div key={status} className="rounded-lg bg-surface-2 px-3 py-2">
            <dt className="text-xs text-subtle">{labels[status]}</dt>
            <dd className="text-lg font-semibold tabular-nums">{totals[i] === null ? '–' : number.format(totals[i])}</dd>
          </div>
        ))}
      </dl>
      <Link href={href(locale, `/sites/${site.id}/articles`)} className={`${buttonClass.secondary} mt-auto self-start`}>
        {t.open}
        <ArrowRightIcon aria-hidden className="size-4" />
      </Link>
    </Card>
  );
}
