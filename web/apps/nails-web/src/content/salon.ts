import type { StaticImageData } from 'next/image';
import type { Messages } from '@/i18n/messages';
import imgButterBlossoms from '../../public/images/gallery/envy-10.jpg';
import imgFloralStiletto from '../../public/images/gallery/envy-12.jpg';
import imgGreenApple from '../../public/images/gallery/envy-11.png';
import imgEmeraldDots from '../../public/images/gallery/envy-1.png';
import imgPeacock from '../../public/images/gallery/envy-2.png';
import imgClassicFrench from '../../public/images/gallery/envy-3.png';
import imgMilkyPink from '../../public/images/gallery/envy-4.jpg';
import imgMintConfetti from '../../public/images/gallery/envy-5.png';
import imgCoralPedicure from '../../public/images/gallery/envy-6.jpg';
import imgMintGoldFoil from '../../public/images/gallery/envy-8.png';
import imgNeonFrench from '../../public/images/gallery/envy-9.jpg';

/**
 * Envy Nails Spa of Wendell (Wendell, NC): facts and prices from the salon's current website
 * (envynailsspaofwendell.com: services, hours, phone, booking link, social links), hard-coded
 * until the salon API exists. Every word a visitor reads is in
 * src/i18n/messages/<lang>.json, keyed by the ids below (TypeScript refuses an id without a
 * translation). When the API lands, these become its response shapes, fetched on the server.
 */

/** A menu price in US dollars; `plus` = "and up" ($59+). */
export type Price = { amount: number; plus?: boolean };
const p = (amount: number, plus = false): Price => ({ amount, plus });

