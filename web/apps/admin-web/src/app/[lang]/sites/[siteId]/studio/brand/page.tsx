import type { Metadata } from 'next';
import { getStudioBrandKit, listMedia } from '@web/core/api';
import { format } from '@web/core/i18n/format';
import { Card } from '@web/ui';
import { ApiFailure } from '@/components/api-failure';
import { PageHeader, PageShell } from '@/components/page';
import { requireUser } from '@/features/auth/require-user';
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
    <PageShell>
      <Brand t={t} locale={locale} params={params} />
    </PageShell>
  );
}

async function Brand({ t, locale, params }: { t: Messages; locale: Locale; params: PageProps<'/[lang]/sites/[siteId]/studio/brand'>['params'] }) {
  const { siteId } = await params;
  const base = href(locale, `/sites/${siteId}/studio`);
  await requireUser(locale, `${base}/brand`);
  const site = await siteOr404(siteId);
  if (!site.ok) return <ApiFailure t={t} failure={site} />;
  const [brand, media] = await Promise.all([getStudioBrandKit(siteId), listMedia(siteId, { limit: 100 })]);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={site.data.name} title={t.studio.brand.title} subtitle={format(t.studio.brand.subtitle, { site: site.data.name })} />
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
