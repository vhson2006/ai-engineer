/**
 * Price estimate by weight, from the shop's price board. Pure and client-safe (the estimator
 * runs in the browser; it never changes anything, so no Server Action is involved).
 * The board's tiers: "dưới 2kg", "từ 2kg đến 3kg" … "từ 5kg đến 6kg", "từ 7kg trở lên".
 * A weight on a boundary (3 kg) takes the lower tier; 6–7 kg has no printed price.
 */

export type EstimateKind = 'clothes' | 'bedding';

export type Estimate =
  | { kind: 'flat'; amount: number } // one price per load
  | { kind: 'perKg'; amount: number; perKg: number } // weight × price per kg
  | { kind: 'ask' }; // not on the board: ask the shop

const CLOTHES_TIERS = [
  { upTo: 2, exclusive: true, amount: 35_000 },
  { upTo: 3, exclusive: false, amount: 45_000 },
  { upTo: 4, exclusive: false, amount: 55_000 },
  { upTo: 5, exclusive: false, amount: 65_000 },
  { upTo: 6, exclusive: false, amount: 75_000 },
];

export function estimate(kind: EstimateKind, kg: number): Estimate {
  if (!Number.isFinite(kg) || kg <= 0) return { kind: 'ask' };
  if (kind === 'bedding') {
    return kg < 1 ? { kind: 'flat', amount: 35_000 } : { kind: 'perKg', amount: Math.round(kg * 25_000), perKg: 25_000 };
  }
  for (const tier of CLOTHES_TIERS) {
    if (tier.exclusive ? kg < tier.upTo : kg <= tier.upTo) return { kind: 'flat', amount: tier.amount };
  }
  if (kg >= 7) return { kind: 'perKg', amount: Math.round(kg * 12_000), perKg: 12_000 };
  return { kind: 'ask' };
}
