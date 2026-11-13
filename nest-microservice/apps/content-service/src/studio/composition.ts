import type {
  StudioCompositionProps,
  StudioInputs,
  StudioScene,
  StudioScript,
  StudioTemplate,
} from '@app/common';
import { activeScenes, countWords, narrated } from './script-checks';

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
/** Bento lists: what fits on a 1080×1920 frame. */
const MAX_CARDS = 4;
const MAX_PRICES = 4;
const MAX_LINES = 7;

export const DEFAULT_PRIMARY = '#111827';
export const DEFAULT_ACCENT = '#f59e0b';

type CompositionScene = StudioCompositionProps['scenes'][number];
type Item = NonNullable<CompositionScene['items']>[number];

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

/** The non-empty lines of a fact. */
export function factLines(text: string | undefined, max = MAX_LINES): string[] {
  return (text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, max);
}

/** `Title | text` (also `Title: text` when there is no bar); without a separator: a title only. */
export function splitPair(line: string): { title: string; text: string | null } {
  const bar = line.indexOf('|');
  const colon = line.indexOf(':');
  // A colon inside a time ("9:30") is not a separator: only "word: text".
  const at = bar >= 0 ? bar : colon > 0 && line[colon + 1] === ' ' ? colon : -1;
  if (at < 0) return { title: line, text: null };
  const title = line.slice(0, at).trim();
  const text = line.slice(at + 1).trim();
  return title ? { title, text: text || null } : { title: text, text: null };
}

/** Labels shown in the video, in its language (the facts' own labels where they exist). */
function labelsFor(template: StudioTemplate, language: string): Record<string, string> {
  const locale = language === 'vi' ? 'vi' : 'en';
  const fact = (id: string) => template.facts.find((f) => f.id === id)?.label[locale];
  return {
    address: fact('address') ?? (locale === 'vi' ? 'Địa chỉ' : 'Address'),
    hours: fact('hours') ?? (locale === 'vi' ? 'Giờ mở cửa' : 'Hours'),
    signature: fact('signature') ?? (locale === 'vi' ? 'Nổi bật' : 'Signature'),
    phone: locale === 'vi' ? 'Gọi đặt lịch' : 'Call to book',
  };
}

/** What a bento scene shows besides its headline: images, items, website, labels. */
function layoutParts(
  spec: StudioScene,
  inputs: StudioInputs,
  assets: ResolvedAssets,
  labels: Record<string, string>,
): Partial<CompositionScene> {
  const facts = inputs.facts;
  const website = facts.website?.trim() || null;
  switch (spec.layout) {
    case 'cover':
      return { layout: 'cover', website };
    case 'grid': {
      const names = factLines(spec.items ? facts[spec.items] : undefined, 6);
      const gallery = (spec.images ?? []).flatMap((slot, index) => {
        const url = assets.images[slot];
        return url ? [{ url, label: names[index] ?? null }] : [];
      });
      return { layout: 'grid', gallery };
    }
    case 'cards':
      return {
        layout: 'cards',
        items: factLines(spec.items ? facts[spec.items] : undefined, MAX_CARDS).map(splitPair),
      };
    case 'prices': {
      const rows: Item[] = factLines(spec.items ? facts[spec.items] : undefined, MAX_PRICES).map(
        splitPair,
      );
      const signature = factLines(spec.extra ? facts[spec.extra] : undefined, 1)[0];
      if (signature) rows.push({ ...splitPair(signature), highlight: true });
      return { layout: 'prices', items: rows, labels: { signature: labels.signature } };
    }
    case 'visit': {
      const address = factLines(spec.items ? facts[spec.items] : undefined, 3).map(
        (line): Item => ({ title: null, text: line, group: 'address' }),
      );
      const hours = factLines(spec.extra ? facts[spec.extra] : undefined).map((line): Item => ({
        ...splitPair(line),
        group: 'hours',
      }));
      return {
        layout: 'visit',
        items: [...address, ...hours],
        website,
        labels: { address: labels.address, hours: labels.hours, phone: labels.phone },
      };
    }
    default:
      return {};
  }
}

/**
 * The composition's props (ADR 0039): what render-worker renders and the admin previews. Scene
 * length follows its voice file (or an estimate from the word count before there is one), and is
 * at least the scene's `seconds`; a silent video keeps the `seconds`.
 */
export function buildCompositionProps(
  template: StudioTemplate,
  inputs: StudioInputs,
  script: StudioScript,
  assets: ResolvedAssets,
  language = 'en',
): StudioCompositionProps {
  const withVoice = narrated(template, inputs);
  const labels = labelsFor(template, language);
  const scenes = activeScenes(template, inputs).flatMap((spec) => {
    const line = script.scenes.find((s) => s.id === spec.id);
    if (!line) return [];
    const voice = withVoice ? assets.voice[spec.id] : undefined;
    const spokenMs = !withVoice
      ? 0
      : voice
        ? voice.durationMs + TAIL_MS
        : (countWords(line.voice) / WORDS_PER_SECOND) * 1000 + TAIL_MS;
    const imageUrl = spec.image ? (assets.images[spec.image] ?? null) : null;
    const avatarUrl = spec.avatar ? (assets.avatars[spec.avatar] ?? null) : null;
    return [
      {
        id: spec.id,
        imageUrl,
        avatarUrl,
        avatarMode: avatarUrl ? (imageUrl ? ('corner' as const) : ('full' as const)) : null,
        voiceUrl: voice?.url ?? null,
        // Silent: no subtitle either.
        voice: withVoice ? line.voice : '',
        onScreen: line.onScreen,
        durationInFrames: frames(Math.max(MIN_SCENE_MS, (spec.seconds ?? 0) * 1000, spokenMs)),
        ...layoutParts(spec, inputs, assets, labels),
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
    endCardFrames: template.endCard === false ? 0 : END_CARD_FRAMES,
  };
}

/** Total length in milliseconds (for the admin before a render). */
export function totalMs(props: StudioCompositionProps): number {
  const total = props.scenes.reduce((sum, s) => sum + s.durationInFrames, 0) + props.endCardFrames;
  return Math.round((total / props.fps) * 1000);
}
