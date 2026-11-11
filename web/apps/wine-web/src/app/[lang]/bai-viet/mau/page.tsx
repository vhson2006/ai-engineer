import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, LayoutTemplate } from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { Container } from '@web/ui';
import { ARTICLE_TEMPLATES, coverSrc } from '@/content/article-templates';
import { articlePaths } from '@/features/articles/data';
import { href } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';

/** A review page for the site's owner: not indexed, not in the sitemap. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages();
  return { title: t.templates.metaTitle, robots: { index: false, follow: false } };
}

/** The article templates the admin will pick from: one card per template, linking to a full preview. */
export default async function TemplatesPage() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <>
      <header className="bg-surface-2">
        <Container className="max-w-4xl py-14 sm:py-20">
          <p className="inline-flex items-center gap-2 text-sm font-bold tracking-[0.18em] text-gold-text uppercase">
            <LayoutTemplate aria-hidden className="size-4" />
            {t.templates.eyebrow}
          </p>
          <h1 className="mt-4 font-display text-4xl leading-tight font-bold text-balance text-brand-strong sm:text-5xl">{t.templates.title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">{t.templates.intro}</p>
          {locale !== 'vi' && <p className="mt-3 text-sm text-subtle">{t.templates.languageNote}</p>}
        </Container>
      </header>
      <Container className="py-14 sm:py-20">
        <ol className="grid gap-8 md:grid-cols-2">
          {ARTICLE_TEMPLATES.map((template, index) => (
            <li key={template.id}>
              <article className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-border bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG placeholder */}
                <img src={coverSrc(template.cover)} alt="" className="aspect-[16/7] w-full object-cover" />
                <div className="flex flex-1 flex-col p-7">
                  <p className="text-xs font-bold tracking-[0.18em] text-gold-text uppercase">{format(t.templates.chip, { number: index + 1 })}</p>
                  <h2 className="mt-2 font-display text-2xl font-bold text-fg">
                    <Link
                      href={href(locale, `${articlePaths.index}/mau/${template.id}`)}
                      className="after:absolute after:inset-0 after:rounded-[2rem] group-hover:text-brand-strong focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-brand"
                    >
                      {template.name}
                    </Link>
                  </h2>
                  <p className="mt-2 leading-relaxed text-muted">{template.description}</p>
                  <p className="mt-4 text-sm">
                    <span className="font-bold text-fg">{t.templates.bestFor}: </span>
                    <span className="text-muted">{template.bestFor}</span>
                  </p>
                  <p className="sr-only">{t.templates.blocks}</p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {template.blocks.map((block) => (
                      <li key={block} className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">
                        {block}
                      </li>
                    ))}
                  </ul>
                  <p aria-hidden className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-bold text-brand-strong">
                    {t.templates.preview}
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </Container>
    </>
  );
}
