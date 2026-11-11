/**
 * The site's public origin, inlined at build time from SITE_URL (next.config.ts, ADR 0021).
 * Absolute URLs for link previews are built from it (metadataBase in the layout).
 */
export const SITE_URL = process.env.SITE_URL ?? 'http://localhost:3200';
