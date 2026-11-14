import type { Business } from '@web/site-kit/business';

/**
 * An Nhiên Spa: a FICTIONAL day spa (a sample site, ADR 0042). Name, address, phone, email,
 * hours, treatments and prices are invented; the phone number and the `.example` email go
 * nowhere. Every visible word is in src/i18n/messages/<lang>.json.
 */
export const business = {
  siteId: 'spa',
  name: 'An Nhiên',
  fullName: 'An Nhiên Spa',
  sample: true,
  phone: { display: '0900 000 606', href: 'tel:+84900000606' },
  zaloHref: 'https://zalo.me/0900000606',
  email: 'lichhen@annhien-spa.example',
  address: { street: '15 Quốc Hương', ward: 'Phường An Khánh', city: 'TP.HCM', region: 'Thành phố Hồ Chí Minh' },
  mapQuery: 'Quốc Hương, Phường An Khánh, TP Hồ Chí Minh',
  hours: [
    { key: 'daily', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], open: '09:00', close: '21:00' },
  ],
  schema: { type: 'DaySpa', priceRange: '₫₫' },
  cookieName: 'spa_locale',
} satisfies Business;
