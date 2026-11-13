import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getStudioCatalog, listStudioProjects, STUDIO_BUSY } from '@web/core/api';
import { getSessionUser } from '@web/core/auth/session';
import { format } from '@web/core/i18n/format';
import { Card, Container } from '@web/ui';
import { Skeleton } from '@web/ui/skeleton';
import { ApiFailure } from '@/components/api-failure';
import { LocalDate } from '@/components/local-date';
import { siteOr404 } from '@/features/sites/data';
import { BusyPoller } from '@/features/studio/busy-poller';
import { StudioStatusBadge } from '@/features/studio/status-badge';
import { StudioNav } from '@/features/studio/studio-nav';
import { TemplatePicker } from '@/features/studio/template-picker';
import { href, LOCALES, type Locale } from '@/i18n/locales';
import { getLocale, getMessages, type Messages } from '@/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).studio.title };
}

/** The video studio of a site (ADR 0039): the templates to start from, then the site's videos. */
export default async function StudioPage({ params }: PageProps<'/[lang]/sites/[siteId]/studio'>) {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <Container className="py-10 sm:py-14">
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Studio t={t} locale={locale} params={params} />
      </Suspense>
    </Container>
  );
}

async function Studio({ t, locale, params }: { t: Messages; locale: Locale; params: PageProps<'/[lang]/sites/[siteId]/studio'>['params'] }) {
  const { siteId } = await params;
  const base = href(locale, `/sites/${siteId}/studio`);
  const user = await getSessionUser().catch(() => null);
  if (!user) redirect(`${href(locale, '/login')}?returnTo=${encodeURIComponent(base)}`);

  const site = await siteOr404(siteId);
  if (!site.ok) return <ApiFailure t={t} failure={site} />;
  const [catalog, projects] = await Promise.all([getStudioCatalog(siteId), listStudioProjects(siteId, { limit: 50 })]);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-brand">{site.data.name}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{t.studio.title}</h1>
        <p className="mt-2 max-w-2xl text-muted">{format(t.studio.subtitle, { site: site.data.name })}</p>
      </header>
      <StudioNav base={base} current="projects" t={t.studio} />

      {!catalog.ok ? (
        <ApiFailure t={t} failure={catalog} />
      ) : (
        <TemplatePicker
          siteId={siteId}
          base={base}
          templates={catalog.data.templates}
          locales={site.data.locales}
          uiLocale={locale === 'vi' ? 'vi' : 'en'}
          labels={{ t: t.studio, common: t.common, validation: t.validation }}
        />
      )}

      {!projects.ok ? (
        <ApiFailure t={t} failure={projects} />
      ) : (
        <Card padding="p-0">
          <BusyPoller busy={projects.data.data.some((p) => STUDIO_BUSY.includes(p.status))} intervalMs={5000} />
          {projects.data.data.length === 0 ? (
            <p className="p-6 text-sm text-subtle">{t.studio.projectsEmpty}</p>
          ) : (
            <ul className="divide-y divide-border">
              {projects.data.data.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`${base}/${project.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{project.title}</span>
                      <span className="text-xs text-subtle">
                        {catalog.ok ? catalog.data.templates.find((tpl) => tpl.id === project.templateId)?.name[locale === 'vi' ? 'vi' : 'en'] : null}{' '}
                        · {project.language.toUpperCase()} · <LocalDate iso={project.updatedAt} intlLocale={LOCALES[locale].intl} />
                      </span>
                    </span>
                    <StudioStatusBadge status={project.status} t={t.studio} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
