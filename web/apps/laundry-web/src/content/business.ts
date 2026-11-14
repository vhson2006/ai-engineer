import type { Business } from '@web/site-kit/business';

/**
 * Giặt sấy SFaster: facts from the shop's sign and door posters, hard-coded until the API
 * exists (prices: prices.ts). Every visible word is in src/i18n/messages/<lang>.json. Never add a
 * price, delivery promise or turnaround time the shop hasn't confirmed (see CLAUDE.md).
 */
export const business = {
  siteId: 'laundry',
  name: 'SFaster',
  fullName: 'Giặt sấy SFaster',
  sample: false,
  /** Hotline, also the shop's Zalo (the sign and the opening-hours poster). */
  phone: { display: '0984 763 100', href: 'tel:+84984763100' },
  zaloHref: 'https://zalo.me/0984763100',
  /**
   * The shop (ward name after the 2025 merger). The sign also printed a branch at 40 Cửu Long: it
   * has closed, so it is on no page, and the sign artwork (signboard.jpg) is cropped above it.
   */
  address: { street: '68 Lê Hồng Phong', ward: 'Phường Chợ Quán', city: 'TP.HCM', region: 'Thành phố Hồ Chí Minh' },
  mapQuery: 'Giặt sấy SFaster 68 Lê Hồng Phong Phường Chợ Quán TP Hồ Chí Minh',
  mapZoom: 17,
  /** Opening hours (the owner, 2026-11-12); closed on public holidays (the national calendar). */
  hours: [
    { key: 'weekdays', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], open: '07:00', close: '19:00' },
    { key: 'weekend', days: ['Saturday', 'Sunday'], open: '07:00', close: '17:00' },
  ],
  schema: { type: 'LaundryOrDryCleaner' },
  cookieName: 'laundry_locale',
} satisfies Business;

/** One row of opening hours by key. */
export const hoursOf = (key: 'weekdays' | 'weekend') => business.hours.find((row) => row.key === key)!;
