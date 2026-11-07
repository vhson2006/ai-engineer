import { FileVisibility } from '../../storage/object-storage';
import { FilePurpose } from './file.purposes';

export const FILE_STATUSES = ['pending', 'uploaded', 'deleting', 'deleted'] as const;
export type FileStatus = (typeof FILE_STATUSES)[number];

/** A file as returned by the API. */
export interface FileResponse {
  id: string;
  purpose: FilePurpose;
  visibility: FileVisibility;
  status: FileStatus;
  originalName: string;
  contentType: string;
  size: number;
  ownerId: string;
  deploymentId: string | null;
  createdAt: string;
  uploadedAt: string | null;
  /**
   * Where to get the bytes, once uploaded. Public: a stable CDN URL. Private: a presigned URL
   * valid until `urlExpiresAt` (ask the API again for a new one). null while pending.
   */
  url: string | null;
  urlExpiresAt: string | null;
}

/** Answer to POST /api/files/uploads: the file record + how to upload the bytes. */
export interface UploadSessionResponse {
  file: FileResponse;
  upload: {
    method: 'PUT';
    /** Send the bytes here, directly to the storage provider (not to our API). */
    url: string;
    /** Send exactly these headers: they are signed. */
    headers: Record<string, string>;
    expiresAt: string;
  };
}

/**
 * Answer to GET /api/files/:id/download-url: where to get the bytes, directly from the storage
 * provider. Private files: a presigned URL valid until `expiresAt` that sets Content-Type and
 * Content-Disposition (original file name). Public files: the stable CDN URL (expiresAt null).
 *
 * Why a link and not a 302 or the bytes: KrakenD (community edition) follows backend redirects
 * and would download the file itself; streaming through the gateway hits its timeout and costs
 * bandwidth. The client (e.g. a Next.js route) redirects the browser to `url` instead.
 */
export interface DownloadLinkResponse {
  url: string;
  expiresAt: string | null;
  filename: string;
  contentType: string;
  size: number;
}
