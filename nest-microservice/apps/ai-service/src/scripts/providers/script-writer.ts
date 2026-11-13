import type { ScriptWritingRequestedEvent, WrittenScene } from '@app/common';

/**
 * A video-script backend (ADR 0039), chosen by AI_SCRIPT_PROVIDER: `fake` (tests, offline: lines
 * built from the scene purposes) or `gemini`. Errors follow the translation providers:
 * ProviderRefusedError is permanent, anything else is transient (JetStream retries).
 */
export const SCRIPT_WRITER = Symbol('SCRIPT_WRITER');

export type ScriptRequest = Pick<
  ScriptWritingRequestedEvent,
  | 'language'
  | 'instructions'
  | 'brief'
  | 'brand'
  | 'facts'
  | 'bannedPhrases'
  | 'scenes'
  | 'hookVariants'
>;

export interface WrittenScript {
  hooks: string[];
  scenes: WrittenScene[];
  caption: string;
  hashtags: string[];
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ScriptWriter {
  readonly name: string;
  write(request: ScriptRequest): Promise<WrittenScript>;
}

/**
 * The answer in the contract's shape whatever the model did: every requested scene once, in
 * order (missing ones empty, unknown ones dropped), the first scene's line = the first hook,
 * lengths cut to the event limits. Null when there is nothing usable.
 */
export function normalizeScript(
  request: ScriptRequest,
  raw: { hooks?: unknown; scenes?: unknown; caption?: unknown; hashtags?: unknown },
): Omit<WrittenScript, 'model' | 'inputTokens' | 'outputTokens'> | null {
  const str = (value: unknown, max: number) =>
    typeof value === 'string' ? value.trim().slice(0, max) : '';
  const written = Array.isArray(raw.scenes) ? (raw.scenes as Record<string, unknown>[]) : [];
  const scenes = request.scenes.map((spec) => {
    const found = written.find((s) => s && s.id === spec.id);
    return { id: spec.id, voice: str(found?.voice, 600), onScreen: str(found?.onScreen, 200) };
  });
  const hooks = (Array.isArray(raw.hooks) ? raw.hooks : [])
    .map((h) => str(h, 600))
    .filter(Boolean)
    .slice(0, request.hookVariants);
  if (!hooks.length && scenes[0]?.voice) hooks.push(scenes[0].voice);
  if (!hooks.length || scenes.every((s) => !s.voice)) return null;
  scenes[0].voice = hooks[0];
  const hashtags = (Array.isArray(raw.hashtags) ? raw.hashtags : [])
    .map((h) => str(h, 60).replace(/^#?/, '#').replace(/\s+/g, ''))
    .filter((h) => h.length > 1)
    .slice(0, 15);
  return { hooks, scenes, caption: str(raw.caption, 2200), hashtags };
}
