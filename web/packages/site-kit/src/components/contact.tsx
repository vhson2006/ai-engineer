import type { ReactNode } from 'react';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { Container } from '@web/ui';
import { fullAddress, mapEmbedSrc, mapsHref } from '../business';
import type { Locale } from '../locales';
import type { BaseMessages } from '../messages';
import type { Website } from '../website';
import { ContactButtons } from './chrome';
import { SectionHeading } from './section';

/**
 * The contact section of a landing page: how to reach the business (buttons), address, hours,
 * phone and email cards beside a keyless Google Maps embed. `note`: one extra line under the
 * hours (holidays, last order…). `children`: anything the site adds below the cards.
 */
export function ContactSection({
  website,
  t,
  locale,
  eyebrow,
  title,
  text,
  note,
  children,
}: {
  website: Website;
  t: BaseMessages;
  locale: Locale;
  eyebrow: string;
  title: string;
  text: string;
  note?: string;
  children?: ReactNode;
}) {
  const { business } = website;
  return (
    <section id="contact" aria-labelledby="contact-title" className="bg-surface-2 py-16 sm:py-24">
      <Container className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
        <div>
          <div id="contact-title">
            <SectionHeading eyebrow={eyebrow} title={title} intro={text} align="left" />
          </div>
          <div className="mt-8">
            <ContactButtons website={website} t={t} />
          </div>
          <dl className="mt-10 grid gap-4 sm:grid-cols-2">
            <Card icon={<MapPin aria-hidden className="size-5" />} label={t.contact.address}>
              <a href={mapsHref(business)} target="_blank" rel="noopener noreferrer" className="hover:text-brand-strong hover:underline">
                {fullAddress(business)}
              </a>
            </Card>
            {business.hours.length > 0 && (
              <Card icon={<Clock aria-hidden className="size-5" />} label={t.contact.hours}>
                <ul className="space-y-1">
                  {business.hours.map((row) => (
                    <li key={row.key}>
                      <span className="text-muted">{t.hours[row.key]}:</span> {website.hours(locale, row)}
                    </li>
                  ))}
                </ul>
                {note && <p className="mt-2 text-sm text-muted">{note}</p>}
              </Card>
            )}
            <Card icon={<Phone aria-hidden className="size-5" />} label={t.contact.phone}>
              <a href={business.phone.href} className="font-semibold hover:text-brand-strong hover:underline">
                {business.phone.display}
              </a>
            </Card>
            {business.email && (
              <Card icon={<Mail aria-hidden className="size-5" />} label={t.contact.email}>
                <a href={`mailto:${business.email}`} className="[overflow-wrap:anywhere] hover:text-brand-strong hover:underline">
                  {business.email}
                </a>
              </Card>
            )}
          </dl>
          {children}
        </div>
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <iframe
            title={format(t.contact.mapTitle, { name: business.fullName })}
            src={mapEmbedSrc(business, locale)}
            className="aspect-square w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </Container>
    </section>
  );
}

function Card({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <dt className="flex items-center gap-2 text-sm font-bold text-brand-strong">
        <span className="text-accent">{icon}</span>
        {label}
      </dt>
      <dd className="mt-2 leading-relaxed">{children}</dd>
    </div>
  );
}
