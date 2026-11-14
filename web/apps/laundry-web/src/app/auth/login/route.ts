import { site } from '@/site';

/** GET /auth/login?returnTo=…: customers sign in (ADR 0049; the kit's shared handler). */
export const { GET } = site.routes.authLogin;
