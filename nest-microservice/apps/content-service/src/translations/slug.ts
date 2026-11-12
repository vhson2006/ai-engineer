/** Max length of an article slug (ArticleTranslationDto). */
const MAX = 150;

/**
 * "Giá giặt sấy ở SFaster" → "gia-giat-say-o-sfaster": lowercase ASCII words joined by hyphens
 * (SLUG_PATTERN), Vietnamese diacritics and đ removed. Empty input → `fallback`.
 */
export function slugify(text: string, fallback = 'article'): string {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX)
    .replace(/-+$/g, '');
  return slug || fallback;
}

/** `slug`, or `slug-2`, `slug-3`… : the first that `isTaken` says is free. */
export async function freeSlug(
  slug: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  for (let n = 1; n < 100; n++) {
    const suffix = n === 1 ? '' : `-${n}`;
    const candidate = `${slug.slice(0, MAX - suffix.length).replace(/-+$/g, '')}${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  return `${slug.slice(0, MAX - 9)}-${Date.now().toString(36)}`;
}
