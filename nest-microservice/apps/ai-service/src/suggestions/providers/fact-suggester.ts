import type { FactSuggestionRequestedEvent, SuggestedFact } from '@app/common';

/**
 * Draft texts for a video project's fields (ADR 0039, "Suggest with AI"), chosen by
 * AI_SCRIPT_PROVIDER (the same text model as the scripts): `fake` or `gemini`. Errors follow the
 * other providers: ProviderRefusedError is permanent, anything else is transient (retried).
 */
export const FACT_SUGGESTER = Symbol('FACT_SUGGESTER');

export type SuggestionRequest = Pick<
  FactSuggestionRequestedEvent,
  'language' | 'template' | 'title' | 'brief' | 'brand' | 'known' | 'fields'
>;

/** An image a field is about, already loaded from the site's media library. */
export interface LoadedImage {
  key: string;
  mimeType: string;
  /** Base64. */
  data: string;
}

export interface Suggestions {
  facts: SuggestedFact[];
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface FactSuggester {
  readonly name: string;
  suggest(request: SuggestionRequest, images: LoadedImage[]): Promise<Suggestions>;
}

/**
 * The answer in the contract's shape whatever the model did: only the requested fields, once
 * each; a list field keeps at most its number of lines (one per image when it has images); every
 * text cut to its maximum length. Empty answers are dropped.
 */
export function normalizeSuggestions(
  request: SuggestionRequest,
  raw: { fields?: unknown },
): SuggestedFact[] {
  const answered = Array.isArray(raw.fields) ? (raw.fields as Record<string, unknown>[]) : [];
  return request.fields.flatMap((field) => {
    const found = answered.find((f) => f && f.id === field.id);
    let text = typeof found?.text === 'string' ? found.text.trim() : '';
    const lines = field.images?.length ?? field.lines;
    if (lines) {
      text = text
        .split(/\r?\n/)
        .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim())
        .filter(Boolean)
        .slice(0, lines)
        .join('\n');
    }
    text = text.slice(0, field.maxLength).trim();
    return text ? [{ id: field.id, text }] : [];
  });
}
