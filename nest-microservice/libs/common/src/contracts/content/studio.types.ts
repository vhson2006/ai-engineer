import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import type { MediaImage } from './content.media';

/*
 * Video studio (ADR 0039): what the API answers, and the render events between content-service
 * and render-worker (web/apps/render-worker, which mirrors these shapes with zod).
 */

/**
 * draft → writing → written → voicing → voiced → rendering → rendered. A failed step returns to
 * the status before it with `error` set; editing the script after the voice clears the voice.
 * `suggesting` ("Suggest with AI" drafting the input fields) returns to where the project was.
 */
export const STUDIO_PROJECT_STATUSES = [
  'draft',
  'suggesting',
  'writing',
  'written',
  'voicing',
  'voiced',
  'rendering',
  'rendered',
] as const;
export type StudioProjectStatus = (typeof STUDIO_PROJECT_STATUSES)[number];

/** What the admin filled in, by slot id. Facts: text, or an article id for `article` facts. */
export interface StudioInputs {
  images: Record<string, string>;
  avatars: Record<string, string>;
  voices: Record<string, string>;
  facts: Record<string, string>;
  /**
   * With a voice (narration). Always true for a template whose narration is `required`; for an
   * `optional` one, false or absent = a silent video (no voice step).
   */
  narration?: boolean;
  /**
   * Facts drafted by "Suggest with AI" and not edited since (shown as drafts to check). Written by
   * the server only: an edited fact leaves the list.
   */
  suggested?: string[];
}

export interface StudioScriptScene {
  id: string;
  voice: string;
  onScreen: string;
}

export interface StudioScript {
  /** Variants of the first scene's line; `scenes[0].voice` is the one in use. */
  hooks: string[];
  scenes: StudioScriptScene[];
  caption: string;
  hashtags: string[];
}

export const STUDIO_WARNING_CODES = [
  'too_many_words',
  'on_screen_too_long',
  'banned_phrase',
  'unknown_number',
  'missing_scene',
] as const;
export type StudioWarningCode = (typeof STUDIO_WARNING_CODES)[number];

export interface StudioWarning {
  code: StudioWarningCode;
  /** The scene concerned, if any. */
  scene?: string;
  /** The words, phrase or number at stake (shown to the admin). */
  detail: string;
}

export interface StudioVoiceLine {
  id: string;
  url: string;
  durationMs: number;
}

export interface StudioVideo {
  renderId: string;
  /** The full-quality MP4 (1080×1920), for social networks. */
  url: string;
  sizeBytes: number;
  /** The light MP4 (720 wide) and its poster (JPEG) for web pages; null for older renders. */
  webUrl: string | null;
  webSizeBytes: number | null;
  posterUrl: string | null;
  durationMs: number;
  renderedAt: string;
}

/** What the composition renders: every input resolved to a public URL. Also the admin preview. */
export interface StudioCompositionProps {
  templateId: string;
  fps: number;
  width: number;
  height: number;
  brand: {
    name: string;
    tagline: string | null;
    phone: string | null;
    callToAction: string | null;
    footerNote: string | null;
    primaryColor: string;
    accentColor: string;
    logoUrl: string | null;
  };
  scenes: {
    id: string;
    imageUrl: string | null;
    avatarUrl: string | null;
    /** `full`: the avatar fills the frame; `corner`: a bubble over the image. */
    avatarMode: 'full' | 'corner' | null;
    voiceUrl: string | null;
    voice: string;
    onScreen: string;
    durationInFrames: number;
    /** The bento layouts (studio.templates.ts); absent: `image`. */
    layout?: 'image' | 'cover' | 'grid' | 'cards' | 'prices' | 'visit';
    /** `grid`: the images and their names. */
    gallery?: { url: string; label: string | null }[];
    /**
     * `cards`: title + text; `prices`: name + price (`highlight`: the signature line);
     * `visit`: the address (title null, one item per line), then the hours (`Days | Hours`).
     */
    items?: {
      title: string | null;
      text: string | null;
      highlight?: boolean;
      group?: 'address' | 'hours';
    }[];
    /** `cover`, `visit`: the website to show (fact `website`). */
    website?: string | null;
    /** Small titles in the video's language (`visit`: address, hours, phone; `prices`: signature). */
    labels?: Record<string, string>;
  }[];
  endCardFrames: number;
}

