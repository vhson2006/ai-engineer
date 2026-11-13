import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { listMedia, listStudioProjects } from '@web/core/api';
import { getSessionUser } from '@web/core/auth/session';
import { format } from '@web/core/i18n/format';
import { Card, Container } from '@web/ui';
import { Skeleton } from '@web/ui/skeleton';
import { DownloadIcon } from 'lucide-react';
import { ApiFailure } from '@/components/api-failure';
import { MediaLibraryPanel } from '@/features/media/media-library-panel';
import { siteOr404 } from '@/features/sites/data';
import { href, type Locale } from '@/i18n/locales';
import { getLocale, getMessages, type Messages } from '@/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).media.title };
}

/** The site's media library (ADR 0034): upload (optimized in the browser), copy URLs, delete. */
export default async function MediaPage({ params }: PageProps<'/[lang]/sites/[siteId]/media'>) {
  // params (and the session) only inside <Suspense>: the static shell prerenders without them.
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <Container className="py-10 sm:py-14">
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <MediaLibraryPage t={t} locale={locale} params={params} />
      </Suspense>
    </Container>
  );
}

async function MediaLibraryPage({
  t,
  locale,
  params,
}: {
  t: Messages;
  locale: Locale;
  params: PageProps<'/[lang]/sites/[siteId]/media'>['params'];
}) {
  const { siteId } = await params;
  const self = href(locale, `/sites/${siteId}/media`);
  const user = await getSessionUser().catch(() => null);
  if (!user) redirect(`${href(locale, '/login')}?returnTo=${encodeURIComponent(self)}`);

  const site = await siteOr404(siteId);
  if (!site.ok) return <ApiFailure t={t} failure={site} />;
  const [media, videos] = await Promise.all([listMedia(siteId, { limit: 100 }), listStudioProjects(siteId, { rendered: true, limit: 50 })]);
  const studio = href(locale, `/sites/${siteId}/studio`);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-brand">{site.data.name}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{t.media.title}</h1>
        <p className="mt-2 max-w-2xl text-muted">{format(t.media.subtitle, { site: site.data.name })}</p>
      </header>
      {!media.ok ? (
        <ApiFailure t={t} failure={media} />
      ) : (
        <Card>
          <MediaLibraryPanel siteId={siteId} initial={media.data.data} labels={t.media} />
        </Card>
      )}

      {/* Finished videos of the video studio (ADR 0039). */}
      <section aria-labelledby="videos-title" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="videos-title" className="text-xl font-semibold">
              {t.media.videos}
            </h2>
            <p className="text-sm text-muted">{t.media.videosHint}</p>
          </div>
          <Link href={studio} className="text-sm font-medium text-brand hover:underline">
            {t.media.openStudio}
          </Link>
        </div>
        {!videos.ok ? (
          <ApiFailure t={t} failure={videos} />
        ) : videos.data.data.length === 0 ? (
          <p className="text-sm text-subtle">{t.media.videosEmpty}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {videos.data.data.map((project) =>
              project.video ? (
                <li key={project.id} className="space-y-2">
                  {/* The light web version and its poster: a page of clips loads nothing before play. */}
                  <video
                    controls
                    playsInline
                    preload={project.video.posterUrl ? 'none' : 'metadata'}
                    poster={project.video.posterUrl ?? undefined}
                    src={project.video.webUrl ?? project.video.url}
                    className="aspect-[9/16] w-full rounded-xl bg-black"
                  />
                  <Link href={`${studio}/${project.id}`} className="block truncate text-sm font-medium hover:underline">
                    {project.title}
                  </Link>
                  <a href={project.video.url} download className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg">
                    <DownloadIcon aria-hidden className="size-3.5" />
                    {t.media.download} · {(project.video.durationMs / 1000).toFixed(0)} s
                  </a>
                </li>
              ) : null,
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
