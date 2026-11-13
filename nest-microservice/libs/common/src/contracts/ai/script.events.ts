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
import { TRANSLATION_FAILURES, type TranslationFailure } from './translation.events';

/*
 * Video script writing through ai-service (ADR 0039), on the EVENTS stream:
 *
 *   requester (content-service studio) ── events.script-writing.requested ──▶ ai-service
 *   ai-service ── events.script-writing.completed | …failed ──▶ requester
 *
 * The request is self-contained: the brand, the facts the script may use, and each scene's purpose
 * and limits. The model writes one spoken line and one on-screen text per scene, several variants
 * of the FIRST scene's line (the hook), a caption and hashtags. It must not invent facts; the
 * requester checks the answer again (limits, banned phrases, numbers) and shows warnings.
 */
export const SCRIPT_WRITING_EVENTS = {
  REQUESTED: 'events.script-writing.requested',
  COMPLETED: 'events.script-writing.completed',
  FAILED: 'events.script-writing.failed',
} as const;

export const SCRIPT_MAX_SCENES = 12;
export const SCRIPT_MAX_FACTS = 10;
/** A fact may be a whole article's text (article-tips). */
export const SCRIPT_MAX_FACT_LENGTH = 12_000;
export const SCRIPT_MAX_HOOKS = 3;

const LOCALE = /^[a-z]{2}(-[A-Z]{2})?$/;
const SCENE_ID = /^[a-z][a-z0-9-]{0,39}$/;

export class ScriptBrand {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tagline?: string;

  /** "friendly, short sentences"… */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  tone?: string;

  /** The closing line's intent ("call or message on Zalo"). */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  callToAction?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
}

export class ScriptFact {
  @Matches(SCENE_ID)
  id: string;

  @IsString()
  @MaxLength(SCRIPT_MAX_FACT_LENGTH)
  text: string;
}

export class ScriptSceneSpec {
  @Matches(SCENE_ID)
  id: string;

  /** What the scene must do, in English (from the template). */
  @IsString()
  @MaxLength(500)
  purpose: string;

  @IsInt()
  @Min(3)
  @Max(60)
  maxWords: number;

  @IsInt()
  @Min(8)
  @Max(80)
  onScreenMaxChars: number;
}

export class ScriptWritingRequestedEvent {
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

  /** The template's own instructions (format, structure). */
  @IsString()
  @MaxLength(1000)
  instructions: string;

  /** What the admin wants this clip to say (optional). */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  brief?: string;

  @ValidateNested()
  @Type(() => ScriptBrand)
  brand: ScriptBrand;

  @IsArray()
  @ArrayMaxSize(SCRIPT_MAX_FACTS)
  @ValidateNested({ each: true })
  @Type(() => ScriptFact)
  facts: ScriptFact[];

  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  bannedPhrases: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(SCRIPT_MAX_SCENES)
  @ValidateNested({ each: true })
  @Type(() => ScriptSceneSpec)
  scenes: ScriptSceneSpec[];

  @IsInt()
  @Min(1)
  @Max(SCRIPT_MAX_HOOKS)
  hookVariants: number;

  @IsOptional()
  @IsString()
  actorId?: string;
}

export class WrittenScene {
  @Matches(SCENE_ID)
  id: string;

  /** The spoken line. */
  @IsString()
  @MaxLength(600)
  voice: string;

  /** The short text shown on screen. */
  @IsString()
  @MaxLength(200)
  onScreen: string;
}

export class ScriptWritingCompletedEvent {
  @IsUUID()
  jobId: string;

  @IsString()
  requester: string;

  @IsString()
  siteId: string;

  /** Variants of the first scene's spoken line (the first one is also in `scenes[0]`). */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(SCRIPT_MAX_HOOKS)
  @IsString({ each: true })
  @MaxLength(600, { each: true })
  hooks: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(SCRIPT_MAX_SCENES)
  @ValidateNested({ each: true })
  @Type(() => WrittenScene)
  scenes: WrittenScene[];

  @IsString()
  @MaxLength(2200)
  caption: string;

  @IsArray()
  @ArrayMaxSize(15)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  hashtags: string[];

  @IsString()
  provider: string;

  @IsString()
  model: string;
}

export class ScriptWritingFailedEvent {
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
