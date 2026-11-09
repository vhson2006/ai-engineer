---
name: new-form
description: Add a form or any state-changing action to a web app (portfolio-web, later admin-web; create/update/delete through the API, e.g. orders, bookings, profile, attachments) following the BFF + CSRF + idempotency checklist, with tests. Use when asked to add a form, a submit button, a mutation, or a Server Action.
argument-hint: [what the form does — API endpoint(s) it calls — who may use it]
---

Add `$ARGUMENTS`. The rules are in `.claude/rules/forms.md` (checklist), `api.md` and `files.md`;
this is the order of work. Reference implementation: `apps/admin-web/src/features/deployments/` (`schema.ts`, `actions.ts` + its
test, `create-deployment-dialog.tsx`). UI: `@web/ui/form` (react-hook-form + zod), `@web/ui/dialog`,
`@web/ui/toaster` (rule `web/.claude/rules/ui.md`).

If the API endpoint doesn't exist yet, or it is unclear **who may do it** (role, owner) or
**which fields the user controls** (vs. computed: prices, totals, owner), ask first. A missing
endpoint is added first with nest-microservice's `/new-endpoint` skill (same repository).

Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/`
(e.g. `01-app/01-getting-started/07-mutating-data.md`): this Next.js version differs from older ones.

## 1. API helper (server) — `packages/core/src/api/`
1. Response type mirroring nest-microservice `libs/common/src/contracts/<resource>`.
2. A typed helper: `export function createOrder(input: OrderInput) { return apiFetch<Order>('/api/orders', { method: 'POST', body: input }); }`
   - update: `headers: { 'If-Match': '"' + revision + '"' }`
   - create the API must deduplicate across retries: `idempotencyKey`
3. New query param or header? It must also be listed for that endpoint in
   `k8s/base/krakend/config/krakend.tmpl` (`input_query_strings` / `input_headers`).

## 2. Schema — `apps/<app>/src/features/<feature>/schema.ts`
One zod schema, imported by the form AND the action. Messages are keys of the app's `validation`
dictionary (`'required'`, `'tooLong'`…; add new keys in every language). Mirror the API contract's
limits; include `submissionId: z.uuid('invalid')` for creates; never a field the user doesn't
control (owner, price, status computed by the API).

## 3. Server Action — `apps/<app>/src/features/<feature>/actions.ts`
```ts
'use server';
import { fromApiFailure, invalidInput, type ActionResult } from '@web/core/actions/result';
import { createOrder } from '@web/core/api';
import { once } from '@web/core/actions/idempotency';
import { getSessionUser } from '@web/core/auth/session';
import { limitAction } from '@web/core/actions/limit';
import { LIMITS } from '@web/core/security/rate-limit';
import { parseInput } from '@web/core/validation';
import { orderSchema } from './schema';

export async function submitOrder(input: unknown): Promise<ActionResult<{ id: string }>> {
  const limited = await limitAction(LIMITS.mutation);     // rule 3a: rate limit (per user)
  if (limited) return limited;
  const user = await getSessionUser();                    // rule 3: re-check the session
  if (!user) return { ok: false, code: 'unauthenticated', message: 'Please sign in again.' };

  const parsed = parseInput(orderSchema, input);          // rule 4: same schema as the form
  if (!parsed.ok) return parsed;                          // invalid_input + field errors (keys)

  return once(`order:${user.id}:${parsed.data.submissionId}`, async () => {   // rule 6
    const result = await createOrder({ productId: parsed.data.productId, quantity: parsed.data.quantity });
    return result.ok ? { ok: true, data: { id: result.data.id } } : fromApiFailure(result);   // rule 7
  });
}
```
- Only async functions are exported from a `'use server'` file; types go in a separate module.
- Build the API body field by field from the validated values. Never spread the input, never
  take ids/prices/owner from it (rule 5).
- Ids that go into an API path: `isUuid()` first.
- After a successful mutation, refresh what the page shows: `refresh()` / `revalidatePath()` from
  `next/cache` (check the docs), or `router.refresh()` in the client.
- `once()` only for creates. Updates rely on If-Match; deletes are idempotent.

## 4. Client component — `apps/<app>/src/features/<feature>/<name>-form.tsx` (or `-dialog.tsx`)
- `'use client'`; `useForm({ resolver: zodResolver(schema), defaultValues })` and the `@web/ui/form`
  pieces (`Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`) with
  `translate={(key) => t.validation[key] ?? key}`; inputs from `@web/ui/*` (Input, Select,
  Combobox, DatePicker…).
- A `submissionId` (`newSubmissionId()` from `@web/core/actions/submission-id`, never `crypto.randomUUID()`: undefined on plain http outside localhost, e.g. the dev sites) in the default values, renewed after a success.
- Call the action through `useActionState` (pending → disable the submit button, spinner) and
  handle the result inside that function, not in an effect: success → `toast.success`, close /
  navigate, reset; failure → `applyActionErrors(form, result.errors)` for the field errors, and
  `toast.error(message, { description: requestId })` for the rest.
- Every label, placeholder and message comes from the dictionaries, passed as props.
- Files in the form: `useFileUpload(purpose)` uploads first; the form sends only the file ids.
- Never call the API, read tokens or use `NEXT_PUBLIC_*` secrets in the client.

## 5. Tests — `apps/<app>/src/features/<feature>/actions.test.ts`
Copy the pattern of `apps/admin-web/src/features/deployments/actions.test.ts` (`vi.mock('@web/core/api')`,
`vi.mock('@web/core/auth/session')`, `vi.mock('@web/core/actions/limit')`, and `vi.mock('@web/core/actions/idempotency')` or a
memory store), and cover:
- valid input → API called with exactly the expected body (no extra fields);
- each invalid field → `invalid_input`, API not called;
- signed out → `unauthenticated`, API not called;
- API failure (e.g. 412, 422) → `fromApiFailure` mapping with `requestId`;
- same `submissionId` twice → the API is called once;
- rate limited (`limitAction` returns a failure) → `rate_limited`, API not called.

## 6. Verify
1. `npm test`, `npm run typecheck`, `npm run lint` (from web/).
2. Live (dev stack running, `npm run k8s:forward` at the repo root): submit the form in the
   browser; then the negative checks from rule 10:
   `curl -i -X POST http://www.localtest.me:8000/<page> -H 'Origin: https://evil.example'` → 403;
   a tampered price/quantity → refused or recomputed; double submit → one record.
3. Self-review the diff against `docs/ai/code-review.md`; report findings in its format
   (Critical / Should fix / Suggestion) and fix the Critical ones before calling it done.
4. Report the real output. If something couldn't run, say so.
