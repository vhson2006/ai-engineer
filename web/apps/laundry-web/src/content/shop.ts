import type { Messages } from '@/i18n/messages';

/**
 * Giặt sấy SFaster: facts and prices from the shop's sign, price board and door posters,
 * hard-coded until the API exists. Every visible word is in src/i18n/messages/<lang>.json, keyed
 * by the ids below. Never add a price, delivery promise or turnaround time the shop hasn't
 * confirmed (see CLAUDE.md).
 */

export const shop = {
  name: 'SFaster',
  fullName: 'Giặt sấy SFaster',
  /** Hotline, also the shop's Zalo (the sign and the opening-hours poster). */
  phone: { display: '0984 763 100', href: 'tel:+84984763100' },
  zaloHref: 'https://zalo.me/0984763100',
  /**
   * The shop (ward name after the 2025 merger). The sign also printed a branch at 40 Cửu Long: it
   * has closed, so it is on no page, and the sign artwork (signboard.jpg) is cropped above it.
   */
  address: { street: '68 Lê Hồng Phong', ward: 'Phường Chợ Quán', city: 'TP.HCM' },
  /** Opening hours (the owner, 2026-11-12); closed on public holidays (the national calendar). */
  hours: {
    weekdays: { open: '07:00', close: '19:00' }, // Monday to Friday
    weekend: { open: '07:00', close: '17:00' }, // Saturday and Sunday
  },
} as const;

/** One line: "68 Lê Hồng Phong, Phường Chợ Quán, TP.HCM". */
export const fullAddress = `${shop.address.street}, ${shop.address.ward}, ${shop.address.city}`;

/** What Google Maps searches for: the shop's name and address. */
const mapQuery = `Giặt sấy SFaster ${shop.address.street} ${shop.address.ward} TP Hồ Chí Minh`;

/** Google Maps search for the shop (opens the app on phones). */
export const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

/** The keyless Google Maps embed (www.google.com, allowed in src/proxy.ts frameOrigins). */
export const mapEmbedSrc = (locale: string) =>
  `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&hl=${locale}&z=17&output=embed`;

/** Price per unit, in đồng. */
export type Unit = 'load' | 'kg' | 'set' | 'piece' | 'halfKilo' | 'pair';
export interface PriceRow<Id extends string> {
  id: Id;
  price: number;
  unit: Unit;
}

type Table = keyof Messages['prices']['tables'];
type RowId<T extends Table> = keyof Messages['prices']['tables'][T]['items'] & string;

export const priceTables: { [T in Table]: PriceRow<RowId<T>>[] } = {
  clothes: [
    { id: 'under2', price: 35_000, unit: 'load' },
    { id: 'from2to3', price: 45_000, unit: 'load' },
    { id: 'from3to4', price: 55_000, unit: 'load' },
    { id: 'from4to5', price: 65_000, unit: 'load' },
    { id: 'from5to6', price: 75_000, unit: 'load' },
    { id: 'from6', price: 12_000, unit: 'kg' },
  ],
  bedding: [
    { id: 'under1', price: 35_000, unit: 'load' },
    { id: 'from1', price: 25_000, unit: 'kg' },
  ],
  dryClean: [
    { id: 'suit', price: 120_000, unit: 'set' },
    { id: 'dress', price: 100_000, unit: 'piece' },
    { id: 'delicate', price: 80_000, unit: 'piece' },
    { id: 'everyday', price: 50_000, unit: 'piece' },
  ],
  // The door poster says 70K for shoes; the printed price board (newer) says 75K.
  extras: [
    { id: 'plush', price: 25_000, unit: 'halfKilo' },
    { id: 'topper', price: 35_000, unit: 'kg' },
    { id: 'shoes', price: 75_000, unit: 'pair' },
    { id: 'handWash', price: 30_000, unit: 'piece' },
    { id: 'ironing', price: 20_000, unit: 'piece' },
    { id: 'helmet', price: 35_000, unit: 'piece' },
  ],
};

export const priceTableOrder: Table[] = ['clothes', 'bedding', 'dryClean', 'extras'];
