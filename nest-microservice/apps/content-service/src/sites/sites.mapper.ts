import { SiteResponse } from '@app/common';
import type { Site } from '../generated/prisma/client';

/** Row → response contract (never return a raw row). */
export function toSiteResponse(row: Site): SiteResponse {
  return {
    id: row.id,
    name: row.name,
    locales: row.locales,
    defaultLocale: row.defaultLocale,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
