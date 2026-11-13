import { GoogleGenAI } from '@google/genai';
import { ProviderRefusedError } from '../../translation/providers/translation-provider';
import {
  normalizeScript,
  type ScriptRequest,
  type ScriptWriter,
  type WrittenScript,
} from './script-writer';

const LANGUAGES: Record<string, string> = { vi: 'Vietnamese', en: 'English' };
const languageName = (locale: string) => LANGUAGES[locale.split('-')[0]] ?? locale;

/** The answer: hook variants, one line + on-screen text per scene, a caption, hashtags. */
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    hooks: { type: 'array', items: { type: 'string' } },
    scenes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          voice: { type: 'string' },
          onScreen: { type: 'string' },
        },
        required: ['id', 'voice', 'onScreen'],
      },
    },
    caption: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } },
  },
  required: ['hooks', 'scenes', 'caption', 'hashtags'],
};

export function scriptInstruction(request: ScriptRequest): string {
  const language = languageName(request.language);
  const banned = request.bannedPhrases.length
    ? `Never use these words or phrases (any case): ${request.bannedPhrases.map((p) => `"${p}"`).join(', ')}.`
    : '';
  return [
    `You write the script of a short vertical marketing video (TikTok, Reels, Shorts) for a small local business, in ${language}.`,
    `Template: ${request.instructions}`,
    "The input is JSON with the brand, the facts you may use, the admin's brief and the scenes in order, each with its purpose, a maximum number of spoken words (maxWords) and a maximum number of on-screen characters (onScreenMaxChars).",
    'For each scene write "voice" (what the narrator says, natural spoken language, at most maxWords words) and "onScreen" (a short caption burned on the video, at most onScreenMaxChars characters, no emoji). Keep the scene ids and their order.',
    `Write ${request.hookVariants} different variants of the FIRST scene's spoken line in "hooks" (each within that scene's maxWords); the first scene's "voice" must be hooks[0].`,
    'Use ONLY facts given in the input: never invent prices, numbers, discounts, promotions, opening hours, awards, reviews, customers or health claims. Keep prices, phone numbers and names exactly as written.',
    banned,
    `"caption": the post text for the social network in ${language}, at most 300 characters, ending with the call to action; "hashtags": 3 to 8 relevant hashtags (with #, no spaces).`,
    'Friendly, concrete, no exaggeration, no all-caps.',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Gemini through `@google/genai` (Interactions API), structured output, `store: false`, like the
 * translation provider. Errors: 429 / 5xx / network thrown as they are (retried); any other 4xx,
 * a non-completed answer or an unusable one is a ProviderRefusedError.
 */
export class GeminiScriptWriter implements ScriptWriter {
  readonly name = 'gemini';
  private readonly client: GoogleGenAI;

  constructor(
    apiKey: string,
    private readonly model: string,
    private readonly timeoutMs: number,
  ) {
    this.client = new GoogleGenAI({ apiKey, httpOptions: { timeout: timeoutMs } });
  }

  async write(request: ScriptRequest): Promise<WrittenScript> {
    let interaction: Awaited<ReturnType<GoogleGenAI['interactions']['create']>>;
    try {
      interaction = await this.client.interactions.create(
        {
          model: this.model,
          system_instruction: scriptInstruction(request),
          input: JSON.stringify({
            brand: request.brand,
            brief: request.brief ?? null,
            facts: request.facts,
            scenes: request.scenes,
          }),
          response_format: { type: 'text', mime_type: 'application/json', schema: RESPONSE_SCHEMA },
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
    const script = normalizeScript(request, raw);
    if (!script)
      throw new ProviderRefusedError('Gemini returned an empty script', 'invalid_output');
    return {
      ...script,
      model: this.model,
      inputTokens: interaction.usage?.total_input_tokens ?? 0,
      outputTokens: interaction.usage?.total_output_tokens ?? 0,
    };
  }
}
