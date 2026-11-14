import type { Messages } from '@/i18n/dictionaries';

/**
 * Giặt sấy SFaster's prices, from the shop's price board and door posters (facts:
 * business.ts). Never add a price the shop hasn't confirmed (see CLAUDE.md).
 */

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
