import Link from 'next/link';
import { Info } from 'lucide-react';
import { cn } from '@web/ui';
import { Eyebrow } from '@/components/section-heading';
import { href, type Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';
import { articlePaths, CATEGORIES, type ArticleCategory } from './data';

/**
 * Masthead of the article list pages: label, the page's <h1>, intro and the topics. Topics are
 * real links (each topic is its own static, indexable page): no client state, works without JS.
 */
export function ArticlesHeader({ title, intro, active, locale, t }: { title: string; intro: string; active?: ArticleCategory; locale: Locale; t: Messages }) {
  const links = [
    { id: 'all', label: t.articles.all, path: articlePaths.index, current: !active },
    ...CATEGORIES.map((category) => ({ id: category, label: t.articles.categories[category], path: articlePaths.category(category), current: active === category })),
  ];
  return (
    <div>
      <Eyebrow dot="bg-rose-strong">{t.articles.eyebrow}</Eyebrow>
      <h1 className="mt-5 max-w-3xl text-5xl leading-[1.02] font-extrabold tracking-[-0.035em] text-balance sm:text-6xl">{title}</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{intro}</p>
      <nav aria-label={t.articles.categoriesLabel} className="mt-10">
        <ul className="flex flex-wrap gap-2">
          {links.map((link) => (
            <li key={link.id}>
              <Link
                href={href(locale, link.path)}
                aria-current={link.current ? 'page' : undefined}
                className={cn(
                  'inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                  link.current ? 'bg-fg text-bg' : 'bg-surface-2 hover:bg-mint',
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {/* Remove with the sample JSON once articles come from the API. */}
      <p className="mt-8 flex max-w-3xl gap-2 text-xs leading-relaxed text-subtle">
        <Info aria-hidden className="size-4 shrink-0" />
        {t.articles.sample}
      </p>
    </div>
  );
}
