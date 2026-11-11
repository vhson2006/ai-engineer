import Link from 'next/link';
import { cn } from '@web/ui';
import { href, type Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';
import { articlePaths, CATEGORIES, type ArticleCategory } from './data';

/**
 * Topic filter as real links (each topic is its own static, indexable page): no client state,
 * works without JavaScript, shareable URLs.
 */
export function CategoryNav({ active, locale, t }: { active?: ArticleCategory; locale: Locale; t: Messages }) {
  const links = [
    { id: 'all', label: t.articles.all, path: articlePaths.index, current: !active },
    ...CATEGORIES.map((category) => ({
      id: category,
      label: t.articles.categories[category],
      path: articlePaths.category(category),
      current: active === category,
    })),
  ];
  return (
    <nav aria-label={t.articles.categoriesLabel}>
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => (
          <li key={link.id}>
            <Link
              href={href(locale, link.path)}
              aria-current={link.current ? 'page' : undefined}
              className={cn(
                'inline-flex h-10 items-center rounded-full border px-5 text-sm font-semibold transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                link.current ? 'border-brand bg-brand text-brand-fg' : 'border-border bg-surface hover:border-brand hover:text-brand-strong',
              )}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
