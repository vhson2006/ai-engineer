/**
 * A random UUID v4 for a form's `submissionId` (idempotency key, see `./idempotency.ts`).
 * Client-safe: use THIS in components, never `crypto.randomUUID()`.
 *
 * `crypto.randomUUID()` exists only in secure contexts (HTTPS or localhost). The dev sites are
 * plain http on `*.localtest.me` (not localhost), where it is undefined and the form crashes
 * ("crypto.randomUUID is not a function"). `crypto.getRandomValues()` is available everywhere and
 * is just as random.
 */
export function newSubmissionId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
