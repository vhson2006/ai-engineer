import { describe, expect, it } from 'vitest';
import { assetsWithin, studioPropsSchema, totalFrames, type StudioVideoProps } from './props';

const props: StudioVideoProps = {
  templateId: 'price-hook',
  fps: 30,
  width: 1080,
  height: 1920,
  brand: {
    name: 'SFaster',
    tagline: null,
    phone: null,
    callToAction: null,
    footerNote: null,
    primaryColor: '#13883a',
    accentColor: '#ffd400',
    logoUrl: 'https://cdn.test/media/laundry/l/640.webp',
  },
  scenes: [
    {
      id: 'hook',
      imageUrl: 'https://cdn.test/media/laundry/a/1280.webp',
      avatarUrl: null,
      avatarMode: null,
      voiceUrl: 'https://cdn.test/studio/laundry/p/voice/j/hook.wav',
      voice: 'Chỉ 35.000đ',
      onScreen: '35.000đ',
      durationInFrames: 60,
    },
  ],
  endCardFrames: 45,
};

describe('studio props', () => {
  it('accepts what content-service sends and adds up the frames', () => {
    expect(studioPropsSchema.parse(props)).toEqual(props);
    expect(totalFrames(props)).toBe(105);
  });

  it('refuses a non-http asset, a bad colour or no scene', () => {
    const bad = [
      { ...props, brand: { ...props.brand, logoUrl: 'file:///etc/passwd' } },
      { ...props, brand: { ...props.brand, primaryColor: 'red' } },
      { ...props, scenes: [] },
    ];
    for (const value of bad) expect(studioPropsSchema.safeParse(value).success).toBe(false);
  });

  it('keeps every asset on the storage origin (no SSRF from the renderer)', () => {
    expect(assetsWithin(props, ['https://cdn.test'])).toBe(true);
    expect(assetsWithin(props, ['https://cdn.test/'])).toBe(true);
    const evil = {
      ...props,
      scenes: [{ ...props.scenes[0], imageUrl: 'http://10.0.0.1/admin' }],
    };
    expect(assetsWithin(evil, ['https://cdn.test'])).toBe(false);
    // A look-alike host is not the origin.
    const lookalike = {
      ...props,
      scenes: [{ ...props.scenes[0], voiceUrl: 'https://cdn.test.evil.io/x.wav' }],
    };
    expect(assetsWithin(lookalike, ['https://cdn.test'])).toBe(false);
  });
});
