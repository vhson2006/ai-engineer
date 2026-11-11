/**
 * An article template the admin picks before writing: a ready layout (HTML in the layout
 * vocabulary, features/article-templates/article-html.ts) filled with SAMPLE text. Everything in
 * [square brackets] is to be replaced; no fact about the company is invented, and no text makes a
 * health claim (alcohol rules, CLAUDE.md).
 */
export type ArticleTemplate = {
  id: string;
  /** Short name shown in the template picker. */
  name: string;
  /** What the layout does, in one sentence. */
  description: string;
  /** The kind of article it suits. */
  bestFor: string;
  /** The layout pieces it uses (shown as chips). */
  blocks: string[];
  title: string;
  excerpt: string;
  /** Aspect ratio of the grey cover placeholder. */
  cover: PlaceholderRatio;
  readingMinutes: number;
  html: string;
};

export type PlaceholderRatio = '21x9' | '16x9' | '3x2' | '4x3' | '1x1' | '3x4';

/** A grey placeholder image (public/images/placeholder): replaced by a real photo in the editor. */
export const img = (ratio: PlaceholderRatio, alt: string) => `<img src="/images/placeholder/${ratio}.svg" alt="${alt}" loading="lazy" />`;

export const coverSrc = (ratio: PlaceholderRatio) => `/images/placeholder/${ratio}.svg`;
