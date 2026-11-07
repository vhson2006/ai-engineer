/**
 * Files: types and helpers shared by the server and the browser (no 'server-only': client
 * components import it). Mirrors libs/common/src/contracts/file in nest-microservice.
 *
 * The API is the authority: it validates purpose, type and size again, and the storage provider
 * refuses an upload whose type or size differ from the signed ones. The checks here only give the
 * user an immediate, friendly message (and the `accept` attribute of the file input).
 *
 *   Upload (client component):   const { upload } = useFileUpload('deployment-attachment');
 *   Download (any component):    <a href={fileDownloadPath(file.id)}>Download</a>
 */

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
  },
  'public-image': {
    visibility: 'public',
    maxBytes: 5 * MiB,
    contentTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'],
  },
} as const satisfies Record<
  string,
  { visibility: 'public' | 'private'; maxBytes: number; contentTypes: readonly string[] }
>;

export type FilePurpose = keyof typeof FILE_PURPOSES;
export const FILE_PURPOSE_NAMES = Object.keys(FILE_PURPOSES) as FilePurpose[];
export type FileStatus = 'pending' | 'uploaded' | 'deleting' | 'deleted';

/** A file as returned by the API (FileResponse). */
export interface StoredFile {
  id: string;
  purpose: FilePurpose;
  visibility: 'public' | 'private';
  status: FileStatus;
  originalName: string;
  contentType: string;
  size: number;
  ownerId: string;
  deploymentId: string | null;
  createdAt: string;
  uploadedAt: string | null;
  /** Public: stable CDN URL. Private: presigned, valid until urlExpiresAt. Prefer fileDownloadPath(). */
  url: string | null;
  urlExpiresAt: string | null;
}

/** Answer of GET /api/files/:id/download-url (DownloadLinkResponse). */
export interface DownloadLink {
  url: string;
  expiresAt: string | null;
  filename: string;
  contentType: string;
  size: number;
}

/** What the browser needs to send the bytes to the storage provider (never the whole API answer). */
export interface UploadTicket {
  fileId: string;
  url: string;
  /** Signed headers: send exactly these (Content-Length is set by the browser itself). */
  headers: Record<string, string>;
  expiresAt: string;
}

/**
 * Link for <a href> / <img src> / window.open: our route asks the API for a short-lived link with
 * the user's session and redirects there (app/files/[id]/download/route.ts). Never expires itself,
 * unlike StoredFile.url, so it's safe to render in a page and click later.
 */
export function fileDownloadPath(id: string, options: { inline?: boolean } = {}): string {
  const path = `/files/${encodeURIComponent(id)}/download`;
  return options.inline ? `${path}?disposition=inline` : path;
}

/** Media types by extension: browsers leave File.type empty or vendor-specific for some files. */
const BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  log: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  zip: 'application/zip',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
};

/**
 * The media type to declare for a file, as one the API knows. The browser's File.type wins when
 * it's an allowed type; otherwise the extension decides (Windows reports .csv as
 * "application/vnd.ms-excel", .zip as "application/x-zip-compressed", .log as "").
 */
export function contentTypeOf(purpose: FilePurpose, file: { name: string; type: string }): string {
  const allowed: readonly string[] = FILE_PURPOSES[purpose].contentTypes;
  const declared = file.type.split(';')[0].trim().toLowerCase();
  if (allowed.includes(declared)) return declared;
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return BY_EXTENSION[extension] ?? (declared || 'application/octet-stream');
}

/** null when the file is acceptable for the purpose, otherwise a message for the user. */
export function checkFile(purpose: FilePurpose, file: { name: string; type: string; size: number }): string | null {
  const policy = FILE_PURPOSES[purpose];
  if (file.size <= 0) return 'The file is empty.';
  if (file.size > policy.maxBytes) {
    return `The file is too large (${formatBytes(file.size)}); the limit is ${formatBytes(policy.maxBytes)}.`;
  }
  const allowed: readonly string[] = policy.contentTypes;
  if (!allowed.includes(contentTypeOf(purpose, file))) {
    return `This type of file isn't accepted. Allowed: ${acceptFor(purpose)}.`;
  }
  return null;
}

/** Value for <input type="file" accept={acceptFor('public-image')}>: media types + extensions. */
export function acceptFor(purpose: FilePurpose): string {
  const allowed: readonly string[] = FILE_PURPOSES[purpose].contentTypes;
  const extensions = Object.entries(BY_EXTENSION)
    .filter(([, type]) => allowed.includes(type))
    .map(([extension]) => `.${extension}`);
  return [...allowed, ...extensions].join(',');
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MiB) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / MiB).toFixed(1)} MB`;
}