export interface StudioProjectResponse {
  id: string;
  siteId: string;
  templateId: string;
  templateVersion: number;
  title: string;
  language: string;
  status: StudioProjectStatus;
  brief: string | null;
  inputs: StudioInputs;
  script: StudioScript | null;
  warnings: StudioWarning[];
  voice: { lines: StudioVoiceLine[] } | null;
  video: StudioVideo | null;
  error: string | null;
  /** The props to preview (null until there is a script). */
  preview: StudioCompositionProps | null;
  createdAt: string;
  updatedAt: string;
}

export type StudioProjectSummary = Omit<
  StudioProjectResponse,
  'inputs' | 'script' | 'warnings' | 'voice' | 'preview'
>;

export interface StudioAvatarResponse {
  id: string;
  siteId: string;
  name: string;
  voice: string;
  consentNote: string;
  image: MediaImage;
  createdAt: string;
  updatedAt: string;
}

export interface StudioBrandKitResponse {
  siteId: string;
  brandName: string;
  tagline: string | null;
  phone: string | null;
  callToAction: string | null;
  tone: string | null;
  footerNote: string | null;
  website: string | null;
  address: string | null;
  hours: string | null;
  prices: string | null;
  bannedPhrases: string[];
  primaryColor: string;
  accentColor: string;
  logo: MediaImage | null;
  updatedAt: string | null;
}

/* ─────────────── Render events (content-service ⇄ render-worker) ─────────────── */

export const VIDEO_RENDER_EVENTS = {
  REQUESTED: 'events.video-render.requested',
  COMPLETED: 'events.video-render.completed',
  FAILED: 'events.video-render.failed',
} as const;

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
/** Only `studio/<siteId>/<projectId>/video/<renderId>.mp4` in the public bucket. */
export const VIDEO_OUTPUT_KEY = new RegExp(
  `^studio\\/[a-z0-9]+(?:-[a-z0-9]+)*\\/${UUID}\\/video\\/${UUID}\\.mp4$`,
);

/**
 * Next to each render's MP4 (`<renderId>.mp4`, full quality, for social networks) render-worker
 * writes the web files (ADR 0039): `<renderId>-web.mp4` (720 wide, lighter, faststart) and
 * `<renderId>.jpg` (its poster). Derived from the output key: no extra key travels in events.
 */
export function videoWebKeys(outputKey: string): { web: string; poster: string } {
  const base = outputKey.replace(/\.mp4$/, '');
  return { web: `${base}-web.mp4`, poster: `${base}.jpg` };
}

export class VideoRenderRequestedEvent {
  @IsUUID()
  renderId: string;

  @IsString()
  @MaxLength(50)
  siteId: string;

  @IsUUID()
  projectId: string;

  /** The Remotion composition = the template id. */
  @IsString()
  @MaxLength(40)
  composition: string;

  @IsObject()
  props: StudioCompositionProps;

  @Matches(VIDEO_OUTPUT_KEY)
  outputKey: string;
}

export class VideoRenderCompletedEvent {
  @IsUUID()
  renderId: string;

  @IsString()
  siteId: string;

  @Matches(VIDEO_OUTPUT_KEY)
  key: string;

  @IsInt()
  @Min(1)
  sizeBytes: number;

  /**
   * Size of the web MP4 (videoWebKeys(key).web), written with its poster. Optional: absent from a
   * worker that only writes the full-quality file (no web files then).
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  webSizeBytes?: number;

  @IsInt()
  @Min(1)
  durationMs: number;

  @IsInt()
  @Min(0)
  renderMs: number;
}

export const VIDEO_RENDER_FAILURES = ['render_failed', 'invalid_request'] as const;

export class VideoRenderFailedEvent {
  @IsUUID()
  renderId: string;

  @IsString()
  siteId: string;

  @IsIn(VIDEO_RENDER_FAILURES)
  reason: (typeof VIDEO_RENDER_FAILURES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  detail?: string;
}
