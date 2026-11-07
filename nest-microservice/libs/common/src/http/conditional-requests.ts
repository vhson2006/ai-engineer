import { HttpException, HttpStatus, PreconditionFailedException } from '@nestjs/common';

/**
 * Optimistic concurrency with HTTP conditional requests (RFC 9110 §8.8.3, §13.1.1, RFC 6585 §3).
 *
 *   GET    /things/1             → 200, ETag: "3"
 *   PATCH  /things/1  If-Match: "3"  → 200, ETag: "4"
 *   PATCH  /things/1  If-Match: "3"  → 412 (someone else changed it: GET again, re-apply, retry)
 *   PATCH  /things/1  (no If-Match)  → 428 (blind overwrites are refused)
 *
 * The tag is the row's `revision` column, incremented by every update; the update itself is
 * conditional on the revision (`where: { id, revision }`), so the check is race-free.
 */

/** Strong entity tag for a revision: 3 → "3". */
export function entityTag(revision: number): string {
  return `"${revision}"`;
}

/**
 * Parses If-Match: `*`, or a list of entity tags. Weak tags (W/"…") are dropped: If-Match uses
 * the strong comparison, so they can never match. undefined when the header is absent.
 */
export function parseIfMatch(header: string | undefined): '*' | string[] | undefined {
  if (header === undefined) return undefined;
  const value = header.trim();
  if (value === '*') return '*';
  return value.match(/(?:W\/)?"[^"]*"/g)?.filter((tag) => !tag.startsWith('W/')) ?? [];
}

/**
 * Throws 428 when If-Match is missing, 412 when it doesn't match the current tag.
 * Call it AFTER the 404/403 checks: preconditions are only evaluated for a request that would
 * otherwise succeed (RFC 9110 §13.2.1).
 */
export function assertIfMatch(header: string | undefined, currentTag: string): void {
  const tags = parseIfMatch(header);
  if (tags === undefined) {
    throw new HttpException(
      {
        message: 'This request must be conditional: send If-Match with the ETag from your last GET',
        code: 'precondition_required',
      },
      HttpStatus.PRECONDITION_REQUIRED,
    );
  }
  if (tags !== '*' && !tags.includes(currentTag)) throw staleResource();
}

/** 412: the resource changed since the client read it. */
export function staleResource(): PreconditionFailedException {
  return new PreconditionFailedException({
    message:
      'The resource was modified since you read it. Fetch it again, re-apply your change and retry',
    code: 'precondition_failed',
  });
}
