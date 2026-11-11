import type { ActionFailure } from '@web/core/actions/result';

/**
 * API field errors name the languages SENT ("translations[0].slug"); the form has every language
 * of the site. `positions[i]` = the form index of the i-th language sent → "translations.2.slug".
 */
export function remapFieldErrors(failure: ActionFailure, positions: number[]): ActionFailure {
  if (!failure.errors?.length) return failure;
  return {
    ...failure,
    errors: failure.errors.map((error) => {
      const match = /^translations\[(\d+)\]\.?(.*)$/.exec(error.field);
      if (!match) return error;
      const position = positions[Number(match[1])];
      if (position === undefined) return error;
      return { ...error, field: `translations.${position}${match[2] ? `.${match[2]}` : ''}` };
    }),
  };
}
