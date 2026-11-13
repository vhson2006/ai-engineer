import { STUDIO_TEMPLATES } from '@app/common';

/**
 * Slot and scene ids travel as object keys and composition ids: admin-web's forms
 * (features/studio/schema.ts `slotId`) and @web/video (`studioSceneSchema.id`) accept only this.
 */
const ID = /^[a-z][a-z0-9-]{0,39}$/;

describe('[studio templates] (unit)', () => {
  it.each(STUDIO_TEMPLATES.map((t) => [t.id, t] as const))(
    '%s: every id is lowercase, every reference points to one of its slots',
    (_id, template) => {
      const images = template.images.map((s) => s.id);
      const facts = template.facts.map((s) => s.id);
      const ids = [
        template.id,
        ...images,
        ...template.avatars.map((s) => s.id),
        ...template.speakers.map((s) => s.id),
        ...facts,
        ...template.scenes.map((s) => s.id),
      ];
      expect(ids.filter((id) => !ID.test(id))).toEqual([]);

      const speakers = template.speakers.map((s) => s.id);
      const avatars = template.avatars.map((s) => s.id);
      for (const scene of template.scenes) {
        expect(speakers).toContain(scene.speaker);
        if (scene.image) expect(images).toContain(scene.image);
        if (scene.avatar) expect(avatars).toContain(scene.avatar);
        for (const image of scene.images ?? []) expect(images).toContain(image);
        for (const fact of [scene.items, scene.extra, scene.requires]) {
          if (fact) expect(facts).toContain(fact);
        }
      }
    },
  );
});
