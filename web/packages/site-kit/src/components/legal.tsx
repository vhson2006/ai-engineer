import Link from 'next/link';
import type { ReactNode } from 'react';
import { format } from '@web/core/i18n/format';
import { Container } from '@web/ui';
import { fullAddress } from '../business';
import { href, type Locale } from '../locales';
import type { BaseMessages } from '../messages';
import type { LegalPage, Website } from '../website';
import { Eyebrow } from './section';

/**
 * A legal page (privacy policy, terms of use, data deletion instructions): the text with the
 * business's facts filled in (`{name}`, `{address}`, `{phone}`, `{email}`, `{cookie}`, and the
 * site's own `facts`), a table of contents and links to the other legal pages. The kit's texts
 * describe only what these sites do (no accounts, no forms, one cookie, Google Maps and YouTube
 * embeds); a site that does more has its own texts (`legal.*` in its dictionaries) and date
 * (`legalUpdated`). `children`: what the site adds at the end (mandatory notices…).
 */
export function LegalDocument({
  page,
  website,
  t,
  locale,
  facts,
  children,
}: {
  page: LegalPage;
  website: Website;
  t: BaseMessages;
  locale: Locale;
  facts?: Record<string, string>;
  children?: ReactNode;
}) {
  const { business } = website;
  const doc = t.legal[page];
  if (!doc) throw new Error(`No text for the ${page} page`);
  const fill = (text: string) =>
    format(text, {
      name: business.fullName,
      address: fullAddress(business),
      phone: business.phone.display,
      email: business.email ?? '',
      cookie: business.cookieName,
      ...facts,
    });

  return (
    <article>
      <header className="border-b border-border bg-surface-2">
        <Container className="max-w-3xl pt-14 pb-10 sm:pt-20">
          <Eyebrow>{business.fullName}</Eyebrow>
          <h1 className="display mt-4 text-4xl leading-[1.1] text-balance text-brand-strong sm:text-5xl">{doc.title}</h1>
          <p className="mt-3 text-sm text-muted">
            <time dateTime={website.legalUpdated(page)}>{format(t.legal.updated, { date: website.date(locale, website.legalUpdated(page)) })}</time>
          </p>
          <p className="mt-5 text-lg leading-relaxed text-muted">{fill(doc.intro)}</p>
        </Container>
      </header>

      <Container className="max-w-3xl py-12 sm:py-14">
        <nav aria-labelledby={`${page}-contents`} className="rounded-card border border-border bg-surface p-5 sm:p-6">
          <h2 id={`${page}-contents`} className="display text-lg text-brand-strong">
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
              <h2 id={`${section.id}-title`} className="display text-2xl text-brand-strong">
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

        {children}

        <nav aria-labelledby={`${page}-related`} className="mt-14 border-t border-border pt-8">
          <h2 id={`${page}-related`} className="text-sm font-semibold text-muted">
            {t.legal.related}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {website.legalPages
              .filter((other) => other !== page)
              .map((other) => (
                <li key={other}>
                  <Link href={href(locale, website.legalPath(other))} className="font-semibold text-brand-strong underline-offset-4 hover:underline">
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
