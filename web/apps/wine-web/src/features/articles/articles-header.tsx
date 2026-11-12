import { Container } from '@web/ui';
import { Eyebrow } from '@/components/section-heading';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';
import { CategoryNav } from './category-nav';

/** Masthead of the article list pages: eyebrow, the page's <h1>, intro, topics. */
export function ArticlesHeader({
  title,
  intro,
  active,
  locale,
  t,
}: {
  title: string;
  intro: string;
  active?: string;
  locale: Locale;
  t: Messages;
}) {
  return (
    <div className="border-b border-border bg-surface-2">
      <Container className="pt-12 pb-10 sm:pt-16">
        <Eyebrow align="left">{t.articles.eyebrow}</Eyebrow>
        <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.05] font-bold tracking-tight text-balance text-brand-strong sm:text-6xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{intro}</p>
        <div className="mt-8">
          <CategoryNav active={active} locale={locale} t={t} />
        </div>
      </Container>
    </div>
  );
}
