import { describe, expect, it } from 'vitest';
import { SLUG_PATTERN } from './schema';
import { slugify } from './slug';

describe('slugify', () => {
  it.each([
    ['Năm thói quen giúp móng bền lâu', 'nam-thoi-quen-giup-mong-ben-lau'],
    ['Đồ uống & Rượu vang!', 'do-uong-ruou-vang'],
    ['  Hello, World  ', 'hello-world'],
    ['', ''],
  ])('%s → %s', (title, slug) => {
    expect(slugify(title)).toBe(slug);
    if (slug) expect(SLUG_PATTERN.test(slug)).toBe(true);
  });

  it('cuts at the limit without a trailing dash', () => {
    expect(slugify('ab cd', 3)).toBe('ab');
  });
});
