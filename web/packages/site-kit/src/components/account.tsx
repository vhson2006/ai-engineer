import Link from 'next/link';
import { Suspense } from 'react';
import { UserRound } from 'lucide-react';
import { getSessionUser } from '@web/core/auth/session';
import { cn } from '@web/ui';
import { href, type Locale } from '../locales';
import type { BaseMessages } from '../messages';

/** The pages of a customer's account (ADR 0049): the same path in every language. */
export const ACCOUNT_PATH = '/account';
export const LOGIN_PATH = '/login';

/**
 * The header's account link (ADR 0049): "Sign in", or the customer's first name once signed in;
 * both open the account page. The rest of the page stays prerendered: only this part reads the
 * session cookie, streamed in after it (Suspense), so the page itself is never made dynamic.
 */
export function AccountLink({ t, locale, className }: { t: BaseMessages; locale: Locale; className?: string }) {
  const signIn = <AccountAnchor href={href(locale, LOGIN_PATH)} label={t.account.signIn} className={className} />;
  return (
    <Suspense fallback={signIn}>
      <AccountState t={t} locale={locale} className={className} signIn={signIn} />
    </Suspense>
  );
}

async function AccountState({ t, locale, className, signIn }: { t: BaseMessages; locale: Locale; className?: string; signIn: React.ReactNode }) {
  const user = await getSessionUser().catch(() => null); // session store down: shown as signed out
  if (!user) return signIn;
  const first = user.name.split(/\s+/)[0] || user.username;
  return <AccountAnchor href={href(locale, ACCOUNT_PATH)} label={first} title={t.account.myAccount} className={className} />;
}

function AccountAnchor({ href: target, label, title, className }: { href: string; label: string; title?: string; className?: string }) {
  return (
    <Link
      href={target}
      title={title}
      // Not prefetched: the account pages are per visitor.
      prefetch={false}
      className={cn(
        'inline-flex items-center gap-2 rounded-button px-3 py-2 text-sm font-medium text-fg hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        className,
      )}
    >
      <UserRound aria-hidden className="size-4" />
      <span>{label}</span>
    </Link>
  );
}
