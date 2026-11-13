import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getStudioCatalog, listMedia, listStudioAvatars } from '@web/core/api';
import { getSessionUser } from '@web/core/auth/session';
import { Container } from '@web/ui';
import { Skeleton } from '@web/ui/skeleton';
import { ApiFailure } from '@/components/api-failure';
import { siteOr404 } from '@/features/sites/data';
import { AvatarsManager } from '@/features/studio/avatars-manager';
import { StudioNav } from '@/features/studio/studio-nav';
import { href, type Locale } from '@/i18n/locales';
import { getLocale, getMessages, type Messages } from '@/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).studio.avatars.title };
}

/** The hosts of the site's videos (ADR 0039). */
export default async function StudioAvatarsPage({ params }: PageProps<'/[lang]/sites/[siteId]/studio/avatars'>) {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <Container className="py-10 sm:py-14">
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Avatars t={t} locale={locale} params={params} />
      </Suspense>
    </Container>
  );
}

async function Avatars({ t, locale, params }: { t: Messages; locale: Locale; params: PageProps<'/[lang]/sites/[siteId]/studio/avatars'>['params'] }) {
  const { siteId } = await params;
  const base = href(locale, `/sites/${siteId}/studio`);
  const user = await getSessionUser().catch(() => null);
  if (!user) redirect(`${href(locale, '/login')}?returnTo=${encodeURIComponent(`${base}/avatars`)}`);
  const site = await siteOr404(siteId);
  if (!site.ok) return <ApiFailure t={t} failure={site} />;
  const [avatars, catalog, media] = await Promise.all([listStudioAvatars(siteId), getStudioCatalog(siteId), listMedia(siteId, { limit: 100 })]);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-brand">{site.data.name}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{t.studio.avatars.title}</h1>
        <p className="mt-2 max-w-2xl text-muted">{t.studio.avatars.subtitle}</p>
      </header>
      <StudioNav base={base} current="avatars" t={t.studio} />
      {!avatars.ok ? (
        <ApiFailure t={t} failure={avatars} />
      ) : !catalog.ok ? (
        <ApiFailure t={t} failure={catalog} />
      ) : (
        <AvatarsManager
          siteId={siteId}
          avatars={avatars.data}
          voices={catalog.data.voices}
          media={media.ok ? media.data.data : []}
          uiLocale={locale === 'vi' ? 'vi' : 'en'}
          labels={{ t: t.studio, common: t.common, validation: t.validation, media: t.media }}
        />
      )}
    </div>
  );
}
