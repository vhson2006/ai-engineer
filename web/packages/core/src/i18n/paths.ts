// Pure path helpers for localized routes (client-safe: no next/server).

/** The locale at the start of a path (`/vi/about` → 'vi'), or undefined. */
export function localeOfPath<L extends string>(pathname: string, locales: readonly L[]): L | undefined {
  const first = pathname.split('/')[1] ?? '';
  return locales.find((locale) => locale === first);
}

/** `path` ('/about', '/', '/dashboard?page=2') under `locale` ('/vi/about', '/vi', ...). */
export function localizedPath(locale: string, path: string): string {
  if (!path.startsWith('/')) path = `/${path}`;
  if (path === '/') return `/${locale}`;
  if (path.startsWith('/?') || path.startsWith('/#')) return `/${locale}${path.slice(1)}`;
  return `/${locale}${path}`;
}
