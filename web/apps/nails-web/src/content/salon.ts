import type { Messages } from '@/i18n/messages';

/**
 * Envy Nail Spa (Wendell, NC): facts and prices from the salon's printed menu and business card,
 * hard-coded until the salon API exists. Every word a visitor reads is in
 * src/i18n/messages/<lang>.json, keyed by the ids below (TypeScript refuses an id without a
 * translation). When the API lands, these become its response shapes, fetched on the server.
 */

/** A menu price in US dollars; `plus` = "and up" ($59+). */
export type Price = { amount: number; plus?: boolean };
const p = (amount: number, plus = false): Price => ({ amount, plus });

export const salon = {
  name: 'Envy Nail Spa',
  city: 'Wendell, NC',
  phones: [
    { display: '(919) 623-8649', href: 'tel:+19196238649' },
    { display: '(919) 366-6435', href: 'tel:+19193666435' },
  ],
  addressLines: ['2241 Treelight Way, Suite 102', 'Wendell, NC 27591'],
  website: { display: 'www.envynailsspaofwendell.com', href: 'https://www.envynailsspaofwendell.com' },
  mapsHref: 'https://www.google.com/maps/search/?api=1&query=2241+Treelight+Way+Suite+102+Wendell+NC+27591',
  currency: 'USD',
  /** Opening hours, 24h "HH:MM" (formatted per language on the page). */
  hours: [
    { id: 'monThu', open: '10:00', close: '19:00' },
    { id: 'fri', open: '09:30', close: '19:00' },
    { id: 'sat', open: '09:30', close: '18:00' },
    { id: 'sun', open: '11:30', close: '17:00' },
  ] as const satisfies readonly { id: keyof Messages['visit']['days']; open: string; close: string }[],
} as const;

/* ── Overview cards ─────────────────────────────────────────────── */

export type ServiceIcon = 'gem' | 'droplets' | 'hand' | 'footprints' | 'sparkles' | 'baby';
export const services: { id: keyof Messages['services']['items']; icon: ServiceIcon; from: Price; tab: MenuTabId }[] = [
  { id: 'enhancement', icon: 'gem', from: p(54, true), tab: 'enhancement' },
  { id: 'dip', icon: 'droplets', from: p(49, true), tab: 'dip' },
  { id: 'manicure', icon: 'hand', from: p(27), tab: 'manicure' },
  { id: 'pedicure', icon: 'footprints', from: p(39), tab: 'pedicure' },
  { id: 'waxing', icon: 'sparkles', from: p(10), tab: 'waxing' },
  { id: 'kids', icon: 'baby', from: p(10), tab: 'kids' },
];

/* ── Pedicures and manicures (featured, with what each includes) ── */

export const pedicures: { id: keyof Messages['pedicure']['items']; price: Price; featured?: boolean }[] = [
  { id: 'basic', price: p(39) },
  { id: 'signature', price: p(45) },
  { id: 'candle', price: p(56) },
  { id: 'luxury', price: p(65) },
  { id: 'golden', price: p(76) },
  { id: 'diamond', price: p(85) },
  { id: 'royal', price: p(99), featured: true },
];
export const pedicureAddOns: { id: keyof Messages['pedicure']['addOns']; price: Price }[] = [
  { id: 'paraffin', price: p(10) },
  { id: 'gel', price: p(15) },
];

export const manicures: { id: keyof Messages['manicure']['items']; regular: Price; gel: Price }[] = [
  { id: 'classic', regular: p(27), gel: p(42) },
  { id: 'signature', regular: p(37), gel: p(52) },
  { id: 'candle', regular: p(47), gel: p(62) },
];
export const nailCut: Price = p(12, true);

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
  extras: [
    { id: 'extraLength', prices: [p(5, true)] },
    { id: 'specialShape', prices: [p(5, true)] },
    { id: 'frenchAmerican', prices: [p(7, true)] },
    { id: 'deepFrench', prices: [p(15, true)] },
    { id: 'colorTips', prices: [p(7, true)] },
    { id: 'threeColors', prices: [p(5)] },
    { id: 'ombre', prices: [p(15)] },
    { id: 'miniManicure', prices: [p(7, true)] },
    { id: 'paraffin', prices: [p(10)] },
    { id: 'hotStone', prices: [p(10)] },
    { id: 'design', prices: [p(6, true)] },
    { id: 'buffShine', prices: [p(8, true)] },
    { id: 'catEye', prices: [p(10, true)] },
    { id: 'chrome', prices: [p(15, true)] },
    { id: 'takeOffArtificial', prices: [p(15, true)] },
    { id: 'takeOffRedo', prices: [p(5, true)] },
    { id: 'takeOffGelDip', prices: [p(10, true)] },
    { id: 'repairOne', prices: [p(5, true)] },
    { id: 'toenailsCut', prices: [p(15)] },
    { id: 'massage', prices: [p(15)] },
  ],
  kids: [
    { id: 'manicure', prices: [p(12), p(22)] },
    { id: 'pedicure', prices: [p(27), p(37)] },
    { id: 'combo', prices: [p(37), p(57)] },
    { id: 'polishChange', prices: [p(10), p(20)] },
    { id: 'pediPolish', prices: [p(35), p(55)] },
  ],
  // "Full legs" is left out: its price on the printed menu is unreadable ("$+5+").
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
    { id: 'halfLegs', prices: [p(45, true)] },
    { id: 'bikini', prices: [p(40, true)] },
    { id: 'back', prices: [p(65, true)] },
    { id: 'chest', prices: [p(55, true)] },
  ],
};

export const menuTabs: { id: MenuTabId; tables: TableId[] }[] = [
  { id: 'enhancement', tables: ['enhancement', 'enhancementExtras'] },
  { id: 'dip', tables: ['dip'] },
  { id: 'manicure', tables: ['manicure'] },
  { id: 'pedicure', tables: ['pedicure'] },
  { id: 'polishChange', tables: ['polishChange'] },
  { id: 'extras', tables: ['extras'] },
  { id: 'kids', tables: ['kids'] },
  { id: 'waxing', tables: ['waxing'] },
];

/* ── Nail styles (add-ons), illustrated until more photos arrive ── */

export type NailPattern = 'solid' | 'french' | 'chrome' | 'dots' | 'ombre' | 'flower' | 'line';
export const styles: {
  id: keyof Messages['styles']['items'];
  price: Price;
  pattern: NailPattern;
  base: string;
  accent: string;
  backdrop: string;
}[] = [
  { id: 'french', price: p(7, true), pattern: 'french', base: '#f8ece6', accent: '#ffffff', backdrop: '#eef4ec' },
  { id: 'ombre', price: p(15), pattern: 'ombre', base: '#f3d9d6', accent: '#ffffff', backdrop: '#f7efe6' },
  { id: 'chrome', price: p(15, true), pattern: 'chrome', base: '#cfd8d4', accent: '#ffffff', backdrop: '#e9eef0' },
  { id: 'catEye', price: p(10, true), pattern: 'chrome', base: '#2f5a45', accent: '#b9e3c9', backdrop: '#dfeadb' },
  { id: 'colorTips', price: p(7, true), pattern: 'french', base: '#f8ece6', accent: '#7fb08a', backdrop: '#eef4ec' },
  { id: 'design', price: p(6, true), pattern: 'flower', base: '#dbe7ef', accent: '#a9c9e3', backdrop: '#eef3f7' },
];
