import { GoogleGenAI } from '@google/genai';
import type { ImageAspectRatio } from '@app/common';
import { ProviderRefusedError } from '../../translation/providers/translation-provider';
import type { GeneratedPicture, ImageProvider } from './image-provider';

/** What every generated picture must respect, whatever the author typed. */
const GUARDRAILS =
  'An image for a small shop website. No text, letters, logos or watermarks in the image. No real, identifiable people.';

/**
 * Gemini image generation (`@google/genai`, Interactions API, ADR 0037): one 1K image per call,
 * JPEG (the only output it offers), the requested aspect ratio, `store: false`. Google adds an invisible SynthID watermark.
 * Paid only (no free tier for image models). Errors as GeminiTranslationProvider.
 */
export class GeminiImageProvider implements ImageProvider {
  readonly name = 'gemini';
  private readonly client: GoogleGenAI;

  constructor(
    apiKey: string,
    private readonly model: string,
    private readonly timeoutMs: number,
  ) {
    this.client = new GoogleGenAI({ apiKey, httpOptions: { timeout: timeoutMs } });
  }

  async generate({
    prompt,
    aspectRatio,
  }: {
    prompt: string;
    aspectRatio: ImageAspectRatio;
  }): Promise<GeneratedPicture> {
    let interaction: Awaited<ReturnType<GoogleGenAI['interactions']['create']>>;
    try {
      interaction = await this.client.interactions.create(
        {
          model: this.model,
          input: `${prompt}\n\n${GUARDRAILS}`,
          response_format: {
            type: 'image',
            aspect_ratio: aspectRatio,
            image_size: '1K',
            // The only output Flash-Lite Image accepts; re-encoded to WebP by optimizeImage anyway.
            mime_type: 'image/jpeg',
          },
          store: false,
        },
        { timeout: this.timeoutMs, maxRetries: 1 },
      );
    } catch (error) {
      const status = (error as { status?: unknown }).status;
      if (typeof status === 'number' && status >= 400 && status < 500 && status !== 429) {
        throw new ProviderRefusedError(`Gemini answered ${status}`);
      }
      throw error;
    }
    const data = interaction.output_image?.data;
    if (interaction.status !== 'completed' || !data) {
      // Usually a safety refusal of the prompt: asking again won't help.
      throw new ProviderRefusedError(`Gemini returned no image (${interaction.status})`);
    }
    return {
      data: Buffer.from(data, 'base64'),
      model: this.model,
      inputTokens: interaction.usage?.total_input_tokens ?? 0,
      outputTokens: interaction.usage?.total_output_tokens ?? 0,
    };
  }
}
