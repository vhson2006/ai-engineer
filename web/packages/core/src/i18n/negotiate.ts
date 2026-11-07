/**
 * Picks the best supported locale for an `Accept-Language` header (RFC 9110 §12.5.4), without a
 * library: exact tag first (`vi-VN` → `vi-VN`), then the language part (`vi-VN` → `vi`), then a
 * supported region variant of the language (`en` → `en-GB`). Pure: usable in the proxy and tests.
 */
export function negotiateLocale<L extends string>(
  acceptLanguage: string | null | undefined,
  locales: readonly L[],
  defaultLocale: L,
): L {
  if (!acceptLanguage) return defaultLocale;

  const wanted = acceptLanguage
    .split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      const quality = q ? Number.parseFloat(q.slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), quality: Number.isFinite(quality) ? quality : 0, index };
    })
    .filter((entry) => entry.tag && entry.tag !== '*' && entry.quality > 0)
    // Higher quality first; equal quality keeps the header's order.
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  const lower = locales.map((locale) => locale.toLowerCase());
  for (const { tag } of wanted) {
    const exact = lower.indexOf(tag);
    if (exact !== -1) return locales[exact];
    const language = tag.split('-')[0];
    const byLanguage = lower.indexOf(language);
    if (byLanguage !== -1) return locales[byLanguage];
    const variant = lower.findIndex((locale) => locale.split('-')[0] === language);
    if (variant !== -1) return locales[variant];
  }
  return defaultLocale;
}
