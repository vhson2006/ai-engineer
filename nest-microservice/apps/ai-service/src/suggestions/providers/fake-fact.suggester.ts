import {
  normalizeSuggestions,
  type FactSuggester,
  type SuggestionRequest,
  type Suggestions,
} from './fact-suggester';

/** No AI, no network: each field says what it is for (tests, offline dev). */
export class FakeFactSuggester implements FactSuggester {
  readonly name = 'fake';

  suggest(request: SuggestionRequest): Promise<Suggestions> {
    const fields = request.fields.map((field) => {
      const lines = field.images?.length ?? field.lines;
      const text = lines
        ? Array.from(
            { length: lines },
            (_, i) => `${field.label} ${i + 1} | ${request.title}`,
          ).join('\n')
        : `${field.label}: ${request.title}`;
      return { id: field.id, text };
    });
    return Promise.resolve({
      facts: normalizeSuggestions(request, { fields }),
      model: 'fake',
      inputTokens: 0,
      outputTokens: 0,
    });
  }
}
