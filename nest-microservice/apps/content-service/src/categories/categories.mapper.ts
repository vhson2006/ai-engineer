import { CategoryResponse } from '@app/common';
import type { Category, CategoryTranslation } from '../generated/prisma/client';

export const WITH_TRANSLATIONS = { translations: true } as const;

/** Row → response contract (never return a raw row); languages in a stable order. */
export function toCategoryResponse(
  row: Category & { translations: CategoryTranslation[] },
): CategoryResponse {
  return {
    id: row.id,
    siteId: row.siteId,
    key: row.key,
    position: row.position,
    translations: [...row.translations]
      .sort((a, b) => a.locale.localeCompare(b.locale))
      .map((t) => ({ locale: t.locale, name: t.name, slug: t.slug })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
