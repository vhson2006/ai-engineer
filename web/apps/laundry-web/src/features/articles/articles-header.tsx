import Link from 'next/link';
import { Container, cn } from '@web/ui';
import { Eyebrow } from '@/components/section-heading';
import { href, type Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';
import { articlePaths, listTopics } from './data';

/**
 * Masthead of the article list pages: label, the page's <h1>, intro and the topics (from the API,
 * in the admins' order). Topics are real links (each is its own static, indexable page).
 */
export async function ArticlesHeader({ title, intro, active, locale, t }: { title: string; intro: string; active?: string; locale: Locale; t: Messages }) {
  const topics = await listTopics(locale);
  const links = [
    { id: 'all', label: t.articles.all, path: articlePaths.index, current: !active },
    ...topics.map((topic) => ({ id: topic.key, label: topic.name, path: articlePaths.topic(topic.slug), current: active === topic.key })),
  ];
  return (
    <div className="border-b border-border bg-surface-2">
      <Container className="pt-14 pb-10 sm:pt-20">
        <Eyebrow>{t.articles.eyebrow}</Eyebrow>
        <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.05] font-extrabold tracking-tight text-balance text-brand-strong sm:text-6xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{intro}</p>
        <nav aria-label={t.articles.categoriesLabel} className="mt-10">
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
      </Container>
    </div>
  );
}
