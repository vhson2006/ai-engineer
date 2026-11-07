'use server';

import { refresh } from 'next/cache';
import { once } from '@web/core/actions/idempotency';
import { limitAction } from '@web/core/actions/limit';
import { fromApiFailure, type ActionResult } from '@web/core/actions/result';
import { createDeployment } from '@web/core/api';
import { getSessionUser } from '@web/core/auth/session';
import { LIMITS } from '@web/core/security/rate-limit';
import { parseInput } from '@web/core/validation';
import { createDeploymentSchema } from './schema';

/**
 * Creates a deployment (web/.claude/rules/forms.md, step by step: /new-form).
 * Server Actions are POSTs to the page: covered by the proxy's CSRF origin check; everything in
 * `input` is attacker-controlled. Only admins have a session in this app (KEYCLOAK_REQUIRED_ROLE),
 * and the API checks deployment:write / deployment:admin again on the token.
 */
export async function createDeploymentAction(input: unknown): Promise<ActionResult<{ id: string; name: string }>> {
  const limited = await limitAction(LIMITS.mutation); // rule 3a
  if (limited) return limited;

  const user = await getSessionUser().catch(() => null); // rule 3
  if (!user) return { ok: false, code: 'unauthenticated', message: 'Please sign in again.' };

  const parsed = parseInput(createDeploymentSchema, input); // rule 4 (same schema as the form)
  if (!parsed.ok) return parsed;
  const values = parsed.data;

  // rule 6: a double click or a resubmit returns the first result instead of a second deployment.
  return once(`deployment:create:${user.id}:${values.submissionId}`, async () => {
    // rule 4/5: built field by field; the owner is the token's user on the API side.
    const result = await createDeployment({
      name: values.name,
      version: values.version,
      environment: values.environment,
      description: values.description || undefined,
    });
    if (!result.ok) return fromApiFailure(result); // rule 7
    refresh(); // the list and the overview show the new row
    return { ok: true, data: { id: result.data.id, name: result.data.name } };
  });
}
