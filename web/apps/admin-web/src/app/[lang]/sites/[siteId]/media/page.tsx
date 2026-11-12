import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { listMedia } from '@web/core/api';
import { getSessionUser } from '@web/core/auth/session';
import { format } from '@web/core/i18n/format';
import { Card, Container } from '@web/ui';
import { Skeleton } from '@web/ui/skeleton';
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

async function MediaLibraryPage({ t, locale, params }: { t: Messages; locale: Locale; params: PageProps<'/[lang]/sites/[siteId]/media'>['params'] }) {
  const { siteId } = await params;
  const self = href(locale, `/sites/${siteId}/media`);
  const user = await getSessionUser().catch(() => null);
  if (!user) redirect(`${href(locale, '/login')}?returnTo=${encodeURIComponent(self)}`);

  const site = await siteOr404(siteId);
  if (!site.ok) return <ApiFailure t={t} failure={site} />;
  const media = await listMedia(siteId, { limit: 100 });

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
    </div>
  );
}
