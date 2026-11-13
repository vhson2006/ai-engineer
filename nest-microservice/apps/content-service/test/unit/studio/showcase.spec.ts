import { studioTemplate, type StudioInputs, type StudioScript } from '@app/common';
import { buildCompositionProps, factLines, splitPair } from '../../../src/studio/composition';
import { activeScenes, checkScript, narrated } from '../../../src/studio/script-checks';

const showcase = studioTemplate('brand-showcase')!;
const brand = {
  name: 'Envy Nails Spa',
  tagline: 'Nails, done beautifully',
  phone: '(919) 366-6435',
  callToAction: 'Book today',
  footerNote: null,
  primaryColor: '#4db6ac',
  accentColor: '#f48fb1',
  logoUrl: 'https://cdn/logo.webp',
};
const inputs = (overrides: Partial<StudioInputs> = {}): StudioInputs => ({
  images: { cover: 'c', look1: 'l1', look2: 'l2', look4: 'l4' },
  avatars: {},
  voices: {},
  facts: {
    website: 'envynailsspaofwendell.com',
    lookNames: 'Mint gold foil\nPeacock\n\nButter blossoms',
    promises: 'Clean | Tools sterilized after every guest\nRelaxing: Massage chairs\nOn time',
    prices: 'Classic manicure | $25\nBasic pedicure | $35',
    signature: 'Royal pedicure | $65',
    address: '2241 Treelight Way, Suite 102\nWendell, NC 27591',
    hours: 'Mon–Sat | 9:30 AM – 7:00 PM\nSun | 11:00 AM – 5:00 PM',
  },
  ...overrides,
});
const script: StudioScript = {
  hooks: ['Welcome to Envy'],
  scenes: [
    {
      id: 'cover',
      voice: 'Welcome to Envy Nails Spa of Wendell.',
      onScreen: 'Nails, done beautifully',
    },
    { id: 'looks', voice: 'Find your next look.', onScreen: 'Looks to inspire' },
    { id: 'promise', voice: 'Clean, calm and on time.', onScreen: 'Our promise' },
    { id: 'menu', voice: 'A classic manicure is just $25.', onScreen: 'Menu' },
    { id: 'visit', voice: 'Book today.', onScreen: 'Visit us' },
  ],
  caption: 'c',
  hashtags: [],
};
const assets = {
  brand,
  images: {
    cover: 'https://cdn/cover.webp',
    look1: 'https://cdn/1.webp',
    look2: 'https://cdn/2.webp',
    look4: 'https://cdn/4.webp',
  },
  avatars: {},
  voice: { cover: { url: 'https://cdn/cover.wav', durationMs: 6000 } },
};

describe('[brand-showcase template] (unit)', () => {
  it('is silent unless the admin turns the narration on', () => {
    expect(narrated(showcase, inputs())).toBe(false);
    expect(narrated(showcase, inputs({ narration: true }))).toBe(true);
    expect(narrated(studioTemplate('price-hook')!, inputs())).toBe(true);
  });

  it('leaves out the price scene without prices (and so for wine, which never gets them)', () => {
    expect(activeScenes(showcase, inputs()).map((s) => s.id)).toEqual([
      'cover',
      'looks',
      'promise',
      'menu',
      'visit',
    ]);
    const noPrices = { ...inputs().facts, prices: '' };
    expect(activeScenes(showcase, inputs({ facts: noPrices })).map((s) => s.id)).not.toContain(
      'menu',
    );
    expect(showcase.facts.find((f) => f.id === 'prices')?.excludeSites).toEqual(['wine']);
  });

  it('silent: fixed scene lengths, no voice or subtitle, no brand card, lists as written', () => {
    const props = buildCompositionProps(showcase, inputs(), script, assets, 'en');
    expect(props.endCardFrames).toBe(0);
    expect(props.scenes.map((s) => s.durationInFrames)).toEqual([105, 120, 105, 105, 120]);
    expect(props.scenes.every((s) => s.voiceUrl === null && s.voice === '')).toBe(true);

    const [cover, looks, promise, menu, visit] = props.scenes;
    expect(cover).toMatchObject({
      layout: 'cover',
      imageUrl: 'https://cdn/cover.webp',
      website: 'envynailsspaofwendell.com',
    });
    // Names follow the slots in order, the empty optional slots skipped (look3 has no image).
    expect(looks.gallery).toEqual([
      { url: 'https://cdn/1.webp', label: 'Mint gold foil' },
      { url: 'https://cdn/2.webp', label: 'Peacock' },
      { url: 'https://cdn/4.webp', label: null },
    ]);
    expect(promise.items).toEqual([
      { title: 'Clean', text: 'Tools sterilized after every guest' },
      { title: 'Relaxing', text: 'Massage chairs' },
      { title: 'On time', text: null },
    ]);
    expect(menu.items).toEqual([
      { title: 'Classic manicure', text: '$25' },
      { title: 'Basic pedicure', text: '$35' },
      { title: 'Royal pedicure', text: '$65', highlight: true },
    ]);
    expect(visit.items).toEqual([
      { title: null, text: '2241 Treelight Way, Suite 102', group: 'address' },
      { title: null, text: 'Wendell, NC 27591', group: 'address' },
      { title: 'Mon–Sat', text: '9:30 AM – 7:00 PM', group: 'hours' },
      { title: 'Sun', text: '11:00 AM – 5:00 PM', group: 'hours' },
    ]);
    expect(visit.labels).toEqual({
      address: 'Address',
      hours: 'Opening hours',
      phone: 'Call to book',
    });
  });

  it('narrated: the voice, and a scene at least as long as its line', () => {
    const props = buildCompositionProps(
      showcase,
      inputs({ narration: true }),
      script,
      assets,
      'vi',
    );
    // 6000 ms + 350 ms tail at 30 fps → 191 frames, longer than the 3.5 s of the scene.
    expect(props.scenes[0]).toMatchObject({
      voiceUrl: 'https://cdn/cover.wav',
      durationInFrames: 191,
    });
    expect(props.scenes[0].voice).toBe('Welcome to Envy Nails Spa of Wendell.');
    expect(props.scenes[4].labels?.hours).toBe('Giờ mở cửa');
  });

  it('silent: the spoken lines are not checked, the headlines are', () => {
    const long = {
      ...script,
      scenes: script.scenes.map((s) =>
        s.id === 'menu'
          ? {
              ...s,
              voice:
                'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen',
              onScreen: 'Only $99 today',
            }
          : s,
      ),
    };
    const codes = (narration: boolean) =>
      checkScript(showcase, inputs({ narration }), long, {
        facts: Object.values(inputs().facts),
        bannedPhrases: [],
      }).map((w) => w.code);
    expect(codes(false)).toEqual(['unknown_number']);
    expect(codes(true)).toEqual(expect.arrayContaining(['too_many_words', 'unknown_number']));
  });

  it('reads "Title | text" and "Title: text" lines, never a time as a separator', () => {
    expect(splitPair('Clean | Sterilized tools')).toEqual({
      title: 'Clean',
      text: 'Sterilized tools',
    });
    expect(splitPair('Clean: sterilized tools')).toEqual({
      title: 'Clean',
      text: 'sterilized tools',
    });
    expect(splitPair('Open 9:30 to 19:00')).toEqual({ title: 'Open 9:30 to 19:00', text: null });
    expect(factLines(' a \n\n b \r\nc', 2)).toEqual(['a', 'b']);
  });
});
