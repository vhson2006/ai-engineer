import type {
  StudioInputs,
  StudioScene,
  StudioScript,
  StudioTemplate,
  StudioWarning,
} from '@app/common';

/**
 * Checks a script (from the AI or edited by the admin) against its template and the facts
 * (ADR 0039). Never blocks anything: the admin sees the warnings and decides.
 */

/** Scenes that apply: a scene whose image slot is optional and empty is left out. */
export function activeScenes(template: StudioTemplate, inputs: StudioInputs): StudioScene[] {
  return template.scenes.filter((scene) => {
    if (!scene.image) return true;
    const slot = template.images.find((image) => image.id === scene.image);
    return slot?.required || Boolean(inputs.images[scene.image]);
  });
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}

/** Numbers as people write them: "35.000đ", "35,000", "7:00", "$59+" → "35000", "700", "59". */
export function numbersIn(text: string): string[] {
  return (text.match(/\d[\d.,:]*/g) ?? []).map((n) => n.replace(/[.,:]/g, '')).filter(Boolean);
}

const lower = (text: string) => text.toLocaleLowerCase();

export function checkScript(
  template: StudioTemplate,
  inputs: StudioInputs,
  script: StudioScript,
  sources: { facts: string[]; bannedPhrases: string[] },
): StudioWarning[] {
  const warnings: StudioWarning[] = [];
  const scenes = activeScenes(template, inputs);
  // Every number in the facts and the brand (phone, prices) is allowed, exactly; a phone written
  // in groups ("0909 123 456") also as one run of digits.
  const known = new Set([
    ...sources.facts.flatMap(numbersIn),
    ...sources.facts.map((fact) => fact.replace(/\D/g, '')).filter(Boolean),
  ]);

  for (const spec of scenes) {
    const scene = script.scenes.find((s) => s.id === spec.id);
    if (!scene) {
      warnings.push({ code: 'missing_scene', scene: spec.id, detail: spec.id });
      continue;
    }
    const words = countWords(scene.voice);
    if (words > spec.maxWords) {
      warnings.push({
        code: 'too_many_words',
        scene: spec.id,
        detail: `${words}/${spec.maxWords}`,
      });
    }
    if (scene.onScreen.length > spec.onScreenMaxChars) {
      warnings.push({
        code: 'on_screen_too_long',
        scene: spec.id,
        detail: `${scene.onScreen.length}/${spec.onScreenMaxChars}`,
      });
    }
    const text = `${scene.voice}\n${scene.onScreen}`;
    for (const phrase of sources.bannedPhrases) {
      if (phrase.trim() && lower(text).includes(lower(phrase.trim()))) {
        warnings.push({ code: 'banned_phrase', scene: spec.id, detail: phrase.trim() });
      }
    }
    for (const number of new Set(numbersIn(text))) {
      // Counting words ("1 máy", "3 mẹo") are not claims: only numbers above 10 are checked.
      if (Number(number) > 10 && !known.has(number)) {
        warnings.push({ code: 'unknown_number', scene: spec.id, detail: number });
      }
    }
  }
  const extra = `${script.caption}\n${script.hashtags.join(' ')}`;
  for (const phrase of sources.bannedPhrases) {
    if (phrase.trim() && lower(extra).includes(lower(phrase.trim()))) {
      warnings.push({ code: 'banned_phrase', detail: phrase.trim() });
    }
  }
  return warnings;
}
