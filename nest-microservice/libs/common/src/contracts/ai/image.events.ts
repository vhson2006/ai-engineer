import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TRANSLATION_FAILURES, type TranslationFailure } from './translation.events';

/*
 * Image generation through ai-service (ADR 0037), on the EVENTS stream:
 *
 *   requester (content-service) ── events.image-generation.requested ──▶ ai-service
 *   ai-service ── events.image-generation.completed | …failed ──▶ requester
 *
 * The requester owns where the images go: each target is a key prefix in the PUBLIC bucket
 * (`media/<siteId>/<mediaId>/`); ai-service generates one image per target, optimizes it
 * (WebP, up to 3 widths, no metadata) and writes `<prefix><width>.webp`. No bytes in events.
 */
export const IMAGE_GENERATION_EVENTS = {
  REQUESTED: 'events.image-generation.requested',
  COMPLETED: 'events.image-generation.completed',
  FAILED: 'events.image-generation.failed',
} as const;

export const IMAGE_ASPECT_RATIOS = ['16:9', '4:3', '1:1', '3:4', '9:16'] as const;
export type ImageAspectRatio = (typeof IMAGE_ASPECT_RATIOS)[number];
export const IMAGE_GENERATION_MAX_COUNT = 4;
export const IMAGE_PROMPT_MAX_LENGTH = 1000;

/** Only inside the media area of the public bucket: `media/<siteId>/<uuid>/`. */
export const IMAGE_TARGET_PREFIX =
  /^media\/[a-z0-9]+(?:-[a-z0-9]+)*\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/$/;

export class ImageTarget {
  @IsUUID()
  mediaId: string;

  @Matches(IMAGE_TARGET_PREFIX)
  keyPrefix: string;
}

export class ImageGenerationRequestedEvent {
  @IsUUID()
  jobId: string;

  @IsString()
  @MaxLength(50)
  requester: string;

  @IsString()
  @MaxLength(50)
  siteId: string;

  @IsString()
  @MaxLength(IMAGE_PROMPT_MAX_LENGTH)
  prompt: string;

  @IsIn(IMAGE_ASPECT_RATIOS)
  aspectRatio: ImageAspectRatio;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(IMAGE_GENERATION_MAX_COUNT)
  @ValidateNested({ each: true })
  @Type(() => ImageTarget)
  targets: ImageTarget[];

  @IsOptional()
  @IsString()
  actorId?: string;
}

export class GeneratedImageVariant {
  @IsInt()
  @Min(1)
  width: number;

  @IsInt()
  @Min(1)
  height: number;

  @IsInt()
  @Min(1)
  size: number;
}

export class GeneratedImage {
  @IsUUID()
  mediaId: string;

  /** Always image/webp (optimized by ai-service). */
  @IsString()
  contentType: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GeneratedImageVariant)
  variants: GeneratedImageVariant[];
}

export class ImageGenerationCompletedEvent {
  @IsUUID()
  jobId: string;

  @IsString()
  requester: string;

  @IsString()
  siteId: string;

  /** The targets that got an image (a partial result when some failed). */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeneratedImage)
  images: GeneratedImage[];

  @IsString()
  provider: string;

  @IsString()
  model: string;
}

export class ImageGenerationFailedEvent {
  @IsUUID()
  jobId: string;

  @IsString()
  requester: string;

  @IsString()
  siteId: string;

  @IsIn(TRANSLATION_FAILURES)
  reason: TranslationFailure;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  detail?: string;
}
