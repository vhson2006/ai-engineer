import { FileVisibility } from '../../storage/object-storage';

/**
 * What a file may be used for. The SERVER decides, from the purpose, the bucket (public or
 * private), the allowed content types and the maximum size: clients only say what the file is for.
 *
 * Never allow types a browser executes (text/html, image/svg+xml, application/javascript...):
 * a public file is served from our CDN domain, where such content would run as our site (XSS).
 *
 * `attachable`: the file is meant to be attached to a resource; if it isn't within
 * ORPHAN_TTL_HOURS after the upload, the cleanup job deletes it.
 */
export interface FilePurposePolicy {
  visibility: FileVisibility;
  maxBytes: number;
  contentTypes: readonly string[];
  attachable: boolean;
  description: string;
}

const MiB = 1024 * 1024;

export const FILE_PURPOSES = {
  'deployment-attachment': {
    visibility: 'private',
    maxBytes: 20 * MiB,
    contentTypes: [
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/json',
      'application/zip',
      'image/png',
      'image/jpeg',
      'image/webp',
    ],
    attachable: true,
    description: 'Private document attached to a deployment (logs, reports, screenshots)',
  },
  'public-image': {
    visibility: 'public',
    maxBytes: 5 * MiB,
    contentTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'],
    attachable: false,
    description: 'Public image served by the CDN (website content)',
  },
} as const satisfies Record<string, FilePurposePolicy>;

export type FilePurpose = keyof typeof FILE_PURPOSES;
export const FILE_PURPOSE_NAMES = Object.keys(FILE_PURPOSES) as FilePurpose[];

/** Largest size any purpose allows (first DTO check, before the per-purpose one). */
export const MAX_UPLOAD_BYTES = Math.max(...Object.values(FILE_PURPOSES).map((p) => p.maxBytes));

/** Hours an `attachable` file may stay unattached, and a pending upload may stay pending. */
export const ORPHAN_TTL_HOURS = 24;

/** Extension of the object key, from the (validated) content type: never from the user's file name. */
export const EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/json': 'json',
  'application/zip': 'zip',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};
