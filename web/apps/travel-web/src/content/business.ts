import type { Business } from '@web/site-kit/business';

/**
 * Gió Mùa Travel: a FICTIONAL tour operator (a sample site, ADR 0042). Name, address, phone,
 * email, hours, tours and prices are invented; the phone number and the `.example` email go
 * nowhere. Every visible word is in src/i18n/messages/<lang>.json.
 */
export const business = {
  siteId: 'travel',
  name: 'Gió Mùa',
  fullName: 'Gió Mùa Travel',
  sample: true,
  phone: { display: '0900 000 202', href: 'tel:+84900000202' },
  zaloHref: 'https://zalo.me/0900000202',
  email: 'hello@giomua-travel.example',
  address: { street: '25 Bạch Đằng', ward: 'Phường Hải Châu', city: 'Đà Nẵng', region: 'Thành phố Đà Nẵng' },
  mapQuery: 'Bạch Đằng, Phường Hải Châu, Đà Nẵng',
  hours: [
    { key: 'weekdays', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], open: '08:00', close: '20:00' },
    { key: 'sunday', days: ['Sunday'], open: '09:00', close: '17:00' },
  ],
  schema: { type: 'TravelAgency', priceRange: '₫₫' },
  cookieName: 'travel_locale',
} satisfies Business;
