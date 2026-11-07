import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Card, Container, buttonClass, richText } from '@web/ui';
import { safeReturnTo } from '@web/core/auth/safe-redirect';
import { getSessionUser } from '@web/core/auth/session';
import { href, type Locale } from '@/i18n/locales';
import { getLocale, getMessages, type Messages } from '@/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).login.title };
}

type LoginError = keyof Messages['login']['errors'];

/** The card is static; the part that depends on the request (error, session) streams in. */
export default async function LoginPage({ searchParams }: PageProps<'/[lang]/login'>) {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <Container className="relative flex justify-center py-16 sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-72 max-w-2xl bg-[radial-gradient(ellipse_at_center,var(--brand-soft),transparent_70%)]"
      />
      <Card padding="p-8" className="w-full max-w-md">
        <span className="inline-flex size-12 items-center justify-center rounded-xl bg-brand text-brand-fg shadow-sm">
          <KeyIcon />
        </span>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">{t.login.title}</h1>
        <p className="mt-2 text-pretty text-muted">{t.login.intro}</p>

        <Suspense fallback={<div className="mt-8 h-11 animate-pulse rounded-lg bg-surface-2" />}>
          <LoginActions searchParams={searchParams} t={t} locale={locale} />
        </Suspense>

        <p className="mt-6 flex gap-2 text-sm text-subtle">
          <span aria-hidden>ⓘ</span>
          <span className="text-pretty">{t.login.otpHint}</span>
        </p>

        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-6 rounded-xl border border-dashed border-border p-4 text-sm text-muted">
            <p className="font-medium text-fg">{t.login.testAccounts.title}</p>
            <p className="mt-2">
              <code className="font-mono">alice</code> — {t.login.testAccounts.alice}
            </p>
          </div>
        )}
      </Card>
    </Container>
  );
}

async function LoginActions({
  searchParams,
  t,
  locale,
}: {
  searchParams: PageProps<'/[lang]/login'>['searchParams'];
  t: Messages;
  locale: Locale;
}) {
  const params = await searchParams;
  const error =
    typeof params.error === 'string' && params.error in t.login.errors
      ? t.login.errors[params.error as LoginError]
      : undefined;
  const returnTo = safeReturnTo(typeof params.returnTo === 'string' ? params.returnTo : undefined, href(locale, '/'));
  const user = await getSessionUser().catch(() => null);

  if (user) {
    return (
      <div className="mt-8">
        <p className="text-sm text-muted">
          {richText(t.login.signedInAs, { name: <span className="font-medium text-fg">{user.name}</span> })}
        </p>
        <Link href={returnTo} className={`${buttonClass.primary} mt-4 w-full`}>
          {t.login.continue}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}
      {/* A plain <a>: /auth/login is a route handler that redirects to Keycloak, not a page. */}
      <a href={`/auth/login?returnTo=${encodeURIComponent(returnTo)}`} className={`${buttonClass.primary} w-full`}>
        {t.login.continueWithKeycloak}
      </a>
    </div>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className="size-6">
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 8-8m-3 3 2 2m-4 0 2 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
