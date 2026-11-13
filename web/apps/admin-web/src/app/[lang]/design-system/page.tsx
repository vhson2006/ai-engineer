import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { isSuperadmin } from '@web/core/auth/roles';
import { Container } from '@web/ui';
import { Skeleton } from '@web/ui/skeleton';
import { requireUser } from '@/features/auth/require-user';
import { DesignSystemShowcase } from '@/features/design-system/showcase';
import { href, LOCALES, type Locale } from '@/i18n/locales';
import { getLocale, getMessages, type Messages } from '@/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).designSystem.title };
}

/** A living catalogue of @web/ui (a system page: superadmins only, ADR 0030). */
export default async function DesignSystemPage() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <Container className="py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t.designSystem.title}</h1>
        <p className="mt-2 max-w-3xl text-pretty text-muted">{t.designSystem.subtitle}</p>
      </header>
      <Suspense fallback={<Skeleton className="h-[40rem] rounded-2xl" />}>
        <Showcase t={t} locale={locale} />
      </Suspense>
    </Container>
  );
}

async function Showcase({ t, locale }: { t: Messages; locale: Locale }) {
  const user = await requireUser(locale, href(locale, '/design-system'));
  if (!isSuperadmin(user)) notFound();
  return <DesignSystemShowcase t={t.designSystem} lang={locale} intlLocale={LOCALES[locale].intl} />;
}
