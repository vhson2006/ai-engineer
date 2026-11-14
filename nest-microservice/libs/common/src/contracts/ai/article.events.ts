import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ScriptBrand, ScriptFact } from './script.events';
import { TRANSLATION_FAILURES, type TranslationFailure } from './translation.events';

/*
 * Articles written by AI (ADR 0041), on the EVENTS stream, in two steps the admin sees:
 *
 *   1. requester ── events.article-prompt.requested ──▶ ai-service: a writing brief (prompt) and an
 *      outline from the topic and the idea; the admin edits both, then confirms;
 *   2. requester ── events.article-writing.requested ──▶ ai-service: the article as BLOCKS (the
 *      layout vocabulary of ADR 0033), never HTML: the requester builds and sanitizes the HTML.
 *
 * Answers: `…completed | …failed`. Facts (prices, hours, address, phone) come from the business
 * and must be kept as written; the requester checks the numbers of the answer again.
 */
export const ARTICLE_PROMPT_EVENTS = {
  REQUESTED: 'events.article-prompt.requested',
  COMPLETED: 'events.article-prompt.completed',
  FAILED: 'events.article-prompt.failed',
} as const;

export const ARTICLE_WRITING_EVENTS = {
  REQUESTED: 'events.article-writing.requested',
  COMPLETED: 'events.article-writing.completed',
  FAILED: 'events.article-writing.failed',
} as const;

export const ARTICLE_LENGTHS = ['short', 'medium', 'long'] as const;
export type ArticleLength = (typeof ARTICLE_LENGTHS)[number];
/** Words aimed at per length (told to the model; the article may differ a little). */
export const ARTICLE_LENGTH_WORDS: Record<ArticleLength, number> = {
  short: 500,
  medium: 900,
  long: 1400,
};
export const ARTICLE_MAX_IMAGES = 3;
export const ARTICLE_MAX_OUTLINE = 12;
export const ARTICLE_PROMPT_MAX_LENGTH = 6000;
export const ARTICLE_MAX_BLOCKS = 60;

/**
 * The blocks an AI article is made of (content-service turns each into the editor's HTML):
 * text: `lead`, `paragraph`, `heading` (H2), `subheading` (H3), `list`, `checklist`, `quote`;
 * boxes: `note`, `tip`, `warn` (title + text), `summary` (title + items), `cta` (title + text);
 * groups of items (title + text each): `steps`, `cards`, `faq`; `image` (prompt + alt + caption).
 */
export const ARTICLE_BLOCK_TYPES = [
  'lead',
  'paragraph',
  'heading',
  'subheading',
  'list',
  'checklist',
  'quote',
  'note',
  'tip',
  'warn',
  'summary',
  'cta',
  'steps',
  'cards',
  'faq',
  'image',
] as const;
export type ArticleBlockType = (typeof ARTICLE_BLOCK_TYPES)[number];

/**
 * How many items each block with items may have, so it fits the editor's layout (ADR 0033,
 * `@web/ui/article-layout.css`): cards sit three per row, so 3 or 6 (a 4th would sit alone on a
 * new row). The AI is told these numbers and ai-service enforces them on its answer.
 */
export const ARTICLE_BLOCK_ITEMS: Record<
  'list' | 'checklist' | 'summary' | 'steps' | 'cards' | 'faq',
  { min: number; max: number; multipleOf?: number }
> = {
  list: { min: 2, max: 8 },
  checklist: { min: 2, max: 8 },
  summary: { min: 3, max: 5 },
  steps: { min: 3, max: 6 },
  cards: { min: 3, max: 6, multipleOf: 3 },
  faq: { min: 3, max: 6 },
};

const LOCALE = /^[a-z]{2}(-[A-Z]{2})?$/;

export class ArticleIdea {
  /** The topic (category) name, in the article's language. */
  @IsString()
  @MaxLength(80)
  topic: string;

  /** What the admin wants to write about, in their words. */
  @IsString()
  @MaxLength(500)
  idea: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  audience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  keyword?: string;

