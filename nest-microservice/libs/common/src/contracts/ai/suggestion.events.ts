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
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ScriptBrand, ScriptFact } from './script.events';
import { TRANSLATION_FAILURES, type TranslationFailure } from './translation.events';

/*
 * Draft texts for a video project's input fields (ADR 0039, "Suggest with AI"), on EVENTS:
 *
 *   requester (content-service studio) ── events.fact-suggestion.requested ──▶ ai-service
 *   ai-service ── events.fact-suggestion.completed | …failed ──▶ requester
 *
 * Only descriptive fields are asked for (promises, benefits, key points, names of the pictured
 * looks); prices, hours, addresses and phones never are: they come from the business. A field may
 * come with images of the site's media library (storage keys, e.g. to name each pictured look).
 * The requester fills only the fields still empty and checks the numbers again.
 */
export const FACT_SUGGESTION_EVENTS = {
  REQUESTED: 'events.fact-suggestion.requested',
  COMPLETED: 'events.fact-suggestion.completed',
  FAILED: 'events.fact-suggestion.failed',
} as const;

export const SUGGESTION_MAX_FIELDS = 10;
export const SUGGESTION_MAX_IMAGES = 6;

const LOCALE = /^[a-z]{2}(-[A-Z]{2})?$/;
const FIELD_ID = /^[a-z][a-z0-9-]{0,39}$/;
/** A size of a media-library image: `media/<siteId>/<mediaId>/<width>.webp|jpg`. */
export const SUGGESTION_IMAGE_KEY =
  /^media\/[a-z0-9]+(?:-[a-z0-9]+)*\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/\d{1,4}\.(webp|jpg)$/;

export class SuggestionField {
  @Matches(FIELD_ID)
  id: string;

  /** What the field is, in the request's language (the admin's label). */
  @IsString()
  @MaxLength(100)
  label: string;

  /** The format expected (e.g. "Title | short text, one per line"). */
  @IsString()
  @MaxLength(300)
  hint: string;

  @IsInt()
  @Min(20)
  @Max(2000)
  maxLength: number;

  /** One item per line, at most this many lines; absent: free text. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  lines?: number;

  /** Images the field is about, in order (one line per image). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(SUGGESTION_MAX_IMAGES)
  @Matches(SUGGESTION_IMAGE_KEY, { each: true })
  images?: string[];
}

export class FactSuggestionRequestedEvent {
  @IsUUID()
  jobId: string;

  @IsString()
  @MaxLength(50)
  requester: string;

  @IsString()
  @MaxLength(50)
  siteId: string;

  @Matches(LOCALE)
  language: string;

  /** The template, in English (what kind of video the fields are for). */
  @IsString()
  @MaxLength(1000)
  template: string;

  /** The video's title, as the admin typed it. */
  @IsString()
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  brief?: string;

  @ValidateNested()
  @Type(() => ScriptBrand)
  brand: ScriptBrand;

  /** Fields already filled (context only: never to be repeated or changed). */
  @IsArray()
  @ArrayMaxSize(SUGGESTION_MAX_FIELDS)
  @ValidateNested({ each: true })
  @Type(() => ScriptFact)
  known: ScriptFact[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(SUGGESTION_MAX_FIELDS)
  @ValidateNested({ each: true })
  @Type(() => SuggestionField)
  fields: SuggestionField[];

  @IsOptional()
  @IsString()
  actorId?: string;
}

export class SuggestedFact {
  @Matches(FIELD_ID)
  id: string;

  @IsString()
  @MaxLength(2000)
  text: string;
}

export class FactSuggestionCompletedEvent {
  @IsUUID()
  jobId: string;

  @IsString()
  requester: string;

  @IsString()
  siteId: string;

  @IsArray()
  @ArrayMaxSize(SUGGESTION_MAX_FIELDS)
  @ValidateNested({ each: true })
  @Type(() => SuggestedFact)
  facts: SuggestedFact[];

  @IsString()
  provider: string;

  @IsString()
  model: string;
}

export class FactSuggestionFailedEvent {
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
