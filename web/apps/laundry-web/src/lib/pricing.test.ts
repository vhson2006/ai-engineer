import { describe, expect, it } from 'vitest';
import { estimate } from './pricing';

describe('estimate (shop price board)', () => {
  it('clothes: one price per load by weight tier, boundaries take the lower tier', () => {
    expect(estimate('clothes', 1.5)).toEqual({ kind: 'flat', amount: 35_000 });
    expect(estimate('clothes', 2)).toEqual({ kind: 'flat', amount: 45_000 });
    expect(estimate('clothes', 3)).toEqual({ kind: 'flat', amount: 45_000 });
    expect(estimate('clothes', 3.5)).toEqual({ kind: 'flat', amount: 55_000 });
    expect(estimate('clothes', 6)).toEqual({ kind: 'flat', amount: 75_000 });
  });

  it('clothes: above 6 kg is priced per kg (6 kg itself is the last flat tier)', () => {
    expect(estimate('clothes', 6.5)).toEqual({ kind: 'perKg', amount: 78_000, perKg: 12_000 });
    expect(estimate('clothes', 7)).toEqual({ kind: 'perKg', amount: 84_000, perKg: 12_000 });
    expect(estimate('clothes', 10)).toEqual({ kind: 'perKg', amount: 120_000, perKg: 12_000 });
  });

  it('bedding: flat under 1 kg, then per kg', () => {
    expect(estimate('bedding', 0.5)).toEqual({ kind: 'flat', amount: 35_000 });
    expect(estimate('bedding', 1)).toEqual({ kind: 'perKg', amount: 25_000, perKg: 25_000 });
    expect(estimate('bedding', 3.5)).toEqual({ kind: 'perKg', amount: 87_500, perKg: 25_000 });
  });

  it('refuses nonsense weights', () => {
    expect(estimate('clothes', 0)).toEqual({ kind: 'ask' });
    expect(estimate('clothes', Number.NaN)).toEqual({ kind: 'ask' });
  });
});
