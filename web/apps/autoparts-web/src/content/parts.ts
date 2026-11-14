import type { SiteMessages } from '@/i18n/dictionaries';

/**
 * Part categories and a sample of the catalogue, prices in đồng (FICTIONAL, like the store; the
 * parts carry no brand). Names and what each part fits are in the dictionaries
 * (`categories.items.<id>`, `catalog.items.<id>`).
 */
export type CategoryId = keyof SiteMessages['categories']['items'] & string;
export type PartId = keyof SiteMessages['catalog']['items'] & string;

export const CATEGORIES: CategoryId[] = ['brakes', 'filters', 'oil', 'battery', 'suspension', 'lighting', 'belts', 'cooling'];

export const parts: { id: PartId; category: CategoryId; price: number; inStock: boolean }[] = [
  { id: 'padsFront', category: 'brakes', price: 650_000, inStock: true },
  { id: 'discsFront', category: 'brakes', price: 1_450_000, inStock: true },
  { id: 'oilFilter', category: 'filters', price: 120_000, inStock: true },
  { id: 'airFilter', category: 'filters', price: 220_000, inStock: true },
  { id: 'cabinFilter', category: 'filters', price: 180_000, inStock: true },
  { id: 'oil5w30', category: 'oil', price: 890_000, inStock: true },
  { id: 'battery60', category: 'battery', price: 1_950_000, inStock: true },
  { id: 'shocksFront', category: 'suspension', price: 2_400_000, inStock: false },
  { id: 'ledH4', category: 'lighting', price: 750_000, inStock: true },
  { id: 'timingKit', category: 'belts', price: 1_850_000, inStock: false },
  { id: 'serpentine', category: 'belts', price: 420_000, inStock: true },
  { id: 'coolant', category: 'cooling', price: 280_000, inStock: true },
  { id: 'radiator', category: 'cooling', price: 2_650_000, inStock: false },
];

/** Fitting services, price "from" in đồng. */
export const services: { id: keyof SiteMessages['workshop']['services'] & string; from: number }[] = [
  { id: 'oilChange', from: 150_000 },
  { id: 'brakes', from: 300_000 },
  { id: 'battery', from: 0 },
  { id: 'check', from: 200_000 },
];
