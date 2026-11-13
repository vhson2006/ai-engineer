import {
  normalizeScript,
  type ScriptRequest,
  type ScriptWriter,
  type WrittenScript,
} from './script-writer';

/** No AI, no network: each line says what the scene is for, cut to its limits (tests, offline dev). */
export class FakeScriptWriter implements ScriptWriter {
  readonly name = 'fake';

  write(request: ScriptRequest): Promise<WrittenScript> {
    const cut = (text: string, words: number) => text.split(/\s+/).slice(0, words).join(' ');
    const scenes = request.scenes.map((scene) => ({
      id: scene.id,
      voice: cut(`[${request.language}] ${request.brand.name}: ${scene.purpose}`, scene.maxWords),
      onScreen: `${scene.id} · ${request.brand.name}`.slice(0, scene.onScreenMaxChars),
    }));
    const hooks = Array.from(
      { length: request.hookVariants },
      (_, i) => `${scenes[0].voice} (${i + 1})`,
    );
    const script = normalizeScript(request, {
      hooks,
      scenes,
      caption: `${request.brand.name} · ${request.brand.callToAction ?? ''}`.trim(),
      hashtags: ['fake', request.brand.name],
    })!;
    return Promise.resolve({ ...script, model: 'fake', inputTokens: 0, outputTokens: 0 });
  }
}
