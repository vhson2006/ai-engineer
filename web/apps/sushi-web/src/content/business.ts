import type { Business } from '@web/site-kit/business';

/**
 * Kumo Sushi & Omakase: a FICTIONAL restaurant (a sample site, ADR 0042). Name, address, phone,
 * email, hours and prices are invented; the phone number and the `.example` email go nowhere.
 * Every visible word is in src/i18n/messages/<lang>.json.
 */
export const business = {
  siteId: 'sushi',
  name: 'Kumo',
  fullName: 'Kumo Sushi & Omakase',
  sample: true,
  phone: { display: '0900 000 101', href: 'tel:+84900000101' },
  zaloHref: 'https://zalo.me/0900000101',
  email: 'datban@kumo-sushi.example',
  address: { street: '18 Thái Văn Lung', ward: 'Phường Sài Gòn', city: 'TP.HCM', region: 'Thành phố Hồ Chí Minh' },
  mapQuery: 'Thái Văn Lung, Phường Sài Gòn, TP Hồ Chí Minh',
  // Closed on Mondays.
  hours: [
    { key: 'lunch', days: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], open: '11:30', close: '14:00' },
    { key: 'dinner', days: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], open: '17:30', close: '22:00' },
  ],
  schema: { type: 'Restaurant', priceRange: '₫₫₫', extra: { servesCuisine: 'Japanese', acceptsReservations: 'True' } },
  cookieName: 'sushi_locale',
} satisfies Business;
