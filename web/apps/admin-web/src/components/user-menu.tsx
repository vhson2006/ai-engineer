import Link from 'next/link';
import { getSessionUser } from '@web/core/auth/session';
import { Avatar, buttonClass } from '@web/ui';
import { href } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';

/** Reads the session: rendered at request time behind a <Suspense> boundary. */
export async function UserMenu() {
  const [t, locale, user] = await Promise.all([
    getMessages(),
    getLocale(),
    getSessionUser().catch(() => null), // Redis down → behave as signed out
  ]);

  if (!user) {
    return (
      <Link href={href(locale, '/login')} className={buttonClass.primary}>
        {t.userMenu.signIn}
      </Link>
    );
  }

  const initials = user.name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="hidden items-center gap-2 sm:flex">
        <Avatar initials={initials} />
        <span className="text-sm font-medium">{user.name}</span>
      </div>
      <form action="/auth/logout" method="post">
        <button type="submit" className={buttonClass.secondary}>
          {t.userMenu.signOut}
        </button>
      </form>
    </div>
  );
}

export function UserMenuFallback() {
  return <div aria-hidden className="h-10 w-24 animate-pulse rounded-lg bg-surface-2" />;
}
