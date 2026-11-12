import {
  GeminiTranslationProvider,
  parseSegments,
  systemInstruction,
} from '../../../src/translation/providers/gemini.provider';
import { ProviderRefusedError } from '../../../src/translation/providers/translation-provider';

const create = jest.fn();
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({ interactions: { create } })),
}));

describe('[gemini.provider] (unit)', () => {
  const request = {
    sourceLocale: 'vi',
    targetLocale: 'en',
    kind: 'article',
    segments: ['Xin chào', 'Giá 35.000 ₫'],
    glossary: [{ source: 'SFaster', target: 'SFaster' }],
  };
  const provider = new GeminiTranslationProvider('key', 'gemini-3.8-flash', 60_000);

  beforeEach(() => create.mockReset());

  it('asks for JSON segments (structured output), not stored, and returns them with usage', async () => {
    create.mockResolvedValue({
      status: 'completed',
      output_text: JSON.stringify({ segments: ['Hello', 'Price 35.000 ₫'] }),
      usage: { total_input_tokens: 120, total_output_tokens: 30 },
    });
    await expect(provider.translate(request)).resolves.toEqual({
      segments: ['Hello', 'Price 35.000 ₫'],
      model: 'gemini-3.8-flash',
      inputTokens: 120,
      outputTokens: 30,
    });
    const params = create.mock.calls[0][0];
    expect(params).toMatchObject({
      model: 'gemini-3.8-flash',
      store: false,
      response_format: { type: 'text', mime_type: 'application/json' },
    });
    expect(JSON.parse(params.input)).toEqual({ segments: request.segments });
    // One SDK retry at most (JetStream retries), per-call timeout from the config.
    expect(create.mock.calls[0][1]).toEqual({ timeout: 60_000, maxRetries: 1 });
    expect(params.system_instruction).toContain('from Vietnamese to English');
    expect(params.system_instruction).toContain('- SFaster => SFaster');
  });

  it('a wrong segment count or a broken answer is invalid_output (permanent)', async () => {
    create.mockResolvedValue({ status: 'completed', output_text: '{"segments":["only one"]}' });
    await expect(provider.translate(request)).rejects.toMatchObject({ reason: 'invalid_output' });
    create.mockResolvedValue({ status: 'incomplete', output_text: '' });
    await expect(provider.translate(request)).rejects.toBeInstanceOf(ProviderRefusedError);
  });

  it('4xx (but 429) is a refusal; 429, 5xx and network errors stay transient', async () => {
    create.mockRejectedValue(Object.assign(new Error('bad'), { status: 400 }));
    await expect(provider.translate(request)).rejects.toBeInstanceOf(ProviderRefusedError);
    for (const error of [
      Object.assign(new Error('slow down'), { status: 429 }),
      Object.assign(new Error('down'), { status: 503 }),
      new Error('ECONNRESET'),
    ]) {
      create.mockRejectedValue(error);
      await expect(provider.translate(request)).rejects.toBe(error);
    }
  });

  it('parseSegments only accepts {"segments": string[]}', () => {
    expect(parseSegments('{"segments":["a","b"]}')).toEqual(['a', 'b']);
    expect(parseSegments('{"segments":[1]}')).toBeNull();
    expect(parseSegments('not json')).toBeNull();
    expect(parseSegments(undefined)).toBeNull();
  });

  it('the instruction lists no glossary when there is none', () => {
    expect(systemInstruction({ ...request, glossary: [] })).not.toContain('Glossary');
  });
});
