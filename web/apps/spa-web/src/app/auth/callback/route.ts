import { site } from '@/site';

/** GET /auth/callback: Keycloak returns here after signing in (ADR 0049). */
export const { GET } = site.routes.authCallback;