  @IsIn(ARTICLE_LENGTHS)
  length: ArticleLength;

  @IsInt()
  @Min(0)
  @Max(ARTICLE_MAX_IMAGES)
  images: number;
}

export class ArticlePromptRequestedEvent {
  @IsUUID()
  jobId: string;

  @IsString()
  @MaxLength(50)
  requester: string;

  @IsString()
  @MaxLength(50)
  siteId: string;

  @Matches(LOCALE)
  language: string;

  @ValidateNested()
  @Type(() => ScriptBrand)
  brand: ScriptBrand;

  /** The business's own facts (website, address, hours, prices…): to be quoted as they are. */
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ScriptFact)
  facts: ScriptFact[];

  /** Rules of this site (e.g. alcohol: 18+, no health claims), in English. */
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  rules: string[];

  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  bannedPhrases: string[];

  /** Titles already published on the site (not to repeat). */
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  existingTitles: string[];

  @ValidateNested()
  @Type(() => ArticleIdea)
  idea: ArticleIdea;

  @IsOptional()
  @IsString()
  actorId?: string;
}

export class ArticlePromptCompletedEvent {
  @IsUUID()
  jobId: string;

  @IsString()
  requester: string;

  @IsString()
  siteId: string;

  /** The writing brief, starting "You are a professional content writer…" (in the language). */
  @IsString()
  @MaxLength(ARTICLE_PROMPT_MAX_LENGTH)
  prompt: string;

  /** The section headings planned, in order. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ARTICLE_MAX_OUTLINE)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  outline: string[];

  @IsString()
  provider: string;

  @IsString()
  model: string;
}

export class ArticleWritingRequestedEvent {
  @IsUUID()
  jobId: string;

  @IsString()
  @MaxLength(50)
  requester: string;

  @IsString()
  @MaxLength(50)
  siteId: string;

  @Matches(LOCALE)
  language: string;

  /** The brief as the admin confirmed it. */
  @IsString()
  @MaxLength(ARTICLE_PROMPT_MAX_LENGTH)
  prompt: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ARTICLE_MAX_OUTLINE)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  outline: string[];

  @IsIn(ARTICLE_LENGTHS)
  length: ArticleLength;

  /** Images to plan (the cover first, then images in the text). */
  @IsInt()
  @Min(0)
  @Max(ARTICLE_MAX_IMAGES)
  images: number;

  /** The business facts again: authoritative if the brief was edited carelessly. */
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ScriptFact)
  facts: ScriptFact[];

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  rules: string[];

  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  bannedPhrases: string[];

  @IsOptional()
  @IsString()
  actorId?: string;
}

export class ArticleBlockItem {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsString()
  @MaxLength(1500)
  text: string;
}

export class ArticleBlock {
  @IsIn(ARTICLE_BLOCK_TYPES)
  type: ArticleBlockType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  text?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ArticleBlockItem)
  items?: ArticleBlockItem[];

  /** `image`: what to draw (for the image model, in English). */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  prompt?: string;

  /** `image`: the description for screen readers. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  alt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  caption?: string;
}

export class WrittenArticle {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(500)
  excerpt: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  seoDescription?: string;

  /** The cover to draw (English), and its description. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  coverPrompt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  coverAlt?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ARTICLE_MAX_BLOCKS)
  @ValidateNested({ each: true })
  @Type(() => ArticleBlock)
  blocks: ArticleBlock[];
}

export class ArticleWritingCompletedEvent {
  @IsUUID()
  jobId: string;

  @IsString()
  requester: string;

  @IsString()
  siteId: string;

  @ValidateNested()
  @Type(() => WrittenArticle)
  article: WrittenArticle;

  @IsString()
  provider: string;

  @IsString()
  model: string;
}

/** Both steps fail the same way. */
export class ArticleJobFailedEvent {
  @IsUUID()
  jobId: string;

  @IsString()
  requester: string;

  @IsString()
  siteId: string;

  @IsIn(TRANSLATION_FAILURES)
  reason: TranslationFailure;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  detail?: string;
}
