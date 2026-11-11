import type { ApiResult } from '../api/client';

/**
 * What every Server Action returns (never throws for expected failures, never returns upstream
 * payloads). Client components branch on `ok`; on failure they show `message` (+ `requestId`
 * so support can find the logs) and, for forms, `errors` next to the fields.
 *
 *   'use server';
 *   export async function createOrder(input: unknown): Promise<ActionResult<{ id: string }>> {
 *     const parsed = parseOrder(input);            // ActionFailure | value
 *     if ('ok' in parsed) return parsed;
 *     const result = await apiFetch<Order>('/api/orders', { method: 'POST', body: parsed });
 *     return result.ok ? { ok: true, data: { id: result.data.id } } : fromApiFailure(result);
 *   }
 *
 * No 'server-only': client components import the types.
 */

export interface FieldError {
  field: string;
  message: string;
}

export interface ActionFailure {
  ok: false;
  /** API code (validation_error, unique_violation…) or ours (invalid_input, unauthenticated…). */
  code: string;
  /** Safe to show. */
  message: string;
  errors?: FieldError[];
  requestId?: string;
  /** rate_limited: seconds before trying again. */
  retryAfterS?: number;
}

export type ActionResult<T> = { ok: true; data: T } | ActionFailure;

/** A failed apiFetch → only what the UI may see (code, safe message, field errors, request id). */
export function fromApiFailure(result: Extract<ApiResult<unknown>, { ok: false }>): ActionFailure {
  return {
    ok: false,
    code: result.code,
    message: result.message,
    errors: result.errors,
    requestId: result.requestId,
  };
}

/** Input refused by the action's own validation, before any API call. */
export function invalidInput(errors: FieldError[] | FieldError): ActionFailure {
  return {
    ok: false,
    code: 'invalid_input',
    message: 'Please check the highlighted fields.',
    errors: Array.isArray(errors) ? errors : [errors],
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** For ids coming from the browser before they go into an API path. */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}
