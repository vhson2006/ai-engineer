import type { SiteMessages } from '@/i18n/dictionaries';

/**
 * The menu's prices, in đồng (FICTIONAL, like the restaurant). Names and descriptions are in
 * the dictionaries (`food.<group>.items.<id>`), so a dish exists in both languages or not at all.
 */
type Group = 'nigiri' | 'rolls' | 'drinks';
type ItemId<G extends Group> = keyof SiteMessages['food'][G]['items'] & string;

export const omakase: { id: keyof SiteMessages['food']['omakase']['items'] & string; price: number; courses: number; signature?: boolean }[] = [
  { id: 'hana', price: 1_290_000, courses: 12 },
  { id: 'kumo', price: 1_890_000, courses: 16, signature: true },
  { id: 'counter', price: 2_490_000, courses: 20 },
];

export const menu: { [G in Group]: { id: ItemId<G>; price: number }[] } = {
  nigiri: [
    { id: 'sake', price: 120_000 },
    { id: 'hamachi', price: 150_000 },
    { id: 'maguro', price: 160_000 },
    { id: 'ebi', price: 110_000 },
    { id: 'unagi', price: 170_000 },
    { id: 'otoro', price: 320_000 },
  ],
  rolls: [
    { id: 'california', price: 160_000 },
    { id: 'spicyTuna', price: 190_000 },
    { id: 'dragon', price: 240_000 },
    { id: 'kumo', price: 260_000 },
  ],
  drinks: [
    { id: 'junmai', price: 290_000 },
    { id: 'umeshu', price: 150_000 },
    { id: 'matcha', price: 70_000 },
    { id: 'yuzu', price: 85_000 },
  ],
};

export const menuGroups: Group[] = ['nigiri', 'rolls', 'drinks'];
