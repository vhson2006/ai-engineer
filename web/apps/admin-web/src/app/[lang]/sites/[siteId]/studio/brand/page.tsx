import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getStudioBrandKit, listMedia } from '@web/core/api';
import { getSessionUser } from '@web/core/auth/session';
import { format } from '@web/core/i18n/format';
import { Card, Container } from '@web/ui';
import { Skeleton } from '@web/ui/skeleton';
import { ApiFailure } from '@/components/api-failure';
import { siteOr404 } from '@/features/sites/data';
import { BrandForm } from '@/features/studio/brand-form';
import { StudioNav } from '@/features/studio/studio-nav';
import { href, type Locale } from '@/i18n/locales';
import { getLocale, getMessages, type Messages } from '@/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).studio.brand.title };
}

/** The brand kit of the site's videos (ADR 0039). */
export default async function StudioBrandPage({ params }: PageProps<'/[lang]/sites/[siteId]/studio/brand'>) {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <Container className="py-10 sm:py-14">
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Brand t={t} locale={locale} params={params} />
      </Suspense>
    </Container>
  );
}

async function Brand({ t, locale, params }: { t: Messages; locale: Locale; params: PageProps<'/[lang]/sites/[siteId]/studio/brand'>['params'] }) {
  const { siteId } = await params;
  const base = href(locale, `/sites/${siteId}/studio`);
  const user = await getSessionUser().catch(() => null);
  if (!user) redirect(`${href(locale, '/login')}?returnTo=${encodeURIComponent(`${base}/brand`)}`);
  const site = await siteOr404(siteId);
  if (!site.ok) return <ApiFailure t={t} failure={site} />;
  const [brand, media] = await Promise.all([getStudioBrandKit(siteId), listMedia(siteId, { limit: 100 })]);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-brand">{site.data.name}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{t.studio.brand.title}</h1>
        <p className="mt-2 max-w-2xl text-muted">{format(t.studio.brand.subtitle, { site: site.data.name })}</p>
      </header>
      <StudioNav base={base} current="brand" t={t.studio} />
      {!brand.ok ? (
        <ApiFailure t={t} failure={brand} />
      ) : (
        <Card>
          <BrandForm
            siteId={siteId}
            brand={brand.data}
            media={media.ok ? media.data.data : []}
            labels={{ t: t.studio, common: t.common, validation: t.validation, media: t.media }}
          />
        </Card>
      )}
    </div>
  );
}
