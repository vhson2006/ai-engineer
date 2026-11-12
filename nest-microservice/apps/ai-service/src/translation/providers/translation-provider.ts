import type { GlossaryEntry } from '@app/common';

/**
 * A machine-translation backend (ADR 0036). ai-service talks to exactly one, chosen by
 * AI_TRANSLATION_PROVIDER: `fake` (tests, offline dev), `gemini` (now), `claude` (later).
 * Adding one = a class here + a case in translation.module.ts; nothing else changes.
 */
export const TRANSLATION_PROVIDER = Symbol('TRANSLATION_PROVIDER');

export interface TranslationRequest {
  sourceLocale: string;
  targetLocale: string;
  /** "article"… : the tone of the text. */
  kind: string;
  segments: string[];
  glossary: GlossaryEntry[];
}

export interface TranslationResult {
  /** Same length and order as the request's segments. */
  segments: string[];
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface TranslationProvider {
  readonly name: string;
  translate(request: TranslationRequest): Promise<TranslationResult>;
}

/**
 * The provider declined for good (invalid request, safety, quota exhausted, a broken answer
 * after retries): retrying the same message won't help. Anything else thrown is transient.
 */
export class ProviderRefusedError extends Error {
  constructor(
    message: string,
    readonly reason: 'provider_refused' | 'invalid_output' = 'provider_refused',
  ) {
    super(message);
    this.name = 'ProviderRefusedError';
  }
}
