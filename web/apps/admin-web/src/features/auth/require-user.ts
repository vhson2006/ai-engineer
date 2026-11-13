import 'server-only';
import { redirect } from 'next/navigation';
import { getSessionUser, type SessionUser } from '@web/core/auth/session';
import { href, type Locale } from '@/i18n/locales';

/**
 * The signed-in admin of a page, or a redirect to the login page that comes back to `returnTo`
 * (a localized path). Called first by every page, inside its <Suspense>; the API still checks the
 * role and the site on every call (CLAUDE.md: never a page that works without a session).
 */
export async function requireUser(locale: Locale, returnTo: string): Promise<SessionUser> {
  const user = await getSessionUser().catch(() => null);
  if (!user) redirect(`${href(locale, '/login')}?returnTo=${encodeURIComponent(returnTo)}`);
  return user;
}
