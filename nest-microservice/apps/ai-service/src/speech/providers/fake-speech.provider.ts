import { pcmToWav } from '../wav';
import type { SpeechProvider, SpeechRequest, SpokenAudio } from './speech-provider';

const RATE = 24_000;
const WORDS_PER_SECOND = 2.6;

/** No AI, no network: a soft 220 Hz tone as long as the words would take (tests, offline dev). */
export class FakeSpeechProvider implements SpeechProvider {
  readonly name = 'fake';

  speak({ text }: SpeechRequest): Promise<SpokenAudio> {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const seconds = Math.max(0.8, words / WORDS_PER_SECOND);
    const samples = Math.round(seconds * RATE);
    const pcm = Buffer.alloc(samples * 2);
    for (let i = 0; i < samples; i++) {
      pcm.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 220 * i) / RATE) * 1500), i * 2);
    }
    return Promise.resolve({
      wav: pcmToWav(pcm, { sampleRate: RATE, channels: 1, bitsPerSample: 16 }),
      durationMs: Math.round((samples / RATE) * 1000),
      model: 'fake',
      inputTokens: 0,
      outputTokens: 0,
    });
  }
}
