import type { Category } from '@web/core/api';
import { displayTranslation } from '@/i18n/display-translation';

type Named = Pick<Category, 'key' | 'translations'>;

/** A topic's name in the first preferred language it has, else its key. */
export function categoryName(category: Named, preferred: string[]): string {
  return displayTranslation(category.translations, preferred)?.name ?? category.key;
}

/** The topics as the choices of a select: `{ id, name }`. */
export function categoryOptions(categories: (Named & { id: string })[], preferred: string[]): { id: string; name: string }[] {
  return categories.map((c) => ({ id: c.id, name: categoryName(c, preferred) }));
}
