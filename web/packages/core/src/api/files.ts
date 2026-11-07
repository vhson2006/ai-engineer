import 'server-only';
import type { DownloadLink, FilePurpose, StoredFile } from '../files';
import type { Paginated } from './types';
import { apiFetch } from './fetch';

/**
 * Files API (server side only). Components use the Server Actions in apps/portfolio-web/src/features/files/actions.ts
 * (upload, delete) and fileDownloadPath() (download); see lib/files.
 */

export type { DownloadLink, FilePurpose, StoredFile } from '../files';

const fileUrl = (id: string, suffix = '') => `/api/files/${encodeURIComponent(id)}${suffix}`;

/** Answer of POST /api/files/uploads (UploadSessionResponse). */
export interface UploadSession {
  file: StoredFile;
  upload: { method: 'PUT'; url: string; headers: Record<string, string>; expiresAt: string };
}

/** Step 1: a `pending` file + a presigned PUT URL. The API validates purpose, type and size. */
export function createUpload(input: { purpose: FilePurpose; filename: string; contentType: string; size: number }) {
  return apiFetch<UploadSession>('/api/files/uploads', { method: 'POST', body: input });
}

/** Step 3: the API checks the stored object (exists, same size and type) → `uploaded`. */
export function completeUpload(id: string) {
  // Idempotent on the API side (an uploaded file is returned as is): safe to retry.
  return apiFetch<StoredFile>(fileUrl(id, '/complete'), { method: 'POST', idempotent: true });
}

export function getFile(id: string) {
  return apiFetch<StoredFile>(fileUrl(id));
}

/** Attachments of a deployment, or (without deploymentId) the user's own files. */
export function listFiles(params: { deploymentId?: string; purpose?: FilePurpose; page?: number; limit?: number } = {}) {
  return apiFetch<Paginated<StoredFile>>('/api/files', { query: params });
}

export function deleteFile(id: string) {
  return apiFetch<void>(fileUrl(id), { method: 'DELETE' });
}

export function getDownloadLink(id: string, disposition: 'attachment' | 'inline') {
  return apiFetch<DownloadLink>(fileUrl(id, '/download-url'), { query: { disposition } });
}
