import { IMAGE_ASPECT_RATIOS, IMAGE_GENERATION_MAX_COUNT, IMAGE_PROMPT_MAX_LENGTH } from '@web/core/api/image-generation';
import { z } from 'zod';

/**
 * Declaring an upload to the media library: mirrors CreateMediaUploadDto (nest-microservice
 * libs/common content.media.ts); the API checks it again (ratios, distinct widths).
 */
export const MEDIA_MAX_WIDTH = 1920;
export const MEDIA_MAX_HEIGHT = 4800;
export const MEDIA_MAX_BYTES = 3 * 1024 * 1024;

const variant = z.object({
  width: z.number().int().min(1).max(MEDIA_MAX_WIDTH),
  height: z.number().int().min(1).max(MEDIA_MAX_HEIGHT),
  size: z.number().int().min(1).max(MEDIA_MAX_BYTES),
});

export const mediaUploadSchema = z.object({
  filename: z.string().trim().min(1, 'required').max(200, 'tooLong'),
  contentType: z.enum(['image/webp', 'image/jpeg']),
  variants: z.array(variant).min(1).max(3),
});

/** Generating images with AI (ADR 0037): mirrors GenerateMediaDto; the API checks the quota. */
export const mediaGenerateSchema = z.object({
  prompt: z.string().trim().min(1, 'required').max(IMAGE_PROMPT_MAX_LENGTH, 'tooLong'),
  aspectRatio: z.enum(IMAGE_ASPECT_RATIOS),
  count: z.number().int().min(1).max(IMAGE_GENERATION_MAX_COUNT),
});
