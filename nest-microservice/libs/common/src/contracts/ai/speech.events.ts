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
 * Text to speech through ai-service (ADR 0039), on the EVENTS stream:
 *
 *   requester (content-service studio) ── events.speech.requested ──▶ ai-service
 *   ai-service ── events.speech.completed | …failed ──▶ requester
 *
 * One request = the lines of one video, each with its voice. The requester chooses where the audio
 * goes: a key prefix in the PUBLIC bucket (`studio/<siteId>/<uuid>/voice/<uuid>/`, the only shape
 * accepted; ai-service checks the site again) and ai-service writes `<prefix><lineId>.wav`. No
 * bytes in events: the answer carries each file's key and duration (scene timing follows them).
 */
export const SPEECH_EVENTS = {
  REQUESTED: 'events.speech.requested',
  COMPLETED: 'events.speech.completed',
  FAILED: 'events.speech.failed',
} as const;

export const SPEECH_MAX_LINES = 12;
export const SPEECH_MAX_LINE_LENGTH = 600;

const LOCALE = /^[a-z]{2}(-[A-Z]{2})?$/;
const LINE_ID = /^[a-z][a-z0-9-]{0,39}$/;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/** Only inside the studio area of the public bucket: `studio/<siteId>/<uuid>/voice/<uuid>/`. */
export const SPEECH_KEY_PREFIX = new RegExp(
  `^studio\\/[a-z0-9]+(?:-[a-z0-9]+)*\\/${UUID}\\/voice\\/${UUID}\\/$`,
);

export class SpeechLine {
  @Matches(LINE_ID)
  id: string;

  @IsString()
  @MaxLength(SPEECH_MAX_LINE_LENGTH)
  text: string;

  /** A voice of STUDIO_VOICES (the provider's prebuilt voice name). */
  @IsString()
  @MaxLength(40)
  voice: string;
}

export class SpeechRequestedEvent {
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

  @Matches(SPEECH_KEY_PREFIX)
  keyPrefix: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(SPEECH_MAX_LINES)
  @ValidateNested({ each: true })
  @Type(() => SpeechLine)
  lines: SpeechLine[];

  @IsOptional()
  @IsString()
  actorId?: string;
}

export class SpokenLine {
  @Matches(LINE_ID)
  id: string;

  @IsString()
  @MaxLength(300)
  key: string;

  @IsInt()
  @Min(1)
  durationMs: number;

  @IsInt()
  @Min(1)
  size: number;
}

export class SpeechCompletedEvent {
  @IsUUID()
  jobId: string;

  @IsString()
  requester: string;

  @IsString()
  siteId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(SPEECH_MAX_LINES)
  @ValidateNested({ each: true })
  @Type(() => SpokenLine)
  lines: SpokenLine[];

  @IsString()
  provider: string;

  @IsString()
  model: string;
}

export class SpeechFailedEvent {
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
