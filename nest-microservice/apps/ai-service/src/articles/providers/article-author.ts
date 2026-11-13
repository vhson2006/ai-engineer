import {
  ARTICLE_BLOCK_TYPES,
  ARTICLE_MAX_BLOCKS,
  ARTICLE_MAX_OUTLINE,
  ARTICLE_PROMPT_MAX_LENGTH,
  type ArticleBlock,
  type ArticleBlockType,
  type ArticlePromptRequestedEvent,
  type ArticleWritingRequestedEvent,
  type WrittenArticle,
} from '@app/common';

/**
 * Articles written by AI (ADR 0041), chosen by AI_SCRIPT_PROVIDER (the same text model as the
 * studio): `fake` or `gemini`. Two calls: the brief (prompt + outline) the admin edits, then the
 * article as blocks. Errors as the other providers: ProviderRefusedError is permanent, anything
 * else transient (retried).
 */
export const ARTICLE_AUTHOR = Symbol('ARTICLE_AUTHOR');

export type BriefRequest = Pick<
  ArticlePromptRequestedEvent,
  'language' | 'brand' | 'facts' | 'rules' | 'bannedPhrases' | 'existingTitles' | 'idea'
>;
export type ArticleRequest = Pick<
  ArticleWritingRequestedEvent,
  'language' | 'prompt' | 'outline' | 'length' | 'images' | 'facts' | 'rules' | 'bannedPhrases'
>;

interface Usage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}
export interface WrittenBrief extends Usage {
  prompt: string;
  outline: string[];
}
export interface ArticleDraft extends Usage {
  article: WrittenArticle;
}

export interface ArticleAuthor {
  readonly name: string;
  brief(request: BriefRequest): Promise<WrittenBrief>;
  write(request: ArticleRequest): Promise<ArticleDraft>;
}

/** How a brief starts, per language (the admin reads and edits it in that language). */
export const BRIEF_START: Record<string, string> = {
  vi: 'Bạn là người viết nội dung chuyên nghiệp',
  en: 'You are a professional content writer',
};
export const briefStart = (language: string) =>
  BRIEF_START[language.split('-')[0]] ?? BRIEF_START.en;

const str = (value: unknown, max: number) =>
  typeof value === 'string' ? value.replace(/\s+\n/g, '\n').trim().slice(0, max) : '';

/** The brief in the contract's shape: it starts as it must, the outline has 1–12 headings. */
export function normalizeBrief(
  request: BriefRequest,
  raw: { prompt?: unknown; outline?: unknown },
): Omit<WrittenBrief, keyof Usage> | null {
  let prompt = str(raw.prompt, ARTICLE_PROMPT_MAX_LENGTH);
  const start = briefStart(request.language);
  if (prompt && !prompt.toLowerCase().startsWith(start.toLowerCase())) {
    prompt = `${start}. ${prompt}`.slice(0, ARTICLE_PROMPT_MAX_LENGTH);
  }
  const outline = (Array.isArray(raw.outline) ? raw.outline : [])
    .map((heading) => str(heading, 200).replace(/^\s*(?:\d+[.)]|[-*•])\s*/, ''))
    .filter(Boolean)
    .slice(0, ARTICLE_MAX_OUTLINE);
  return prompt && outline.length ? { prompt, outline } : null;
}

const TYPES = new Set<string>(ARTICLE_BLOCK_TYPES);
const WITH_ITEMS = new Set<ArticleBlockType>([
  'list',
  'checklist',
  'summary',
  'steps',
  'cards',
  'faq',
]);

/**
 * The article in the contract's shape: known block types only, each with what it needs (empty
 * ones dropped), lengths cut, at most `images - 1` image blocks in the text (the cover is the
 * first image) and none without a prompt. Null when nothing usable came back.
 */
export function normalizeArticle(
  request: ArticleRequest,
  raw: Record<string, unknown>,
): WrittenArticle | null {
  const inText = Math.max(request.images - 1, 0);
  let images = 0;
  const blocks: ArticleBlock[] = [];
  for (const value of Array.isArray(raw.blocks) ? (raw.blocks as unknown[]) : []) {
    if (!value || typeof value !== 'object') continue;
    const b = value as Record<string, unknown>;
    if (typeof b.type !== 'string' || !TYPES.has(b.type)) continue;
    const type = b.type as ArticleBlockType;
    const block: ArticleBlock = { type };
    const title = str(b.title, 200);
    const text = str(b.text, 3000);
    if (title) block.title = title;
    if (text) block.text = text;
    if (WITH_ITEMS.has(type)) {
      const items = (Array.isArray(b.items) ? (b.items as unknown[]) : [])
        .map((item) => {
          const i = (item ?? {}) as Record<string, unknown>;
          const itemText = str(typeof item === 'string' ? item : i.text, 1500);
          const itemTitle = str(i.title, 200);
          return itemText ? { ...(itemTitle && { title: itemTitle }), text: itemText } : null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .slice(0, 12);
      if (!items.length) continue;
      block.items = items;
    } else if (type === 'image') {
      const prompt = str(b.prompt, 1000);
      if (!prompt || images >= inText) continue;
      images++;
      block.prompt = prompt;
      const alt = str(b.alt, 300);
      const caption = str(b.caption, 300);
      if (alt) block.alt = alt;
      if (caption) block.caption = caption;
      delete block.text;
    } else if (!text) {
      continue;
    }
    blocks.push(block);
    if (blocks.length >= ARTICLE_MAX_BLOCKS) break;
  }
  const title = str(raw.title, 200);
  if (!title || !blocks.some((b) => b.type !== 'image')) return null;
  const coverPrompt = request.images > 0 ? str(raw.coverPrompt, 1000) : '';
  return {
    title,
    excerpt: str(raw.excerpt, 500) || str(blocks.find((b) => b.text)?.text, 300),
    ...(str(raw.seoTitle, 200) && { seoTitle: str(raw.seoTitle, 200) }),
    ...(str(raw.seoDescription, 300) && { seoDescription: str(raw.seoDescription, 300) }),
    ...(coverPrompt && { coverPrompt }),
    ...(coverPrompt && str(raw.coverAlt, 300) && { coverAlt: str(raw.coverAlt, 300) }),
    blocks,
  };
}
