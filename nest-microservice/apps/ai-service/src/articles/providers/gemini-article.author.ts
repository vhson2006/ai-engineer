import { GoogleGenAI } from '@google/genai';
import { ARTICLE_BLOCK_ITEMS, ARTICLE_BLOCK_TYPES, ARTICLE_LENGTH_WORDS } from '@app/common';
import { ProviderRefusedError } from '../../translation/providers/translation-provider';
import {
  briefStart,
  normalizeArticle,
  normalizeBrief,
  type ArticleAuthor,
  type ArticleDraft,
  type ArticleRequest,
  type BriefRequest,
  type WrittenBrief,
} from './article-author';

const LANGUAGES: Record<string, string> = { vi: 'Vietnamese', en: 'English' };
const languageName = (locale: string) => LANGUAGES[locale.split('-')[0]] ?? locale;

const BRIEF_SCHEMA = {
  type: 'object',
  properties: {
    prompt: { type: 'string' },
    outline: { type: 'array', items: { type: 'string' } },
  },
  required: ['prompt', 'outline'],
};

/** "3 to 6 items", from the layout's rules (ARTICLE_BLOCK_ITEMS). */
const items = (type: keyof typeof ARTICLE_BLOCK_ITEMS) =>
  `${ARTICLE_BLOCK_ITEMS[type].min} to ${ARTICLE_BLOCK_ITEMS[type].max} items`;

const ARTICLE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    excerpt: { type: 'string' },
    seoTitle: { type: 'string' },
    seoDescription: { type: 'string' },
    coverPrompt: { type: 'string' },
    coverAlt: { type: 'string' },
    blocks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: [...ARTICLE_BLOCK_TYPES] },
          title: { type: 'string' },
          text: { type: 'string' },
          items: {
            type: 'array',
            maxItems: Math.max(...Object.values(ARTICLE_BLOCK_ITEMS).map((rule) => rule.max)),
            items: {
              type: 'object',
              properties: { title: { type: 'string' }, text: { type: 'string' } },
              required: ['text'],
            },
          },
          prompt: { type: 'string' },
          alt: { type: 'string' },
          caption: { type: 'string' },
        },
        required: ['type'],
      },
    },
  },
  required: ['title', 'excerpt', 'blocks'],
};

const NO_INVENTION =
  'Use ONLY the facts given: quote prices, opening hours, addresses, phone numbers and names exactly as written. Never invent prices, numbers, statistics, discounts, promotions, years of experience, awards, reviews, customer stories or health claims.';

export function briefInstruction(request: BriefRequest): string {
  const language = languageName(request.language);
  const words = ARTICLE_LENGTH_WORDS[request.idea.length];
  return [
    `You prepare the writing brief of an article for the website of a small local business, in ${language}. The business's admin reads it, may edit it, then an AI writer follows it.`,
    `"prompt": the brief, in ${language}, starting exactly with "${briefStart(request.language)}". In clear paragraphs, it states: who the business is (the brand, its tone), the topic and the idea, the goal of the article and its reader (the audience, or a sensible one), the search keyword to use naturally if any, a length of about ${words} words, that it follows the outline, which layout blocks suit it (key points, tip / note / warning boxes, steps, cards, questions and answers, a closing call to action: only those that help), the business facts it may quote (list them verbatim), the site's rules, the banned words, and that nothing else may be invented.`,
    `"outline": 4 to 8 section headings (H2) in ${language}, concrete and useful to the reader, in order; never the title of an article the site already has.`,
    NO_INVENTION,
  ].join('\n');
}

