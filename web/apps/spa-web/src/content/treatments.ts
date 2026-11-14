import type { SiteMessages } from '@/i18n/dictionaries';

/**
 * Treatments and packages: minutes and prices in đồng (FICTIONAL, like the spa). Names and
 * descriptions are in the dictionaries (`treatments.<group>.items.<id>`, `packages.items.<id>`).
 */
type Group = 'massage' | 'facial' | 'body';
type ItemId<G extends Group> = keyof SiteMessages['treatments'][G]['items'] & string;
export type Option = { minutes: number; price: number };

export const treatmentGroups: Group[] = ['massage', 'facial', 'body'];

export const treatments: { [G in Group]: { id: ItemId<G>; options: Option[] }[] } = {
  massage: [
    { id: 'signature', options: [{ minutes: 60, price: 450_000 }, { minutes: 90, price: 620_000 }] },
    { id: 'hotStone', options: [{ minutes: 90, price: 750_000 }] },
    { id: 'foot', options: [{ minutes: 45, price: 280_000 }, { minutes: 60, price: 350_000 }] },
  ],
  facial: [
    { id: 'hydrating', options: [{ minutes: 60, price: 520_000 }] },
    { id: 'herbal', options: [{ minutes: 75, price: 580_000 }] },
  ],
  body: [
    { id: 'scrub', options: [{ minutes: 45, price: 390_000 }] },
    { id: 'herbalBath', options: [{ minutes: 30, price: 250_000 }] },
  ],
};

export const packages: { id: keyof SiteMessages['packages']['items'] & string; minutes: number; price: number; signature?: boolean }[] = [
  { id: 'pause', minutes: 60, price: 490_000 },
  { id: 'renew', minutes: 180, price: 1_290_000, signature: true },
  { id: 'together', minutes: 120, price: 1_690_000 },
];
