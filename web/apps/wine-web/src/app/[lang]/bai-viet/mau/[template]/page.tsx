import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Clock, LayoutTemplate } from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { Container } from '@web/ui';
import { LegalNotice } from '@/components/legal-notice';
import { ARTICLE_TEMPLATES, articleTemplate, coverSrc } from '@/content/article-templates';
import { ArticleHtml } from '@/features/article-templates/article-html-view';
import { articlePaths } from '@/features/articles/data';
import { href } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';

/** Fully static: an unknown template answers a real 404. */
export const ensureStatic = 'navigation';

export function generateStaticParams() {
  return ARTICLE_TEMPLATES.map((template) => ({ template: template.id }));
}

export async function generateMetadata({ params }: PageProps<'/[lang]/bai-viet/mau/[template]'>): Promise<Metadata> {
  const [{ template: id }, t] = await Promise.all([params, getMessages()]);
  const template = articleTemplate(id);
  return { title: template ? `${template.name} · ${t.templates.metaTitle}` : t.templates.metaTitle, robots: { index: false, follow: false } };
}

/** One template rendered as a real article (header, cover, body), with links to the others. */
export default async function TemplatePreviewPage({ params }: PageProps<'/[lang]/bai-viet/mau/[template]'>) {
  const [{ template: id }, t, locale] = await Promise.all([params, getMessages(), getLocale()]);
  const template = articleTemplate(id);
  if (!template) notFound();

  const index = ARTICLE_TEMPLATES.indexOf(template);
  const previous = ARTICLE_TEMPLATES[(index - 1 + ARTICLE_TEMPLATES.length) % ARTICLE_TEMPLATES.length];
  const next = ARTICLE_TEMPLATES[(index + 1) % ARTICLE_TEMPLATES.length];
  const pathOf = (templateId: string) => href(locale, `${articlePaths.index}/mau/${templateId}`);

  return (
    // overflow-x-clip: full-width images span 100vw, which includes the scrollbar.
    <article className="overflow-x-clip">
      <div className="bg-deep text-white">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
          <p className="inline-flex items-center gap-2">
            <LayoutTemplate aria-hidden className="size-4 text-gold" />
            {format(t.templates.banner, { number: index + 1, total: ARTICLE_TEMPLATES.length, name: template.name })}
          </p>
          <Link href={href(locale, `${articlePaths.index}/mau`)} className="font-bold text-gold-light hover:underline">
            {t.templates.all}
          </Link>
        </Container>
      </div>

      <header className="bg-surface-2">
        <Container className="max-w-4xl pt-10 pb-12 sm:pt-14">
          <span className="inline-flex rounded-full bg-yellow px-3 py-1 text-xs font-bold tracking-wide text-[#3f0a0d] uppercase">
            {format(t.templates.chip, { number: index + 1 })}
          </span>
          <h1 className="mt-4 font-display text-4xl leading-[1.1] font-bold tracking-tight text-balance text-brand-strong sm:text-5xl lg:text-6xl">
            {template.title}
          </h1>
          <p className="mt-5 text-xl leading-relaxed text-muted">{template.excerpt}</p>
          <p className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted">
            <Clock aria-hidden className="size-3.5" />
            {format(t.articles.minutes, { count: template.readingMinutes })}
          </p>
          {locale !== 'vi' && <p className="mt-3 text-sm text-subtle">{t.templates.languageNote}</p>}
        </Container>
      </header>

      <Container className="max-w-5xl">
        <div className="frame-ornate relative -mt-1 overflow-hidden rounded-[2rem] p-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG placeholder */}
          <img src={coverSrc(template.cover)} alt="" className="aspect-[16/9] w-full rounded-[1.6rem] object-cover" />
        </div>
      </Container>

      <Container className="max-w-3xl py-14 sm:py-20">
        <ArticleHtml html={template.html} />
        {/* The sites keep the legal notice at the end of every article (alcohol rules). */}
        <LegalNotice className="mt-14" />

        <nav aria-label={t.templates.navLabel} className="mt-14 grid gap-4 border-t border-border pt-8 sm:grid-cols-2">
          <Link href={pathOf(previous.id)} className="group rounded-2xl border border-border p-5 hover:border-brand">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted">
              <ArrowLeft aria-hidden className="size-4" />
              {t.templates.previous}
            </span>
            <span className="mt-1 block font-display text-lg font-bold group-hover:text-brand-strong">{previous.name}</span>
          </Link>
          <Link href={pathOf(next.id)} className="group rounded-2xl border border-border p-5 text-right hover:border-brand">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted">
              {t.templates.next}
              <ArrowRight aria-hidden className="size-4" />
            </span>
            <span className="mt-1 block font-display text-lg font-bold group-hover:text-brand-strong">{next.name}</span>
          </Link>
        </nav>
      </Container>
    </article>
  );
}
