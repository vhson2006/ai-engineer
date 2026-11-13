import type { Metadata } from 'next';
import Link from 'next/link';
import { format } from '@web/core/i18n/format';
import { Container } from '@web/ui';
import { Eyebrow } from '@/components/section-heading';
import { salon } from '@/content/salon';
import { href, type Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';
import { formatDate } from '@/lib/format';
import { pageMetadata, samePath } from '@/seo';
import { LEGAL_EFFECTIVE, LEGAL_PATHS, type LegalPage } from '@/site';

const ORDER: LegalPage[] = ['privacy', 'terms'];

/** Metadata of a legal page: indexable, canonical + hreflang, link preview. */
export function legalMetadata(t: Messages, locale: Locale, page: LegalPage): Metadata {
  const doc = t.legal[page];
  return pageMetadata({ t, locale, paths: samePath(LEGAL_PATHS[page]), title: doc.title, description: doc.description });
}

/**
 * A legal page (privacy policy, terms of service): the salon's own text (envynailsspaofwendell.com,
 * in the dictionaries), its facts (name, address, phone) filled in from src/content/salon.ts, the
 * effective date of the salon's document, a table of contents and a link to the other page.
 */
export function LegalDocument({ page, t, locale }: { page: LegalPage; t: Messages; locale: Locale }) {
  const doc = t.legal[page];
  const fill = (text: string) =>
    format(text, { name: salon.legalName, address: salon.addressLines.join(', '), phone: salon.phones[0].display });

  return (
    <article>
      <header className="bg-wash-lilac">
        <Container className="max-w-3xl pt-12 pb-10 sm:pt-16">
          <Eyebrow dot="bg-lilac-strong" className="bg-surface">
            {salon.legalName}
          </Eyebrow>
          <h1 className="mt-5 text-4xl leading-[1.04] font-extrabold tracking-[-0.035em] text-balance sm:text-5xl">{doc.title}</h1>
          <p className="mt-3 text-sm text-muted">
            <time dateTime={LEGAL_EFFECTIVE[page]}>{format(t.legal.effective, { date: formatDate(locale, LEGAL_EFFECTIVE[page]) })}</time>
          </p>
          <p className="mt-5 text-lg leading-relaxed text-pretty text-muted">{fill(doc.intro)}</p>
        </Container>
      </header>

      <Container className="max-w-3xl py-10 sm:py-12">
        <nav aria-labelledby={`${page}-contents`} className="rounded-3xl bg-surface-2 p-6">
          <h2 id={`${page}-contents`} className="text-lg font-extrabold">
            {t.legal.contents}
          </h2>
          <ol className="mt-3 grid list-decimal gap-1.5 pl-5 text-sm sm:grid-cols-2 sm:gap-x-8">
            {doc.sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-muted underline-offset-4 hover:text-fg hover:underline">
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {doc.sections.map((section, index) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`} className="text-2xl font-extrabold tracking-[-0.02em]">
                {index + 1}. {section.title}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-3 leading-relaxed text-pretty">
                  {fill(paragraph)}
                </p>
              ))}
              {section.items.length > 0 && (
                <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed marker:text-rose-strong">
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
                <Link href={href(locale, LEGAL_PATHS[other])} className="font-semibold underline-offset-4 hover:underline">
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
