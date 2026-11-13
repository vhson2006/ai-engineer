import type {
  StudioCompositionProps,
  StudioInputs,
  StudioScript,
  StudioTemplate,
} from '@app/common';
import { activeScenes, countWords } from './script-checks';

/** Vertical full HD (TikTok, Reels, Shorts), 30 frames per second. */
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
/** After each line, before the next scene. */
const TAIL_MS = 350;
const MIN_SCENE_MS = 1500;
/** Without a voice yet (preview of a fresh script): ~2.6 spoken words per second. */
const WORDS_PER_SECOND = 2.6;
/** The brand card stays a little after the last line. */
export const END_CARD_FRAMES = Math.round(1.5 * FPS);

export const DEFAULT_PRIMARY = '#111827';
export const DEFAULT_ACCENT = '#f59e0b';

export interface ResolvedAssets {
  brand: StudioCompositionProps['brand'];
  /** Image slot id → public URL. */
  images: Record<string, string>;
  /** Avatar slot id → public URL of the face. */
  avatars: Record<string, string>;
  /** Scene id → { url, durationMs } of its voice file (empty before the voice step). */
  voice: Record<string, { url: string; durationMs: number }>;
}

const frames = (ms: number) => Math.max(1, Math.ceil((ms / 1000) * FPS));

/**
 * The composition's props (ADR 0039): what render-worker renders and the admin previews. Scene
 * length follows its voice file, or an estimate from the word count before there is one.
 */
export function buildCompositionProps(
  template: StudioTemplate,
  inputs: StudioInputs,
  script: StudioScript,
  assets: ResolvedAssets,
): StudioCompositionProps {
  const scenes = activeScenes(template, inputs).flatMap((spec) => {
    const line = script.scenes.find((s) => s.id === spec.id);
    if (!line) return [];
    const voice = assets.voice[spec.id];
    const spokenMs = voice ? voice.durationMs : (countWords(line.voice) / WORDS_PER_SECOND) * 1000;
    const imageUrl = spec.image ? (assets.images[spec.image] ?? null) : null;
    const avatarUrl = spec.avatar ? (assets.avatars[spec.avatar] ?? null) : null;
    return [
      {
        id: spec.id,
        imageUrl,
        avatarUrl,
        avatarMode: avatarUrl ? (imageUrl ? ('corner' as const) : ('full' as const)) : null,
        voiceUrl: voice?.url ?? null,
        voice: line.voice,
        onScreen: line.onScreen,
        durationInFrames: frames(Math.max(MIN_SCENE_MS, spokenMs + TAIL_MS)),
      },
    ];
  });
  return {
    templateId: template.id,
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    brand: assets.brand,
    scenes,
    endCardFrames: END_CARD_FRAMES,
  };
}

/** Total length in milliseconds (for the admin before a render). */
export function totalMs(props: StudioCompositionProps): number {
  const total = props.scenes.reduce((sum, s) => sum + s.durationInFrames, 0) + props.endCardFrames;
  return Math.round((total / props.fps) * 1000);
}
