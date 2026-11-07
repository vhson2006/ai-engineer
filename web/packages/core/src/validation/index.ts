import type { z } from 'zod';
import { invalidInput, type ActionFailure, type FieldError } from '../actions/result';

/**
 * Server-side validation of a Server Action's input with the SAME zod schema as the form
 * (web/.claude/rules/forms.md). Client-safe: no server-only imports.
 *
 *   const parsed = parseInput(deploymentSchema, input);
 *   if (!parsed.ok) return parsed;            // ActionFailure, field errors = message keys
 *   await createDeployment(parsed.data);      // typed, trimmed, extra keys stripped
 *
 * Schemas use message KEYS ('required', 'tooLong'…) that the form translates (@web/ui/form).
 * z.object() strips unknown keys: a field the user doesn't control (ownerId, price) never passes.
 */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): { ok: true; data: z.output<S> } | ActionFailure {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return invalidInput(toFieldErrors(result.error));
}

/** zod issues → our FieldError list (`field` is the dotted path; '' for the whole input). */
export function toFieldErrors(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => ({ field: issue.path.map(String).join('.'), message: issue.message }));
}
