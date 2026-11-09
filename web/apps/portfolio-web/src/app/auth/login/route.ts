import { createLoginRoute } from '@web/core/auth/routes';
import { LOCALE_CODES } from '@/i18n/locales';
import { ACCOUNT_ENABLED } from '@/site';

/** GET /auth/login?returnTo=/vi/dashboard (shared implementation: @web/core/auth/routes). */
const login = createLoginRoute({ locales: LOCALE_CODES, defaultReturnTo: '/dashboard' });

/** Temporarily off with the rest of the account area (src/site.ts): nothing to sign in to. */
export const GET: typeof login = ACCOUNT_ENABLED ? login : async () => new Response(null, { status: 404 });