export function articleInstruction(request: ArticleRequest): string {
  const language = languageName(request.language);
  const words = ARTICLE_LENGTH_WORDS[request.length];
  const inText = Math.max(request.images - 1, 0);
  const banned = request.bannedPhrases.length
    ? `Never use these words or phrases (any case): ${request.bannedPhrases.map((p) => `"${p}"`).join(', ')}.`
    : '';
  const rules = request.rules.length ? `Site rules: ${request.rules.join(' ')}` : '';
  return [
    `You write a web article in ${language}, following the brief and the outline in the input, about ${words} words. The answer is JSON: the article as a list of blocks, never HTML or markdown headings.`,
    `Blocks: "lead" (the opening paragraph: text), "paragraph" (text), "heading" (a section title, H2: text), "subheading" (H3: text), "list" and "checklist" (${items('list')} with text), "quote" (a short striking sentence: text; never a made-up customer quote), "note" / "tip" / "warn" (a box: title + text), "summary" (key points: title + ${items('summary')}), "steps" (${items('steps')}: title + text each), "cards" (EXACTLY 3 or 6 items: title + text; they sit three per row, so never 2, 4 or 5), "faq" (${items('faq')}: item title = question, text = answer), "cta" (the closing call to action: title + text), "image" (prompt + alt + caption).`,
    'Start with one "lead". Use every outline heading, in order, as a "heading" block, each followed by paragraphs and, where it helps, ONE layout block (a box, steps, cards, a list, key points). Use 3 to 6 layout blocks in all, varied, never two in a row. End with "faq" if useful, then one "cta".',
    'In any text, **bold** marks a few key words; no other markup, no emoji.',
    inText
      ? `Place exactly ${inText} "image" block(s) in the text, where a picture helps. "prompt": what to show, in English, for an image model: a realistic photo, natural light, no text, no logo, no recognizable face. "alt": what the image shows, in ${language}. "caption": one short sentence in ${language}.`
      : 'No "image" block.',
    request.images > 0
      ? `"coverPrompt": the cover picture, in English, same style. "coverAlt": its description in ${language}.`
      : 'No cover.',
    `"title": at most 70 characters, says what the reader gets. "excerpt": one or two sentences, at most 160 characters. "seoTitle": at most 60 characters. "seoDescription": at most 155 characters. All in ${language}.`,
    NO_INVENTION,
    rules,
    banned,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Gemini through `@google/genai` (Interactions API), structured output, `store: false`, like the
 * script writer. Errors: 429 / 5xx / network are retried; any other 4xx, a non-completed or an
 * unusable answer is a ProviderRefusedError.
 */
export class GeminiArticleAuthor implements ArticleAuthor {
  readonly name = 'gemini';
  private readonly client: GoogleGenAI;

  constructor(
    apiKey: string,
    private readonly model: string,
    private readonly timeoutMs: number,
  ) {
    this.client = new GoogleGenAI({ apiKey, httpOptions: { timeout: timeoutMs } });
  }

  async brief(request: BriefRequest): Promise<WrittenBrief> {
    const { raw, usage } = await this.ask(
      briefInstruction(request),
      JSON.stringify({
        brand: request.brand,
        facts: request.facts,
        rules: request.rules,
        bannedPhrases: request.bannedPhrases,
        existingTitles: request.existingTitles,
        idea: request.idea,
      }),
      BRIEF_SCHEMA,
    );
    const brief = normalizeBrief(request, raw);
    if (!brief) throw new ProviderRefusedError('Gemini returned no brief', 'invalid_output');
    return { ...brief, ...usage };
  }

  async write(request: ArticleRequest): Promise<ArticleDraft> {
    const { raw, usage } = await this.ask(
      articleInstruction(request),
      JSON.stringify({ brief: request.prompt, outline: request.outline, facts: request.facts }),
      ARTICLE_SCHEMA,
    );
    const article = normalizeArticle(request, raw);
    if (!article) throw new ProviderRefusedError('Gemini returned no article', 'invalid_output');
    return { article, ...usage };
  }

  private async ask(instruction: string, input: string, schema: object) {
    let interaction: Awaited<ReturnType<GoogleGenAI['interactions']['create']>>;
    try {
      interaction = await this.client.interactions.create(
        {
          model: this.model,
          system_instruction: instruction,
          input,
          response_format: { type: 'text', mime_type: 'application/json', schema },
          store: false,
        },
        { timeout: this.timeoutMs, maxRetries: 1 },
      );
    } catch (error) {
      const status = (error as { status?: unknown }).status;
      if (typeof status === 'number' && status >= 400 && status < 500 && status !== 429) {
        throw new ProviderRefusedError(`Gemini answered ${status}`);
      }
      throw error;
    }
    if (interaction.status !== 'completed') {
      throw new ProviderRefusedError(`Gemini interaction ${interaction.status}`, 'invalid_output');
    }
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(interaction.output_text ?? '') as Record<string, unknown>;
    } catch {
      throw new ProviderRefusedError('Gemini returned no JSON', 'invalid_output');
    }
    return {
      raw,
      usage: {
        model: this.model,
        inputTokens: interaction.usage?.total_input_tokens ?? 0,
        outputTokens: interaction.usage?.total_output_tokens ?? 0,
      },
    };
  }
}
