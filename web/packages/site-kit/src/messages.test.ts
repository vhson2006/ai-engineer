import { describe, expect, it } from 'vitest';
import en from './messages/en.json';
import vi from './messages/vi.json';
import { LOCALE_CODES } from './locales';
import { mergeMessages } from './messages';

// The kit's strings (sites test their own). Every language must have exactly the keys of en.json (the reference), with non-empty strings,
// the same {placeholders}, and arrays of the same kind. Add a new language's file to this map.
const DICTIONARIES: Record<string, unknown> = { en, vi };

type Leaf = { path: string; value: unknown };

function leaves(value: unknown, path = ''): Leaf[] {
  if (Array.isArray(value)) return [{ path: `${path}[]`, value: value.length }, ...value.flatMap((v, i) => leaves(v, `${path}[${i}]`))];
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, v]) => leaves(v, path ? `${path}.${key}` : key));
  }
  return [{ path, value }];
}

/** Keys only: array lengths may differ between languages (a list item, a paragraph). */
function keyShape(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) return value.length > 0 ? keyShape(value[0], `${path}[]`) : [`${path}[]`];
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, v]) => keyShape(v, path ? `${path}.${key}` : key));
  }
  return [path];
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('messages', () => {
  it('has a dictionary for every configured locale', () => {
    expect(Object.keys(DICTIONARIES).sort()).toEqual([...LOCALE_CODES].sort());
  });

  for (const [locale, dictionary] of Object.entries(DICTIONARIES)) {
    it(`${locale}: same keys as en.json`, () => {
      expect([...new Set(keyShape(dictionary))].sort()).toEqual([...new Set(keyShape(en))].sort());
    });

    it(`${locale}: no empty strings`, () => {
      const empty = leaves(dictionary).filter((leaf) => typeof leaf.value === 'string' && leaf.value.trim() === '');
      expect(empty.map((leaf) => leaf.path)).toEqual([]);
    });

    it(`${locale}: same {placeholders} as en.json for each UI string`, () => {
      const reference = new Map(leaves(en).map((leaf) => [leaf.path, leaf.value]));
      for (const leaf of leaves(dictionary)) {
        const english = reference.get(leaf.path);
        if (typeof leaf.value === 'string' && typeof english === 'string') {
          expect(placeholders(leaf.value), leaf.path).toEqual(placeholders(english));
        }
      }
    });
  }
});

describe('mergeMessages', () => {
  const site = {
    meta: { title: 'T', description: 'D', ogImageAlt: 'A' },
    blog: { title: 'B', intro: 'I', metaTitle: 'M', metaDescription: 'MD', latestIntro: 'L', ctaTitle: 'C', ctaText: 'CT' },
    footer: { tagline: 'Tag' },
    hours: {},
    articles: { back: 'Back to the blog' },
  };

  it('keeps the kit’s strings and puts the site’s on top, one level deep', () => {
    const merged = mergeMessages(en, site);
    expect(merged.articles.back).toBe('Back to the blog');
    expect(merged.articles.readMore).toBe(en.articles.readMore);
    expect(merged.footer.tagline).toBe('Tag');
    expect(merged.footer.legal).toBe(en.footer.legal);
  });
});
