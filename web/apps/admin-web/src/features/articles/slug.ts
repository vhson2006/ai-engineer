/**
 * A URL slug from a title in any language: "Năm thói quen giúp móng bền lâu" →
 * "nam-thoi-quen-giup-mong-ben-lau". Accents removed (đ → d), lowercase, dashes, ≤ 150.
 */
export function slugify(title: string, max = 150): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/, '');
}
