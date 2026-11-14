import type { Business } from '@web/site-kit/business';

/**
 * Pitlane Auto Parts: a FICTIONAL parts store and fitting workshop (a sample site, ADR 0042).
 * Name, address, phone, email, hours, parts and prices are invented; the phone number and the
 * `.example` email go nowhere. Every visible word is in src/i18n/messages/<lang>.json.
 */
export const business = {
  siteId: 'autoparts',
  name: 'Pitlane',
  fullName: 'Pitlane Auto Parts',
  sample: true,
  phone: { display: '0900 000 404', href: 'tel:+84900000404' },
  zaloHref: 'https://zalo.me/0900000404',
  email: 'banhang@pitlane-parts.example',
  address: { street: '210 Lý Thường Kiệt', ward: 'Phường Diên Hồng', city: 'TP.HCM', region: 'Thành phố Hồ Chí Minh' },
  mapQuery: 'Lý Thường Kiệt, Phường Diên Hồng, TP Hồ Chí Minh',
  hours: [
    { key: 'weekdays', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], open: '07:30', close: '18:30' },
    { key: 'sunday', days: ['Sunday'], open: '08:00', close: '12:00' },
  ],
  schema: { type: 'AutoPartsStore', priceRange: '₫₫' },
  cookieName: 'autoparts_locale',
} satisfies Business;
