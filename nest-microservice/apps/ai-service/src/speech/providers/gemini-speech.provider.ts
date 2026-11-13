import { HttpClient, UpstreamError } from '@app/common';
import { ProviderRefusedError } from '../../translation/providers/translation-provider';
import { isWav, pcmToWav, wavDurationMs } from '../wav';
import type { SpeechProvider, SpeechRequest, SpokenAudio } from './speech-provider';

/** BCP-47 tags for the speech config (the TTS models speak Vietnamese and English). */
const SPEECH_LANGUAGES: Record<string, string> = { vi: 'vi-VN', en: 'en-US' };
/** What Gemini TTS sends when it answers raw PCM (`audio/L16;rate=24000`): mono, 16-bit. */
const DEFAULT_RATE = 24_000;
/** A line of ~15 words is ~5 s of 24 kHz WAV (~250 KB), ~330 KB as base64 JSON. */
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

interface GenerateContentResponse {
  candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

/**
 * Gemini text-to-speech (ADR 0039) through the REST `models.generateContent` (the TTS models don't
 * serve the Interactions API, and this SDK version maps `speechConfig` wrongly): one line per call,
 * a prebuilt voice, the line's language. Called through HttpClient: timeouts, no secrets in logs.
 * The answer is a WAV, or raw PCM that we wrap in one. 429 / 5xx / network: thrown (retried); any
 * other 4xx or an empty answer: ProviderRefusedError.
 */
export class GeminiSpeechProvider implements SpeechProvider {
  readonly name = 'gemini';
  private readonly http: HttpClient;

  constructor(
    apiKey: string,
    private readonly model: string,
    timeoutMs: number,
  ) {
    this.http = new HttpClient({
      name: 'gemini-tts',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      headers: { 'x-goog-api-key': apiKey },
      timeoutMs,
      totalTimeoutMs: timeoutMs,
      // POST: not retried here (JetStream redelivers with backoff).
      retry: { maxAttempts: 1 },
      maxResponseBytes: MAX_RESPONSE_BYTES,
    });
  }

  async speak({ text, voice, language }: SpeechRequest): Promise<SpokenAudio> {
    let body: GenerateContentResponse;
    try {
      const response = await this.http.post<GenerateContentResponse>(
        '/models/{model}:generateContent',
        {
          params: { model: this.model },
          body: {
            contents: [{ parts: [{ text }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                languageCode: SPEECH_LANGUAGES[language.split('-')[0]] ?? language,
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
              },
            },
          },
        },
      );
      body = response.data;
    } catch (error) {
      if (
        error instanceof UpstreamError &&
        error.kind === 'http' &&
        error.status !== undefined &&
        error.status < 500 &&
        error.status !== 429
      ) {
        throw new ProviderRefusedError(`Gemini TTS answered ${error.status}`);
      }
      throw error;
    }
    const inline = body.candidates?.[0]?.content?.parts?.find(
      (p) => p.inlineData?.data,
    )?.inlineData;
    if (!inline?.data)
      throw new ProviderRefusedError('Gemini TTS returned no audio', 'invalid_output');
    const bytes = Buffer.from(inline.data, 'base64');
    const rate = Number(/rate=(\d+)/.exec(inline.mimeType ?? '')?.[1] ?? DEFAULT_RATE);
    const wav = isWav(bytes)
      ? bytes
      : pcmToWav(bytes, { sampleRate: rate, channels: 1, bitsPerSample: 16 });
    const durationMs = wavDurationMs(wav);
    if (!durationMs)
      throw new ProviderRefusedError('Gemini TTS returned unreadable audio', 'invalid_output');
    return {
      wav,
      durationMs,
      model: this.model,
      inputTokens: body.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: body.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }
}
