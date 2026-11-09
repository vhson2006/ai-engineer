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
  // CONFIRM: the last digit is cut off in the photos ("0984 763 10…"). Also the shop's Zalo.
  phone: { display: '0984 763 100', href: 'tel:+84984763100' },
  zaloHref: 'https://zalo.me/0984763100',
  // CONFIRM: street read from the awning ("68 Lê Hồng Ph…"); ward, district and city unknown.
  addressLines: ['68 Lê Hồng Phong'],
  mapsHref: 'https://www.google.com/maps/search/?api=1&query=Gi%E1%BA%B7t+s%E1%BA%A5y+SFaster+68+L%C3%AA+H%E1%BB%93ng+Phong',
  /** Every day, except public holidays (Lễ, Tết). */
  hours: { open: '07:00', close: '19:00' },
  loyalty: { paid: 7, free: 1 },
} as const;

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
    { id: 'from7', price: 12_000, unit: 'kg' },
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

/** Service cards (overview): icon + the lowest price of the service. */
export type ServiceIcon = 'shirt' | 'bed' | 'sparkles' | 'footprints' | 'teddy' | 'layers' | 'hardHat' | 'hand' | 'iron';
export const services: { id: keyof Messages['services']['items']; icon: ServiceIcon; from: number; unit: Unit }[] = [
  { id: 'clothes', icon: 'shirt', from: 35_000, unit: 'load' },
  { id: 'bedding', icon: 'bed', from: 25_000, unit: 'kg' },
  { id: 'dryClean', icon: 'sparkles', from: 50_000, unit: 'piece' },
  { id: 'shoes', icon: 'footprints', from: 75_000, unit: 'pair' },
  { id: 'plush', icon: 'teddy', from: 25_000, unit: 'halfKilo' },
  { id: 'topper', icon: 'layers', from: 35_000, unit: 'kg' },
  { id: 'helmet', icon: 'hardHat', from: 35_000, unit: 'piece' },
  { id: 'handWash', icon: 'hand', from: 30_000, unit: 'piece' },
  { id: 'ironing', icon: 'iron', from: 20_000, unit: 'piece' },
];
