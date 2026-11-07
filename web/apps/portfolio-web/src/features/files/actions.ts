'use server';

import { limitAction } from '@web/core/actions/limit';
import { fromApiFailure, invalidInput, isUuid, type ActionFailure, type ActionResult } from '@web/core/actions/result';
import { completeUpload, createUpload, deleteFile } from '@web/core/api';
import { FILE_PURPOSE_NAMES, type FilePurpose, type StoredFile, type UploadTicket } from '@web/core/files';
import { LIMITS } from '@web/core/security/rate-limit';

/**
 * Server Actions for files, called by client components (normally through useFileUpload /
 * lib/files/upload.ts, not directly). The browser can't call our API itself: the access token never
 * leaves the server (BFF). So the browser asks HERE for a presigned URL, sends the bytes straight
 * to the storage provider, then asks HERE to confirm.
 *
 * Security (.claude/rules/forms.md): Server Actions are POSTs, covered by the CSRF origin check of
 * src/proxy.ts and Next's own Origin/Host check. Every argument is attacker-controlled and
 * validated below. The session is checked by apiFetch (no token → 401 unauthenticated, no call).
 * The owner is the token's user on the API side, never a value from the browser.
 * Idempotency: a double click only creates a second `pending` file, which the API's cleanup job
 * deletes after 24 h; nothing is charged or shared, so no idempotency key is needed.
 */

const MEDIA_TYPE = /^[\w.+-]+\/[\w.+-]+$/;

/** Step 1 of an upload: a presigned PUT URL for the declared file. */
export async function startUpload(input: {
  purpose: FilePurpose;
  filename: string;
  contentType: string;
  size: number;
}): Promise<ActionResult<UploadTicket>> {
  const limited = await limitAction(LIMITS.upload); // per user (ADR 0017)
  if (limited) return limited;
  const invalid = validateStart(input);
  if (invalid) return invalid;

  const result = await createUpload({
    purpose: input.purpose,
    filename: input.filename,
    contentType: input.contentType,
    size: input.size,
  });
  if (!result.ok) return fromApiFailure(result);
  const { file, upload } = result.data;
  // Only what the browser needs: no owner id, no storage key.
  return { ok: true, data: { fileId: file.id, url: upload.url, headers: upload.headers, expiresAt: upload.expiresAt } };
}

/** Step 3 of an upload: the API verifies the stored object and marks the file uploaded. */
export async function finishUpload(fileId: string): Promise<ActionResult<StoredFile>> {
  // Not limited separately: each upload was counted by startUpload; KrakenD limits it per token too.
  if (!isUuid(fileId)) return invalid('fileId', 'must be a file id');
  const result = await completeUpload(fileId);
  return result.ok ? { ok: true, data: result.data } : fromApiFailure(result);
}

/** Deletes a file (owner or admin; the API decides). Refresh the page/list afterwards. */
export async function removeFile(fileId: string): Promise<ActionResult<null>> {
  const limited = await limitAction(LIMITS.mutation);
  if (limited) return limited;
  if (!isUuid(fileId)) return invalid('fileId', 'must be a file id');
  const result = await deleteFile(fileId);
  return result.ok ? { ok: true, data: null } : fromApiFailure(result);
}

function validateStart(input: unknown): ActionFailure | null {
  if (typeof input !== 'object' || input === null) return invalid('input', 'is required');
  const { purpose, filename, contentType, size } = input as Record<string, unknown>;
  if (typeof purpose !== 'string' || !(FILE_PURPOSE_NAMES as string[]).includes(purpose)) {
    return invalid('purpose', `must be one of: ${FILE_PURPOSE_NAMES.join(', ')}`);
  }
  if (typeof filename !== 'string' || filename.trim() === '' || filename.length > 255) {
    return invalid('filename', 'must be 1 to 255 characters');
  }
  if (typeof contentType !== 'string' || contentType.length > 127 || !MEDIA_TYPE.test(contentType)) {
    return invalid('contentType', 'must be a media type like image/png');
  }
  if (typeof size !== 'number' || !Number.isSafeInteger(size) || size < 1) {
    return invalid('size', 'must be a positive number of bytes');
  }
  return null; // per-purpose type and size limits: the API (single source of truth)
}

function invalid(field: string, message: string): ActionFailure {
  return invalidInput({ field, message: `${field} ${message}` });
}
