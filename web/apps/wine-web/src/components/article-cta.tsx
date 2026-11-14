import { ContactButtons } from '@web/site-kit/components/chrome';
import type { Messages } from '@/i18n/dictionaries';
import { website } from '@/website';
import { LegalNotice } from './legal-notice';

/** Under an article: a call to buy, so the alcohol notices sit right next to it. */
export function ArticleCta({ t }: { t: Messages }) {
  return (
    <aside className="lattice mt-12 rounded-card bg-brand p-8 text-white sm:p-10">
      <p className="display text-2xl text-yellow">{t.blog.ctaTitle}</p>
      <p className="mt-2 text-white/85">{t.blog.ctaText}</p>
      <div className="mt-6">
        <ContactButtons website={website} t={t} tone="light" />
      </div>
      <LegalNotice t={t} tone="light" className="mt-6" />
    </aside>
  );
}
