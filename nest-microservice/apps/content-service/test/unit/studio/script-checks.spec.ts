import { studioTemplate, type StudioInputs, type StudioScript } from '@app/common';
import { buildCompositionProps, END_CARD_FRAMES, totalMs } from '../../../src/studio/composition';
import {
  activeScenes,
  checkScript,
  countWords,
  numbersIn,
} from '../../../src/studio/script-checks';
import { htmlToText } from '../../../src/studio/projects.service';

const priceHook = studioTemplate('price-hook')!;
const inputs = (images: Record<string, string> = { hero: 'a', detail1: 'b' }): StudioInputs => ({
  images,
  avatars: {},
  voices: {},
  facts: { price: 'Giặt sấy từ 35.000đ/mẻ' },
});
const script: StudioScript = {
  hooks: ['Giặt sấy chỉ 35.000đ một mẻ?', 'Chỉ 35 nghìn!'],
  scenes: [
    { id: 'hook', voice: 'Giặt sấy chỉ 35.000đ một mẻ?', onScreen: 'Từ 35.000đ/mẻ' },
    { id: 'benefit1', voice: 'Mỗi khách một máy riêng.', onScreen: '1 khách = 1 máy' },
    { id: 'cta', voice: 'Gọi ngay cho tiệm nhé!', onScreen: 'Gọi 0909 123 456' },
  ],
  caption: 'Giặt sấy sạch thơm',
  hashtags: ['#giatsay'],
};

describe('[studio script checks] (unit)', () => {
  it('leaves out a scene whose optional image is empty', () => {
    expect(activeScenes(priceHook, inputs()).map((s) => s.id)).toEqual(['hook', 'benefit1', 'cta']);
    expect(activeScenes(priceHook, inputs({ hero: 'a', detail1: 'b', detail2: 'c' }))).toHaveLength(
      4,
    );
  });

  it('counts words and reads numbers as people write them', () => {
    expect(countWords('  Mỗi khách   một máy  ')).toBe(4);
    expect(numbersIn('Từ 35.000đ, mở 7:00, $59+')).toEqual(['35000', '700', '59']);
  });

  it('accepts a script within limits that uses only known numbers', () => {
    expect(
      checkScript(priceHook, inputs(), script, {
        facts: ['Giặt sấy từ 35.000đ/mẻ', '0909 123 456'],
        bannedPhrases: [],
      }),
    ).toEqual([]);
  });

  it('warns about length, banned phrases, invented numbers and missing scenes', () => {
    const bad: StudioScript = {
      ...script,
      scenes: [
        {
          id: 'hook',
          voice: 'Một hai ba bốn năm sáu bảy tám chín mười mười một mười hai mười ba',
          onScreen: 'Giảm 50% hôm nay cho mọi khách hàng thân thiết',
        },
        { id: 'cta', voice: 'Rẻ nhất Sài Gòn!', onScreen: 'Gọi ngay' },
      ],
    };
    const warnings = checkScript(priceHook, inputs(), bad, {
      facts: ['Giặt sấy từ 35.000đ/mẻ'],
      bannedPhrases: ['rẻ nhất'],
    });
    expect(warnings).toEqual(
      expect.arrayContaining([
        { code: 'too_many_words', scene: 'hook', detail: '16/12' },
        { code: 'on_screen_too_long', scene: 'hook', detail: expect.stringMatching(/\/28$/) },
        { code: 'unknown_number', scene: 'hook', detail: '50' },
        { code: 'missing_scene', scene: 'benefit1', detail: 'benefit1' },
        { code: 'banned_phrase', scene: 'cta', detail: 'rẻ nhất' },
      ]),
    );
  });

  it('builds the composition: scene length from the voice, avatar mode, brand card', () => {
    const props = buildCompositionProps(priceHook, inputs(), script, {
      brand: {
        name: 'SFaster',
        tagline: null,
        phone: '0909',
        callToAction: null,
        footerNote: null,
        primaryColor: '#13883a',
        accentColor: '#ffd400',
        logoUrl: null,
      },
      images: { hero: 'https://cdn/hero.webp', detail1: 'https://cdn/d1.webp' },
      avatars: {},
      voice: { hook: { url: 'https://cdn/hook.wav', durationMs: 2000 } },
    });
    expect(props.scenes.map((s) => s.id)).toEqual(['hook', 'benefit1', 'cta']);
    // 2000 ms of voice + 350 ms tail at 30 fps = 70.5 → 71 frames.
    expect(props.scenes[0]).toMatchObject({
      imageUrl: 'https://cdn/hero.webp',
      voiceUrl: 'https://cdn/hook.wav',
      durationInFrames: 71,
      avatarMode: null,
    });
    // No voice yet: estimated from the words, at least 1.5 s.
    expect(props.scenes[1].durationInFrames).toBeGreaterThanOrEqual(45);
    expect(props.scenes[2]).toMatchObject({ imageUrl: null, voiceUrl: null });
    expect(props.endCardFrames).toBe(END_CARD_FRAMES);
    expect(totalMs(props)).toBeGreaterThan(5000);
  });

  it('puts the host full screen without an image and in a corner with one', () => {
    const host = studioTemplate('host-intro')!;
    const hostInputs: StudioInputs = {
      images: { point1: 'p1', point2: 'p2', point3: 'p3' },
      avatars: { host: 'av' },
      voices: {},
      facts: { topic: 'x', points: 'y' },
    };
    const props = buildCompositionProps(
      host,
      hostInputs,
      {
        hooks: [],
        scenes: ['greet', 'point1', 'point2', 'point3', 'cta'].map((id) => ({
          id,
          voice: 'Xin chào',
          onScreen: 'Hi',
        })),
        caption: '',
        hashtags: [],
      },
      {
        brand: {
          name: 'X',
          tagline: null,
          phone: null,
          callToAction: null,
          footerNote: null,
          primaryColor: '#000000',
          accentColor: '#ffffff',
          logoUrl: null,
        },
        images: { point1: 'u1', point2: 'u2', point3: 'u3' },
        avatars: { host: 'face' },
        voice: {},
      },
    );
    expect(props.scenes.map((s) => [s.id, s.avatarMode])).toEqual([
      ['greet', 'full'],
      ['point1', 'corner'],
      ['point2', 'corner'],
      ['point3', 'corner'],
      ['cta', 'full'],
    ]);
  });

  it('turns article HTML into plain text for the AI', () => {
    expect(
      htmlToText(
        '<h2>Mẹo</h2><p>Phân loại <strong>đồ</strong> &amp; giặt</p><ul><li>Một</li></ul>',
      ),
    ).toBe('Mẹo\n Phân loại đồ & giặt\n Một');
  });
});
