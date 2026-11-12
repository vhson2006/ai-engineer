import type {
  TranslationProvider,
  TranslationRequest,
  TranslationResult,
} from './translation-provider';

/**
 * No translation at all: prefixes each segment's text with `[EN] ` (the target locale), keeps
 * the markup. For tests and for running the whole flow without any account or network.
 */
export class FakeTranslationProvider implements TranslationProvider {
  readonly name = 'fake';

  translate(request: TranslationRequest): Promise<TranslationResult> {
    const tag = `[${request.targetLocale.toUpperCase()}] `;
    return Promise.resolve({
      // Before the first text, never inside a tag: "<strong>x</strong>" → "<strong>[EN] x</strong>".
      segments: request.segments.map((segment) =>
        segment.replace(/^(\s*(?:<[^>]+>\s*)*)/, `$1${tag}`),
      ),
      model: 'fake',
      inputTokens: 0,
      outputTokens: 0,
    });
  }
}
