import type { Business } from '@web/site-kit/business';

/**
 * Lantern House Hội An: a FICTIONAL boutique hotel (a sample site, ADR 0042). Name, address,
 * phone, email, rooms, prices and policies are invented; the phone number and the `.example`
 * email go nowhere. Every visible word is in src/i18n/messages/<lang>.json.
 */
export const business = {
  siteId: 'hotel',
  name: 'Lantern House',
  fullName: 'Lantern House Hội An',
  sample: true,
  phone: { display: '0900 000 505', href: 'tel:+84900000505' },
  zaloHref: 'https://zalo.me/0900000505',
  email: 'stay@lanternhouse.example',
  address: { street: '45 Phan Bội Châu', ward: 'Phường Hội An', city: 'Đà Nẵng', region: 'Thành phố Đà Nẵng' },
  mapQuery: 'Phan Bội Châu, Hội An, Đà Nẵng',
  // Reception never closes.
  hours: [
    { key: 'reception', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], open: '00:00', close: '23:59' },
  ],
  schema: { type: 'Hotel', priceRange: '₫₫', extra: { checkinTime: '14:00', checkoutTime: '12:00', petsAllowed: false } },
  cookieName: 'hotel_locale',
} satisfies Business;

/** Check-in from, check-out until (local time). */
export const CHECK_IN = '14:00';
export const CHECK_OUT = '12:00';
