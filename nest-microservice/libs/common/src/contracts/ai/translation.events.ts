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

/*
 * Machine translation through ai-service (ADR 0036), on the EVENTS stream (ADR 0007/0024):
 *
 *   requester (content-service) ── events.translation.requested ──▶ ai-service
 *   ai-service ── events.translation.completed | events.translation.failed ──▶ requester
 *
 * The request carries TEXT SEGMENTS, not documents: the requester keeps the structure (HTML
 * blocks, classes, images) and puts the translated segments back in place. A segment may hold
 * inline markup (<strong>, <em>, <a href>, <code>, <br>) that the translation must keep as is.
 * `requester` lets each requester ignore the results of the others' jobs.
 */
export const TRANSLATION_EVENTS = {
  REQUESTED: 'events.translation.requested',
  COMPLETED: 'events.translation.completed',
  FAILED: 'events.translation.failed',
} as const;

/** Limits that keep one request within one model call (and a NATS message well under 1 MB). */
export const TRANSLATION_MAX_SEGMENTS = 600;
export const TRANSLATION_MAX_SEGMENT_LENGTH = 8_000;

const LOCALE = /^[a-z]{2}(-[A-Z]{2})?$/;

/** A term the translation must render one way (brand names, the shop's slogans). */
export class GlossaryEntry {
  @IsString()
  @MaxLength(200)
  source: string;

  /** Same as `source` for a term that must never be translated. */
  @IsString()
  @MaxLength(200)
  target: string;
}

export class TranslationRequestedEvent {
  @IsUUID()
  jobId: string;

  /** Which service asked (and receives the result): e.g. "content-service". */
  @IsString()
  @MaxLength(50)
  requester: string;

  @IsString()
  @MaxLength(50)
  siteId: string;

  @Matches(LOCALE)
  sourceLocale: string;

  @Matches(LOCALE)
  targetLocale: string;

  /** What is translated, for the model's tone: "article" (a blog post of a small shop). */
  @IsString()
  @MaxLength(50)
  kind: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(TRANSLATION_MAX_SEGMENTS)
  @IsString({ each: true })
  @MaxLength(TRANSLATION_MAX_SEGMENT_LENGTH, { each: true })
  segments: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => GlossaryEntry)
  glossary?: GlossaryEntry[];

  /** Keycloak `sub` of who asked. */
  @IsOptional()
  @IsString()
  actorId?: string;
}

export class TranslationCompletedEvent {
  @IsUUID()
  jobId: string;

  @IsString()
  requester: string;

  @IsString()
  siteId: string;

  @Matches(LOCALE)
  targetLocale: string;

  /** Same length and order as the request's segments. */
  @IsArray()
  @ArrayMaxSize(TRANSLATION_MAX_SEGMENTS)
  @IsString({ each: true })
  segments: string[];

  /** e.g. "gemini" / "fake", and the model id: shown to the reviewer as "machine translation". */
  @IsString()
  provider: string;

  @IsString()
  model: string;
}

export const TRANSLATION_FAILURES = [
  /** The provider kept failing (outage, rate limits) until the retries ran out. */
  'provider_unavailable',
  /** The provider refused the request (safety, quota, invalid request). */
  'provider_refused',
  /** The answer didn't match the request (count of segments, not JSON). */
  'invalid_output',
  /** No provider is configured for translation. */
  'not_configured',
] as const;
export type TranslationFailure = (typeof TRANSLATION_FAILURES)[number];

export class TranslationFailedEvent {
  @IsUUID()
  jobId: string;

  @IsString()
  requester: string;

  @IsString()
  siteId: string;

  @IsIn(TRANSLATION_FAILURES)
  reason: TranslationFailure;

  /** For logs and the admin: short, never a provider's raw answer or a key. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  detail?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  attempts?: number;
}
