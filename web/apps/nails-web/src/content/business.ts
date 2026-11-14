import type { Business, Weekday } from '@web/site-kit/business';
import { salon } from './salon';

const DAYS: Record<(typeof salon.hours)[number]['id'], Weekday[]> = {
  monThu: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
  fri: ['Friday'],
  sat: ['Saturday'],
  sun: ['Sunday'],
};

/**
 * Envy Nails Spa of Wendell as the kit's business (ADR 0042): the facts of salon.ts (the one
 * source; the menu, booking and gallery stay there) in the shape the shared pages, SEO and JSON-LD
 * read. A salon in the United States: no Zalo, US address, the salon's own Maps link.
 */
export const business = {
  siteId: 'nails',
  name: salon.name,
  fullName: salon.fullName,
  legalName: salon.legalName,
  sample: false,
  phone: salon.phones[0],
  address: { ...salon.address, country: 'US' },
  mapQuery: salon.mapQuery,
  mapsHref: salon.mapsHref,
  hours: salon.hours.map((row) => ({ key: row.id, days: DAYS[row.id], open: row.open, close: row.close })),
  socials: salon.socials.map((social) => ({ ...social })),
  schema: {
    type: 'NailSalon',
    logo: '/images/logo-envy.png',
    extra: { potentialAction: { '@type': 'ReserveAction', target: salon.bookingUrl } },
  },
  cookieName: 'nails_locale',
} satisfies Business;
