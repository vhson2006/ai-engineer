/**
 * Limits of AI image generation (ADR 0037), mirroring libs/common image.events.ts. A module with
 * no imports: client components and zod schemas use it (`@web/core/api` pulls server-only code).
 */
export const IMAGE_ASPECT_RATIOS = ['16:9', '4:3', '1:1', '3:4', '9:16'] as const;
export type ImageAspectRatio = (typeof IMAGE_ASPECT_RATIOS)[number];
export const IMAGE_GENERATION_MAX_COUNT = 4;
export const IMAGE_PROMPT_MAX_LENGTH = 1000;
