import { editorial } from './01-editorial';
import { longform } from './02-longform';
import { steps } from './03-steps';
import { ranked } from './04-ranked';
import { interview } from './05-interview';
import { compare } from './06-compare';
import { timeline } from './07-timeline';
import { photoEssay } from './08-photo-essay';
import { news } from './09-news';
import { handbook } from './10-handbook';
import type { ArticleTemplate } from './types';

/** The article templates offered to the site's admin, in picker order. */
export const ARTICLE_TEMPLATES: ArticleTemplate[] = [editorial, longform, steps, ranked, interview, compare, timeline, photoEssay, news, handbook];

export function articleTemplate(id: string): ArticleTemplate | undefined {
  return ARTICLE_TEMPLATES.find((template) => template.id === id);
}

export type { ArticleTemplate } from './types';
export { coverSrc } from './types';
