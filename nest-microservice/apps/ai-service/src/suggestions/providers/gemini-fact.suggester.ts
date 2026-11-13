import { GoogleGenAI } from '@google/genai';
import { ProviderRefusedError } from '../../translation/providers/translation-provider';
import {
  normalizeSuggestions,
  type FactSuggester,
  type LoadedImage,
  type SuggestionRequest,
  type Suggestions,
} from './fact-suggester';

const LANGUAGES: Record<string, string> = { vi: 'Vietnamese', en: 'English' };
const languageName = (locale: string) => LANGUAGES[locale.split('-')[0]] ?? locale;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    fields: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, text: { type: 'string' } },
        required: ['id', 'text'],
      },
    },
  },
  required: ['fields'],
};

export function suggestionInstruction(request: SuggestionRequest): string {
  const language = languageName(request.language);
  return [
    `You help the owner of a small local business prepare a short marketing video. Write draft texts for the input fields of the video, in ${language}.`,
    `The video: ${request.template}`,
    'The input is JSON: the brand, the video title, the brief, what is already known (context only, never repeat it) and the fields to fill, each with its label, its format hint and its maximum length; a field with "lines" wants one item per line, at most that many lines.',
    'A field with "images" is about the images that follow the JSON, in that order: write exactly one line per image, describing what the picture shows (e.g. the style or the product), short and concrete.',
    'NEVER invent facts: no prices, numbers, discounts, promotions, years of experience, opening hours, addresses, phone numbers, awards, reviews, ratings, customer names or health claims. Write general qualities a customer can check (cleanliness, care, comfort, products), as the business would describe itself. Use no digits at all.',
    'Answer every field in "fields" with its id and its text. Plain text, no emoji, no markdown, no quotes around lines.',
  ].join('\n');
}

/**
 * Gemini through `@google/genai` (Interactions API), structured output, `store: false`; the
 * field images go inline after the JSON. Errors as GeminiScriptWriter: 429 / 5xx / network are
 * retried, any other 4xx, a non-completed or unusable answer is a ProviderRefusedError.
 */
export class GeminiFactSuggester implements FactSuggester {
  readonly name = 'gemini';
  private readonly client: GoogleGenAI;

  constructor(
    apiKey: string,
    private readonly model: string,
    private readonly timeoutMs: number,
  ) {
    // Image input in the Interactions API exists only in v1beta (v1 answers 400 for type "image").
    this.client = new GoogleGenAI({
      apiKey,
      httpOptions: { timeout: timeoutMs, apiVersion: 'v1beta' },
    });
  }

  async suggest(request: SuggestionRequest, images: LoadedImage[]): Promise<Suggestions> {
    const json = JSON.stringify({
      brand: request.brand,
      title: request.title,
      brief: request.brief ?? null,
      known: request.known,
      fields: request.fields.map((field) => ({
        id: field.id,
        label: field.label,
        hint: field.hint,
        maxLength: field.maxLength,
        ...(field.lines && { lines: field.lines }),
        ...(field.images?.length && { images: field.images.length }),
      })),
    });
    let interaction: Awaited<ReturnType<GoogleGenAI['interactions']['create']>>;
    try {
      interaction = await this.client.interactions.create(
        {
          model: this.model,
          system_instruction: suggestionInstruction(request),
          input: [
            { type: 'text', text: json },
            ...images.map((image) => ({
              type: 'image' as const,
              mime_type: image.mimeType,
              data: image.data,
            })),
          ],
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
    const facts = normalizeSuggestions(request, raw);
    if (!facts.length) throw new ProviderRefusedError('Gemini returned no text', 'invalid_output');
    return {
      facts,
      model: this.model,
      inputTokens: interaction.usage?.total_input_tokens ?? 0,
      outputTokens: interaction.usage?.total_output_tokens ?? 0,
    };
  }
}
