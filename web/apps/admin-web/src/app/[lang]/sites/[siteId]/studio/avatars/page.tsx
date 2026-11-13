import type { Metadata } from 'next';
import { getStudioCatalog, listMedia, listStudioAvatars } from '@web/core/api';
import { ApiFailure } from '@/components/api-failure';
import { PageHeader, PageShell } from '@/components/page';
import { requireUser } from '@/features/auth/require-user';
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
    <PageShell>
      <Avatars t={t} locale={locale} params={params} />
    </PageShell>
  );
}

async function Avatars({ t, locale, params }: { t: Messages; locale: Locale; params: PageProps<'/[lang]/sites/[siteId]/studio/avatars'>['params'] }) {
  const { siteId } = await params;
  const base = href(locale, `/sites/${siteId}/studio`);
  await requireUser(locale, `${base}/avatars`);
  const site = await siteOr404(siteId);
  if (!site.ok) return <ApiFailure t={t} failure={site} />;
  const [avatars, catalog, media] = await Promise.all([listStudioAvatars(siteId), getStudioCatalog(siteId), listMedia(siteId, { limit: 100 })]);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={site.data.name} title={t.studio.avatars.title} subtitle={t.studio.avatars.subtitle} />
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
