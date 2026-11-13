/**
 * A text-to-speech backend (ADR 0039), chosen by AI_SPEECH_PROVIDER: `fake` (tests, offline: a
 * quiet tone as long as the words would take) or `gemini` (Gemini TTS, prebuilt voices). One call
 * = one line. Errors: ProviderRefusedError is permanent, anything else transient (retried).
 */
export const SPEECH_PROVIDER = Symbol('SPEECH_PROVIDER');

export interface SpeechRequest {
  text: string;
  /** A prebuilt voice name (STUDIO_VOICES). */
  voice: string;
  language: string;
}

export interface SpokenAudio {
  /** A PCM WAV file. */
  wav: Buffer;
  durationMs: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface SpeechProvider {
  readonly name: string;
  speak(request: SpeechRequest): Promise<SpokenAudio>;
}
