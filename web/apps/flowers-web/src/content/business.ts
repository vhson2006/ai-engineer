import type { Business } from '@web/site-kit/business';

/**
 * Bông Florist: a FICTIONAL flower shop (a sample site, ADR 0042). Name, address, phone, email,
 * hours, bouquets, prices and delivery fees are invented; the phone number and the `.example`
 * email go nowhere. Every visible word is in src/i18n/messages/<lang>.json.
 */
export const business = {
  siteId: 'flowers',
  name: 'Bông',
  fullName: 'Bông Florist',
  sample: true,
  phone: { display: '0900 000 303', href: 'tel:+84900000303' },
  zaloHref: 'https://zalo.me/0900000303',
  email: 'dathoa@bong-florist.example',
  address: { street: '42 Trần Quốc Thảo', ward: 'Phường Xuân Hoà', city: 'TP.HCM', region: 'Thành phố Hồ Chí Minh' },
  mapQuery: 'Trần Quốc Thảo, Phường Xuân Hoà, TP Hồ Chí Minh',
  hours: [
    { key: 'daily', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], open: '07:30', close: '21:00' },
  ],
  schema: { type: 'Florist', priceRange: '₫₫' },
  cookieName: 'flowers_locale',
} satisfies Business;
