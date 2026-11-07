import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Card, Container, buttonClass, richText } from '@web/ui';
import { safeReturnTo } from '@web/core/auth/safe-redirect';
import { getSessionUser } from '@web/core/auth/session';
import { href, type Locale } from '@/i18n/locales';
import { privatePageRobots } from '@/seo';
import { getLocale, getMessages, type Messages } from '@/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).login.title, robots: privatePageRobots };
}

type LoginError = keyof Messages['login']['errors'];

/** The card is static; the part that depends on the request (error, session) streams in. */
export default async function LoginPage({ searchParams }: PageProps<'/[lang]/login'>) {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <Container className="flex justify-center py-20 sm:py-28">
      <Card padding="p-8" className="w-full max-w-md">
        <span className="inline-flex size-12 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-fg">
          <LockIcon />
        </span>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">{t.login.title}</h1>
        <p className="mt-2 text-pretty text-muted">{t.login.intro}</p>

        <Suspense fallback={<div className="mt-8 h-11 animate-pulse rounded-lg bg-surface-2" />}>
          <LoginActions searchParams={searchParams} t={t} locale={locale} />
        </Suspense>

        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-8 rounded-xl border border-dashed border-border p-4 text-sm text-muted">
            <p className="font-medium text-fg">{t.login.testAccounts.title}</p>
            <ul className="mt-2 space-y-1">
              <li><code className="font-mono">carol</code> — {t.login.testAccounts.carol}</li>
              <li><code className="font-mono">bob</code> — {t.login.testAccounts.bob}</li>
              <li><code className="font-mono">alice</code> — {t.login.testAccounts.alice}</li>
            </ul>
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
  const returnTo = safeReturnTo(typeof params.returnTo === 'string' ? params.returnTo : undefined, href(locale, '/dashboard'));
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

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className="size-6">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 1 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}
