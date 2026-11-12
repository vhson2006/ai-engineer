import type { ImageAspectRatio } from '@app/common';

/**
 * An image-generation backend (ADR 0037), chosen by AI_IMAGE_PROVIDER: `fake` (tests, offline:
 * a plain picture drawn locally), `gemini` (Gemini Flash-Lite Image). One call = one image.
 * Errors follow the translation providers: ProviderRefusedError is permanent, anything else is
 * transient (JetStream retries).
 */
export const IMAGE_PROVIDER = Symbol('IMAGE_PROVIDER');

export interface GeneratedPicture {
  /** The provider's bytes (PNG/JPEG…): optimized afterwards by ImageOptimizer. */
  data: Buffer;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ImageProvider {
  readonly name: string;
  generate(request: { prompt: string; aspectRatio: ImageAspectRatio }): Promise<GeneratedPicture>;
}
