import type { Metadata } from 'next';
import Link from 'next/link';
import { format } from '@web/core/i18n/format';
import { Container } from '@web/ui';
import { LegalNotice } from '@/components/legal-notice';
import { Eyebrow } from '@/components/section-heading';
import { winery } from '@/content/winery';
import { href, type Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';
import { formatDate } from '@/lib/format';
import { pageMetadata, samePath } from '@/seo';
import { LEGAL_PATHS, LEGAL_UPDATED, type LegalPage } from '@/site';

const ORDER: LegalPage[] = ['privacy', 'terms'];

/** Metadata of a legal page: indexable, canonical + hreflang, link preview. */
export function legalMetadata(t: Messages, locale: Locale, page: LegalPage): Metadata {
  const doc = t.policies[page];
  return pageMetadata({ t, locale, paths: samePath(LEGAL_PATHS[page]), title: doc.title, description: doc.description });
}

/**
 * A legal page (privacy policy, terms of use): the text from the dictionaries (`policies.*`), the
 * winery's facts (name, address, phones) filled in from src/content/winery.ts, a table of contents
 * (anchors per section), the alcohol warnings and a link to the other page.
 */
export function LegalDocument({ page, t, locale }: { page: LegalPage; t: Messages; locale: Locale }) {
  const doc = t.policies[page];
  const fill = (text: string) =>
    format(text, {
      name: winery.fullName,
      address: winery.addressLines.join(', '),
      phone: winery.orderPhone.display,
      zalo: winery.zalo.display,
    });

  return (
    <article>
      <header className="border-b border-border bg-surface-2">
        <Container className="max-w-3xl pt-12 pb-10 sm:pt-16">
          <Eyebrow align="left">{winery.name}</Eyebrow>
          <h1 className="mt-4 font-display text-4xl leading-[1.1] font-bold tracking-tight text-balance text-brand-strong sm:text-5xl">{doc.title}</h1>
          <p className="mt-3 text-sm text-muted">
            <time dateTime={LEGAL_UPDATED}>{format(t.policies.updated, { date: formatDate(locale, LEGAL_UPDATED) })}</time>
          </p>
          <p className="mt-5 text-lg leading-relaxed text-pretty text-muted">{fill(doc.intro)}</p>
        </Container>
      </header>

      <Container className="max-w-3xl py-10 sm:py-12">
        <nav aria-labelledby={`${page}-contents`} className="frame-ornate rounded-2xl bg-surface p-5 sm:p-6">
          <h2 id={`${page}-contents`} className="font-display text-lg font-bold text-brand-strong">
            {t.policies.contents}
          </h2>
          <ol className="mt-3 grid list-decimal gap-1.5 pl-5 text-sm sm:grid-cols-2 sm:gap-x-8">
            {doc.sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-muted underline-offset-4 hover:text-brand-strong hover:underline">
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {doc.sections.map((section, index) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`} className="font-display text-2xl font-bold text-brand-strong">
                {index + 1}. {section.title}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-3 leading-relaxed text-pretty">
                  {fill(paragraph)}
                </p>
              ))}
              {section.items.length > 0 && (
                <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed marker:text-brand">
                  {section.items.map((item) => (
                    <li key={item}>{fill(item)}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <LegalNotice className="mt-12" />

        <nav aria-labelledby={`${page}-related`} className="mt-10 border-t border-border pt-8">
          <h2 id={`${page}-related`} className="text-sm font-semibold text-muted">
            {t.policies.related}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {ORDER.filter((other) => other !== page).map((other) => (
              <li key={other}>
                <Link href={href(locale, LEGAL_PATHS[other])} className="font-semibold text-brand-strong underline-offset-4 hover:underline">
                  {t.policies.links[other]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </article>
  );
}
