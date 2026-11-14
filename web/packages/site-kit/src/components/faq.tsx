import { Plus } from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { Container } from '@web/ui';
import type { BaseMessages } from '../messages';
import type { Website } from '../website';
import { SectionHeading } from './section';

/**
 * Questions and answers as native <details> (keyboard and screen readers for free, no script).
 * Answers come from the site's dictionaries: never a promise the business hasn't made.
 */
export function Faq({ items, website, t, title }: { items: { q: string; a: string }[]; website: Website; t: BaseMessages; title?: string }) {
  return (
    <section id="faq" aria-labelledby="faq-title" className="py-16 sm:py-24">
      <Container className="max-w-3xl">
        <div id="faq-title">
          <SectionHeading eyebrow={t.faq.eyebrow} title={title ?? t.faq.title} />
        </div>
        <div className="mt-10 divide-y divide-border rounded-card border border-border bg-surface">
          {items.map((item) => (
            <details key={item.q} className="group p-5 sm:p-6">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
                <span>{item.q}</span>
                <Plus aria-hidden className="mt-0.5 size-5 shrink-0 text-accent transition-transform duration-200 group-open:rotate-45" />
              </summary>
              <p className="mt-3 leading-relaxed text-pretty text-muted">{item.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted">{format(t.faq.more, { phone: website.business.phone.display })}</p>
      </Container>
    </section>
  );
}