export const salon = {
  name: 'Envy Nails Spa',
  /** Site name in titles and link previews. */
  fullName: 'Envy Nails Spa of Wendell',
  legalName: 'Envy Nails Spa Of Wendell LLC',
  city: 'Wendell, NC',
  /** The one number on the website ("Call us directly"). */
  phones: [{ display: '(919) 366-6435', href: 'tel:+19193666435' }],
  addressLines: ['2241 Treelight Way, Suite 102', 'Wendell, NC 27591'],
  /** The same address, by part (structured data). */
  address: { street: '2241 Treelight Way, Suite 102', city: 'Wendell', region: 'NC', postalCode: '27591' },
  website: { display: 'www.envynailsspaofwendell.com', href: 'https://envynailsspaofwendell.com' },
  mapsHref: 'https://maps.app.goo.gl/8BjU4qGcJAMFvM5S7',
  /** What the embedded Google Map searches for (keyless embed: www.google.com/maps?q=…&output=embed). */
  mapQuery: 'Envy Nails Spa Of Wendell, 2241 Treelight Way Suite 102, Wendell, NC 27591',
  /** The salon's online booking system (third party: opens in a new tab). */
  bookingUrl: 'https://lk.macmarketing.us/envynailsspaofwendell-booking',
  socials: [
    { id: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/envynailsspaofwendellnc' },
    { id: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/envynailsspaofwendell/' },
    { id: 'x', label: 'X (Twitter)', href: 'https://twitter.com/Envy_Nails_' },
    { id: 'yelp', label: 'Yelp', href: 'https://yelp.com/biz/envy-nails-spa-of-wendell-wendell' },
  ],
  currency: 'USD',
  /** The salon's clock (open/closed status on the page). */
  timeZone: 'America/New_York',
  /** Opening hours, 24h "HH:MM" (formatted per language on the page). */
  hours: [
    { id: 'monThu', open: '10:00', close: '19:00' },
    { id: 'fri', open: '09:30', close: '19:00' },
    { id: 'sat', open: '09:30', close: '18:00' },
    { id: 'sun', open: '11:30', close: '17:00' },
  ] as const satisfies readonly { id: keyof Messages['visit']['days']; open: string; close: string }[],
} as const;

/* ── Full menu: tabs of price tables ────────────────────────────── */

type Tables = Messages['menu']['tables'];
export type TableId = keyof Tables;
export type MenuTabId = keyof Messages['menu']['tabs'];
/** One price per column of the table (null = not offered). */
type Row<T extends TableId> = { id: keyof Tables[T]['items']; prices: (Price | null)[] };

export const menuTables: { [T in TableId]: Row<T>[] } = {
  enhancement: [
    { id: 'acrylic', prices: [p(59, true), p(49, true)] },
    { id: 'powderGel', prices: [p(64, true), p(54, true)] },
    { id: 'colorPowder', prices: [p(62, true), p(52, true)] },
    { id: 'builderGel', prices: [p(67, true), p(57, true)] },
    { id: 'gelX', prices: [p(67, true), null] },
    { id: 'biab', prices: [p(54, true), null] },
  ],
  enhancementExtras: [
    { id: 'specialShape', prices: [p(5)] },
    { id: 'extraLength', prices: [p(5, true)] },
    { id: 'ombre', prices: [p(15, true)] },
    { id: 'french', prices: [p(7, true)] },
    { id: 'deepFrench', prices: [p(15, true)] },
  ],
  dip: [
    { id: 'dippingPowder', prices: [p(49, true)] },
    { id: 'french', prices: [p(10)] },
    { id: 'dipFrench', prices: [p(15, true)] },
    { id: 'ombre', prices: [p(15, true)] },
    { id: 'withTips', prices: [p(5, true)] },
    { id: 'specialShape', prices: [p(5, true)] },
    { id: 'takeOffRedo', prices: [p(5)] },
    { id: 'takeOffOnly', prices: [p(10, true)] },
  ],
  manicure: [
    { id: 'classic', prices: [p(27), p(42)] },
    { id: 'signature', prices: [p(37), p(52)] },
    { id: 'candle', prices: [p(47), p(62)] },
    { id: 'nailCut', prices: [p(12, true), null] },
  ],
  pedicure: [
    { id: 'basic', prices: [p(39)] },
    { id: 'signature', prices: [p(45)] },
    { id: 'candle', prices: [p(56)] },
    { id: 'luxury', prices: [p(65)] },
    { id: 'golden', prices: [p(76)] },
    { id: 'diamond', prices: [p(85)] },
    { id: 'royal', prices: [p(99)] },
  ],
  polishChange: [
    { id: 'regular', prices: [p(16), p(19)] },
    { id: 'gel', prices: [p(29), p(31)] },
    { id: 'regularFrench', prices: [p(23), p(26)] },
    { id: 'gelFrench', prices: [p(36), p(38)] },
    { id: 'onArtificial', prices: [p(37), null] },
    { id: 'takeOffGel', prices: [p(5), null] },
  ],
  // In the website's order.
  extras: [
    { id: 'gelOnArtificial', prices: [p(15)] },
    { id: 'extraLength', prices: [p(5, true)] },
    { id: 'specialShape', prices: [p(5, true)] },
    { id: 'frenchAmerican', prices: [p(7, true)] },
    { id: 'colorTips', prices: [p(7, true)] },
    { id: 'threeColors', prices: [p(5)] },
    { id: 'ombre', prices: [p(15, true)] },
    { id: 'miniManicure', prices: [p(7, true)] },
    { id: 'paraffin', prices: [p(10)] },
    { id: 'hotStone', prices: [p(10)] },
    { id: 'design', prices: [p(6, true)] },
    { id: 'buffShine', prices: [p(5, true)] },
    { id: 'catEye', prices: [p(10, true)] },
    { id: 'chrome', prices: [p(15, true)] },
    { id: 'takeOffArtificial', prices: [p(15, true)] },
    { id: 'takeOffRedo', prices: [p(5, true)] },
    { id: 'takeOffGelDip', prices: [p(10, true)] },
    { id: 'toenailsCut', prices: [p(15)] },
    { id: 'massage', prices: [p(15)] },
    { id: 'deepFrench', prices: [p(15, true)] },
  ],
  kids: [
    { id: 'manicure', prices: [p(12), p(22)] },
    { id: 'pedicure', prices: [p(27), p(37)] },
    { id: 'combo', prices: [p(37), p(57)] },
    { id: 'polishChange', prices: [p(10), p(20)] },
    { id: 'pediPolish', prices: [p(35), p(55)] },
  ],
  waxing: [
    { id: 'eyebrows', prices: [p(14)] },
    { id: 'upperLip', prices: [p(10)] },
    { id: 'eyebrowTint', prices: [p(30)] },
    { id: 'chin', prices: [p(15, true)] },
    { id: 'neck', prices: [p(20, true)] },
    { id: 'sideburns', prices: [p(20, true)] },
    { id: 'fullFace', prices: [p(45, true)] },
    { id: 'fullArms', prices: [p(55, true)] },
    { id: 'halfArms', prices: [p(40, true)] },
    { id: 'underarms', prices: [p(25, true)] },
    { id: 'fullLegs', prices: [p(65, true)] },
    { id: 'halfLegs', prices: [p(45, true)] },
    { id: 'bikini', prices: [p(40, true)] },
    { id: 'back', prices: [p(65, true)] },
  ],
};


/** The pastel of a bento card (a token of globals.css). */
export type Tint = 'mint' | 'rose' | 'baby' | 'lilac';

/** The menu, one card per printed menu page. `bookable` = offered in the booking dialog (its first table). */
export const menuTabs: { id: MenuTabId; tables: TableId[]; tint: Tint; bookable: boolean }[] = [
  { id: 'enhancement', tables: ['enhancement', 'enhancementExtras'], tint: 'baby', bookable: true },
  { id: 'dip', tables: ['dip'], tint: 'rose', bookable: true },
  { id: 'manicure', tables: ['manicure'], tint: 'mint', bookable: true },
  { id: 'pedicure', tables: ['pedicure'], tint: 'lilac', bookable: true },
  { id: 'polishChange', tables: ['polishChange'], tint: 'rose', bookable: true },
  { id: 'extras', tables: ['extras'], tint: 'mint', bookable: false },
  { id: 'kids', tables: ['kids'], tint: 'baby', bookable: true },
  { id: 'waxing', tables: ['waxing'], tint: 'lilac', bookable: true },
];

/** The lowest price of a menu page ("From $10"). */
export function fromPrice(tab: { tables: readonly TableId[] }): Price {
  const amounts = tab.tables.flatMap((id) => (menuTables[id] as { prices: (Price | null)[] }[]).flatMap((row) => row.prices));
  return p(Math.min(...amounts.filter((price): price is Price => price !== null).map((price) => price.amount)));
}

/** A line of the menu: table, row, price column (default the first). */
export type MenuRef = { table: TableId; row: string; column?: number };

/** The price of a menu line (undefined if the line or column doesn't exist: tests check every ref). */
export function priceOf(ref: MenuRef): Price | undefined {
  const rows = menuTables[ref.table] as { id: string; prices: (Price | null)[] }[];
  return rows.find((row) => row.id === ref.row)?.prices[ref.column ?? 0] ?? undefined;
}

/** Sum of menu lines; "+" if any of them is a starting price. */
export function sumPrices(prices: Price[]): Price {
  return p(
    prices.reduce((total, price) => total + price.amount, 0),
    prices.some((price) => price.plus),
  );
}

/* ── Gallery: the photos of the salon's website, priced from the real menu ── */

export type NailPattern = 'solid' | 'french' | 'chrome' | 'dots' | 'ombre' | 'flower' | 'line' | 'aura';
export type GalleryId = keyof Messages['gallery']['items'];
export type GalleryCategory = keyof Messages['gallery']['categories'];

const gelManicure: MenuRef = { table: 'manicure', row: 'classic', column: 1 };
const design: MenuRef = { table: 'extras', row: 'design' };

/**
 * The photos come from the salon's current website (most look like licensed stock photos: confirm
 * the rights before going live, or replace them with the salon's own work). They are shown as
 * looks to ask for, never as "our work". Each look = a base service + an add-on from the menu
 * (the modal shows both and their sum), an ESTIMATED time range in minutes (shown as "about"; the
 * menu has no durations) and its main colors (hex; names in the dictionaries, same order).
 */
export const gallery: {
  id: GalleryId;
  category: GalleryCategory;
  tint: Tint;
  photo: StaticImageData;
  palette: string[];
  minutes: [number, number];
  base: MenuRef;
  addOn?: MenuRef;
  /** The booking dialog group this look is booked under. */
  group: MenuTabId;
}[] = [
  { id: 'floralStiletto', category: 'gems', tint: 'baby', photo: imgFloralStiletto, palette: ['#9cb8e8', '#f08a2c', '#f4f1f7'], minutes: [120, 150], base: { table: 'enhancement', row: 'acrylic' }, addOn: design, group: 'enhancement' },
  { id: 'mintGoldFoil', category: 'art', tint: 'lilac', photo: imgMintGoldFoil, palette: ['#a8e3d6', '#c99a35'], minutes: [55, 70], base: gelManicure, addOn: design, group: 'manicure' },
  { id: 'classicFrench', category: 'french', tint: 'rose', photo: imgClassicFrench, palette: ['#f3d9d0', '#ffffff'], minutes: [50, 65], base: gelManicure, addOn: { table: 'extras', row: 'frenchAmerican' }, group: 'manicure' },
  { id: 'peacock', category: 'gems', tint: 'mint', photo: imgPeacock, palette: ['#c9f5c4', '#1d3b2a', '#2f7fbf'], minutes: [75, 90], base: gelManicure, addOn: design, group: 'manicure' },
  { id: 'milkyPink', category: 'minimal', tint: 'lilac', photo: imgMilkyPink, palette: ['#ead7dc', '#f6eef0'], minutes: [45, 60], base: gelManicure, group: 'manicure' },
  { id: 'butterBlossoms', category: 'art', tint: 'baby', photo: imgButterBlossoms, palette: ['#fbe9a6', '#c94a4a', '#5b7ea8'], minutes: [60, 75], base: gelManicure, addOn: design, group: 'manicure' },
  { id: 'emeraldDots', category: 'gems', tint: 'mint', photo: imgEmeraldDots, palette: ['#ffffff', '#2e9d6a', '#d9dde3'], minutes: [60, 75], base: gelManicure, addOn: design, group: 'manicure' },
  { id: 'neonFrench', category: 'french', tint: 'baby', photo: imgNeonFrench, palette: ['#f6d6d0', '#8be22b', '#ffffff'], minutes: [55, 70], base: gelManicure, addOn: { table: 'extras', row: 'colorTips' }, group: 'manicure' },
  { id: 'mintConfetti', category: 'art', tint: 'rose', photo: imgMintConfetti, palette: ['#cdeee6', '#8a5cc7', '#f2c94c'], minutes: [60, 75], base: gelManicure, addOn: design, group: 'manicure' },
  { id: 'coralPedicure', category: 'minimal', tint: 'rose', photo: imgCoralPedicure, palette: ['#e8435a'], minutes: [45, 60], base: { table: 'pedicure', row: 'signature' }, group: 'pedicure' },
  { id: 'greenApple', category: 'art', tint: 'lilac', photo: imgGreenApple, palette: ['#ffffff', '#5cbf2a'], minutes: [50, 65], base: gelManicure, addOn: design, group: 'manicure' },
];

/* ── Specialties ("Meet the artists"): techniques from the menu, no names until the salon sends them ── */

export type SpecialtyId = keyof Messages['artists']['items'];
export const specialties: { id: SpecialtyId; tint: Tint; pattern: NailPattern; prices: MenuRef[]; group: MenuTabId }[] = [
  { id: 'handPainted', tint: 'rose', pattern: 'flower', prices: [{ table: 'extras', row: 'design' }, { table: 'extras', row: 'threeColors' }], group: 'manicure' },
  { id: 'sculpt', tint: 'baby', pattern: 'french', prices: [{ table: 'enhancement', row: 'gelX' }, { table: 'enhancement', row: 'builderGel' }, { table: 'enhancement', row: 'biab' }], group: 'enhancement' },
  { id: 'effects', tint: 'lilac', pattern: 'aura', prices: [{ table: 'extras', row: 'ombre' }, { table: 'extras', row: 'chrome' }, { table: 'extras', row: 'catEye' }], group: 'manicure' },
];
