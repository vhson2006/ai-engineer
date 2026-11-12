import { GoogleGenAI } from '@google/genai';
import {
  ProviderRefusedError,
  type TranslationProvider,
  type TranslationRequest,
  type TranslationResult,
} from './translation-provider';

/** Language names the model understands better than codes. */
const LANGUAGES: Record<string, string> = { vi: 'Vietnamese', en: 'English' };
const languageName = (locale: string) => LANGUAGES[locale.split('-')[0]] ?? locale;

/** The answer: one translated string per segment, same order (count checked here too). */
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: { segments: { type: 'array', items: { type: 'string' } } },
  required: ['segments'],
};

export function systemInstruction(request: TranslationRequest): string {
  const glossary = request.glossary.length
    ? `\nGlossary (always render the left side as the right side; identical sides mean "never translate"):\n${request.glossary
        .map((g) => `- ${g.source} => ${g.target}`)
        .join('\n')}`
    : '';
  return [
    `You translate the text of a small shop's website (${request.kind}) from ${languageName(request.sourceLocale)} to ${languageName(request.targetLocale)}.`,
    'The input is JSON {"segments": [...]}: answer JSON {"segments": [...]} with exactly one translated string per input string, in the same order. Never merge, split, skip or reorder segments.',
    'Segments may contain HTML inline tags (<strong>, <em>, <u>, <s>, <code>, <a href="...">, <br />): keep every tag and attribute exactly as written, translate only the text between them. Never add tags.',
    'Keep numbers, prices (35.000 ₫), times (07:00), units (kg), phone numbers, URLs and names exactly as written.',
    'Write natural, friendly, concise language for customers; keep the meaning, do not add or remove information. A segment with nothing to translate is returned unchanged.',
    glossary,
  ].join('\n');
}

/**
 * Gemini through the official SDK (`@google/genai`, Interactions API), structured output (JSON
 * schema). `store: false`: Google keeps no copy of the interaction for retrieval (the free tier
 * may still use content to improve its products, ADR 0036). Errors: 429 / 5xx / network are
 * thrown as they are (transient: the message is retried); any other 4xx, a non-completed answer
 * or a wrong segment count is a ProviderRefusedError (permanent).
 */
export class GeminiTranslationProvider implements TranslationProvider {
  readonly name = 'gemini';
  private readonly client: GoogleGenAI;

  constructor(
    apiKey: string,
    private readonly model: string,
    private readonly timeoutMs: number,
  ) {
    this.client = new GoogleGenAI({ apiKey, httpOptions: { timeout: timeoutMs } });
  }

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    let interaction: Awaited<ReturnType<GoogleGenAI['interactions']['create']>>;
    try {
      interaction = await this.client.interactions.create(
        {
          model: this.model,
          system_instruction: systemInstruction(request),
          input: JSON.stringify({ segments: request.segments }),
          response_format: { type: 'text', mime_type: 'application/json', schema: RESPONSE_SCHEMA },
          store: false,
        },
        // One quick retry at most here: JetStream already redelivers with backoff (a hung call
        // retried by the SDK after its full timeout made a refusal take minutes to surface).
        { timeout: this.timeoutMs, maxRetries: 1 },
      );
    } catch (error) {
      const status = (error as { status?: unknown }).status;
      if (typeof status === 'number' && status >= 400 && status < 500 && status !== 429) {
        throw new ProviderRefusedError(`Gemini answered ${status}`);
      }
      throw error; // 429, 5xx, timeout, network: retried later
    }

    if (interaction.status !== 'completed') {
      throw new ProviderRefusedError(`Gemini interaction ${interaction.status}`, 'invalid_output');
    }
    const segments = parseSegments(interaction.output_text);
    if (!segments || segments.length !== request.segments.length) {
      throw new ProviderRefusedError(
        `Gemini returned ${segments?.length ?? 'no'} segments for ${request.segments.length}`,
        'invalid_output',
      );
    }
    return {
      segments,
      model: this.model,
      inputTokens: interaction.usage?.total_input_tokens ?? 0,
      outputTokens: interaction.usage?.total_output_tokens ?? 0,
    };
  }
}

/** `{"segments": ["…", …]}` → the strings, or null when the answer isn't that shape. */
export function parseSegments(text: string | undefined): string[] | null {
  if (!text) return null;
  try {
    const value = JSON.parse(text) as { segments?: unknown };
    return Array.isArray(value.segments) && value.segments.every((s) => typeof s === 'string')
      ? value.segments
      : null;
  } catch {
    return null;
  }
}
