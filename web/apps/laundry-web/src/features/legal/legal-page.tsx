import type { Metadata } from 'next';
import Link from 'next/link';
import { format } from '@web/core/i18n/format';
import { Container } from '@web/ui';
import { Eyebrow } from '@/components/section-heading';
import { fullAddress, shop } from '@/content/shop';
import { href, LOCALES, type Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';
import { pageMetadata, samePath } from '@/seo';
import { LEGAL_PATHS, LEGAL_UPDATED, type LegalPage } from '@/site';

const ORDER: LegalPage[] = ['privacy', 'terms', 'dataDeletion'];

/** Metadata of a legal page: indexable, canonical + hreflang, link preview (social platforms check these URLs). */
export function legalMetadata(t: Messages, locale: Locale, page: LegalPage): Metadata {
  const doc = t.legal[page];
  return pageMetadata({ t, locale, paths: samePath(LEGAL_PATHS[page]), title: doc.title, description: doc.description });
}

/**
 * A legal page (privacy policy, terms of use, data deletion instructions): the text from the
 * dictionaries, the shop's facts (name, address, phone) filled in from src/content/shop.ts, a
 * table of contents (anchors per section) and links to the other legal pages.
 */
export function LegalDocument({ page, t, locale }: { page: LegalPage; t: Messages; locale: Locale }) {
  const doc = t.legal[page];
  const fill = (text: string) => format(text, { name: shop.fullName, address: fullAddress, phone: shop.phone.display });
  const updated = new Intl.DateTimeFormat(LOCALES[locale].intl, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(LEGAL_UPDATED));

  return (
    <article>
      <header className="border-b border-border bg-surface-2">
        <Container className="max-w-3xl pt-14 pb-10 sm:pt-20">
          <Eyebrow>{shop.fullName}</Eyebrow>
          <h1 className="mt-4 font-display text-4xl leading-[1.1] font-extrabold tracking-tight text-balance text-brand-strong sm:text-5xl">
            {doc.title}
          </h1>
          <p className="mt-3 text-sm text-muted">
            <time dateTime={LEGAL_UPDATED}>{format(t.legal.updated, { date: updated })}</time>
          </p>
          <p className="mt-5 text-lg leading-relaxed text-muted">{fill(doc.intro)}</p>
        </Container>
      </header>

      <Container className="max-w-3xl py-12 sm:py-14">
        <nav aria-labelledby={`${page}-contents`} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 id={`${page}-contents`} className="font-display text-lg font-extrabold text-brand-strong">
            {t.legal.contents}
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
              <h2 id={`${section.id}-title`} className="font-display text-2xl font-extrabold text-brand-strong">
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

        <nav aria-labelledby={`${page}-related`} className="mt-14 border-t border-border pt-8">
          <h2 id={`${page}-related`} className="text-sm font-semibold text-muted">
            {t.legal.related}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {ORDER.filter((other) => other !== page).map((other) => (
              <li key={other}>
                <Link href={href(locale, LEGAL_PATHS[other])} className="font-semibold text-brand-strong underline-offset-4 hover:underline">
                  {t.legal.links[other]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </article>
  );
}
