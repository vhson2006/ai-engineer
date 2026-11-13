import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { isUuid } from '@web/core/actions/result';
import { getStudioCatalog, getStudioProject, listArticles, listMedia, listStudioAvatars, STUDIO_BUSY } from '@web/core/api';
import { getSessionUser } from '@web/core/auth/session';
import { Container } from '@web/ui';
import { Skeleton } from '@web/ui/skeleton';
import { ArrowLeftIcon } from 'lucide-react';
import { ApiFailure } from '@/components/api-failure';
import { siteOr404 } from '@/features/sites/data';
import { BusyPoller } from '@/features/studio/busy-poller';
import { ProjectEditor } from '@/features/studio/project-editor';
import { StudioStatusBadge } from '@/features/studio/status-badge';
import { href, type Locale } from '@/i18n/locales';
import { getLocale, getMessages, type Messages } from '@/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).studio.title };
}

/** One video (ADR 0039): inputs → AI script → voices → preview → export. */
export default async function StudioProjectPage({ params }: PageProps<'/[lang]/sites/[siteId]/studio/[id]'>) {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <Container className="py-10 sm:py-14">
      <Suspense fallback={<Skeleton className="h-[40rem] rounded-2xl" />}>
        <Editor t={t} locale={locale} params={params} />
      </Suspense>
    </Container>
  );
}

async function Editor({ t, locale, params }: { t: Messages; locale: Locale; params: PageProps<'/[lang]/sites/[siteId]/studio/[id]'>['params'] }) {
  const { siteId, id } = await params;
  const base = href(locale, `/sites/${siteId}/studio`);
  const self = `${base}/${id}`;
  const user = await getSessionUser().catch(() => null);
  if (!user) redirect(`${href(locale, '/login')}?returnTo=${encodeURIComponent(self)}`);
  if (!isUuid(id)) notFound();

  const site = await siteOr404(siteId);
  if (!site.ok) return <ApiFailure t={t} failure={site} />;
  const project = await getStudioProject(siteId, id);
  if (!project.ok && project.status === 404) notFound();
  if (!project.ok) return <ApiFailure t={t} failure={project} />;

  const [catalog, avatars, media, articles] = await Promise.all([
    getStudioCatalog(siteId),
    listStudioAvatars(siteId),
    listMedia(siteId, { limit: 100 }),
    listArticles(siteId, { status: 'published', limit: 100 }),
  ]);
  if (!catalog.ok) return <ApiFailure t={t} failure={catalog} />;
  const template = catalog.data.templates.find((tpl) => tpl.id === project.data.templateId);
  if (!template) notFound();

  const uiLocale = locale === 'vi' ? 'vi' : 'en';
  const language = project.data.language;
  return (
    <div className="space-y-6">
      <BusyPoller busy={STUDIO_BUSY.includes(project.data.status)} />
      <Link href={base} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeftIcon aria-hidden className="size-4" />
        {t.studio.back}
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">
            {site.data.name} · {template.name[uiLocale]} · {language.toUpperCase()}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{project.data.title}</h1>
        </div>
        <StudioStatusBadge status={project.data.status} t={t.studio} />
      </header>
      <ProjectEditor
        siteId={siteId}
        base={base}
        project={project.data}
        template={template}
        voices={catalog.data.voices}
        avatars={avatars.ok ? avatars.data : []}
        media={media.ok ? media.data.data : []}
        articles={(articles.ok ? articles.data.data : []).flatMap((article) => {
          const translation = article.translations?.find((tr) => tr.locale === language);
          return translation ? [{ id: article.id, title: translation.title }] : [];
        })}
        uiLocale={uiLocale}
        labels={{ t: t.studio, common: t.common, validation: t.validation, media: t.media }}
      />
    </div>
  );
}
