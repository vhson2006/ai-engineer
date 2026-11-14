import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('keeps the last of two conflicting utilities', () => {
    expect(cn('p-6', 'p-0')).toBe('p-0');
  });

  it("knows the theme's radius names", () => {
    expect(cn('rounded-lg px-4', 'rounded-button')).toBe('px-4 rounded-button');
    expect(cn('rounded-xl', 'rounded-card')).toBe('rounded-card');
  });
});
