import { createLoginRoute } from '@web/core/auth/routes';
import { LOCALE_CODES } from '@/i18n/locales';

/** GET /auth/login?returnTo=/vi/dashboard (shared implementation: @web/core/auth/routes). */
export const GET = createLoginRoute({ locales: LOCALE_CODES, defaultReturnTo: '/dashboard' });
