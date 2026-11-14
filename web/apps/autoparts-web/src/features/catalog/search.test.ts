import { describe, expect, it } from 'vitest';
import { matchesQuery } from './search';

describe('matchesQuery (the catalogue search)', () => {
  it('ignores accents, case and word order', () => {
    expect(matchesQuery('Má phanh trước (bộ) Sedan và hatchback', 'ma PHANH sedan')).toBe(true);
    expect(matchesQuery('Đĩa phanh trước', 'dia')).toBe(true);
    expect(matchesQuery('Lọc nhớt', 'sedan')).toBe(false);
  });

  it('an empty query matches everything', () => {
    expect(matchesQuery('Ắc quy 12 V', '   ')).toBe(true);
  });
});
