import { FakeScriptWriter } from '../../../src/scripts/providers/fake-script.writer';
import { scriptInstruction } from '../../../src/scripts/providers/gemini-script.writer';
import { normalizeScript, type ScriptRequest } from '../../../src/scripts/providers/script-writer';

describe('[script-writer] (unit)', () => {
  const request: ScriptRequest = {
    language: 'vi',
    instructions: 'A fast price-led clip.',
    brand: { name: 'SFaster', callToAction: 'Gọi hoặc nhắn Zalo' },
    facts: [{ id: 'price', text: 'Giặt sấy 35.000đ/mẻ' }],
    bannedPhrases: ['rẻ nhất'],
    scenes: [
      { id: 'hook', purpose: 'Hook with the price', maxWords: 12, onScreenMaxChars: 28 },
      { id: 'cta', purpose: 'Call to action', maxWords: 12, onScreenMaxChars: 30 },
    ],
    hookVariants: 3,
  };

  it('keeps every requested scene once, in order; the first line is the first hook', () => {
    const script = normalizeScript(request, {
      hooks: ['  Chỉ 35.000đ một mẻ? ', 'Giặt sấy 35.000đ!', 'Ba', 'Bốn (one too many)'],
      scenes: [
        { id: 'cta', voice: 'Gọi tiệm nhé', onScreen: 'Gọi ngay' },
        { id: 'unknown', voice: 'x', onScreen: 'y' },
      ],
      caption: 'Caption',
      hashtags: ['giat say', '#sfaster', ''],
    });
    expect(script).toEqual({
      hooks: ['Chỉ 35.000đ một mẻ?', 'Giặt sấy 35.000đ!', 'Ba'],
      scenes: [
        { id: 'hook', voice: 'Chỉ 35.000đ một mẻ?', onScreen: '' },
        { id: 'cta', voice: 'Gọi tiệm nhé', onScreen: 'Gọi ngay' },
      ],
      caption: 'Caption',
      hashtags: ['#giatsay', '#sfaster'],
    });
  });

  it('returns null when nothing usable came back', () => {
    expect(normalizeScript(request, {})).toBeNull();
    expect(normalizeScript(request, { scenes: 'nope', hooks: [42] })).toBeNull();
  });

  it('the fake writer answers a valid script within the word limits', async () => {
    const script = await new FakeScriptWriter().write(request);
    expect(script.hooks).toHaveLength(3);
    expect(script.scenes.map((s) => s.id)).toEqual(['hook', 'cta']);
    for (const [i, scene] of script.scenes.entries()) {
      expect(scene.onScreen.length).toBeLessThanOrEqual(request.scenes[i].onScreenMaxChars);
    }
  });

  it('tells the model the language, the limits, the facts-only rule and the banned phrases', () => {
    const text = scriptInstruction(request);
    expect(text).toContain('in Vietnamese');
    expect(text).toContain('maxWords');
    expect(text).toContain('Use ONLY facts');
    expect(text).toContain('"rẻ nhất"');
    expect(text).toContain('3 different variants');
  });
});
