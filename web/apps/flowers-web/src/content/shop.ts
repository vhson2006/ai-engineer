import type { StaticImageData } from 'next/image';
import type { SiteMessages } from '@/i18n/dictionaries';
import blush from '../../public/images/bouquet-blush.jpg';
import garden from '../../public/images/bouquet-garden.jpg';
import sunny from '../../public/images/bouquet-sunny.jpg';

/**
 * Bouquets, sizes and delivery fees in đồng (FICTIONAL, like the shop). Names and descriptions
 * are in the dictionaries (`collections.items.<id>`, `delivery.zones.<id>`).
 */
export type Size = 's' | 'm' | 'l';
export const SIZES: Size[] = ['s', 'm', 'l'];

export const bouquets: { id: keyof SiteMessages['collections']['items'] & string; image: StaticImageData; prices: Record<Size, number> }[] = [
  { id: 'blush', image: blush, prices: { s: 450_000, m: 650_000, l: 950_000 } },
  { id: 'garden', image: garden, prices: { s: 520_000, m: 750_000, l: 1_050_000 } },
  { id: 'sunny', image: sunny, prices: { s: 390_000, m: 590_000, l: 850_000 } },
];

/** Same-day delivery fees by area; `null`: free. */
export const zones: { id: keyof SiteMessages['delivery']['zones'] & string; fee: number | null }[] = [
  { id: 'central', fee: null },
  { id: 'inner', fee: 30_000 },
  { id: 'outer', fee: 60_000 },
];

/** Same-day orders: before this local time. */
export const SAME_DAY_CUTOFF = '17:00';
