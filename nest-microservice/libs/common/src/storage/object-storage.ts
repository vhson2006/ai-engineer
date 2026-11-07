/**
 * Object storage (the bytes of uploaded files), behind one interface so services don't care
 * whether it is AWS S3, DigitalOcean Spaces, Cloudflare R2 or a local S3 (SeaweedFS in dev).
 * Implementation: S3ObjectStorage (s3-object-storage.ts). Tests: InMemoryObjectStorage.
 *
 * Two buckets, never per-object ACLs (R2 has none, new S3 buckets disable them):
 *   public   readable by anyone, served through a CDN/public URL (images for websites)
 *   private  only through short-lived presigned URLs (documents, attachments)
 *
 * Bytes never go through our API: the browser uploads straight to the bucket with a presigned
 * URL, and downloads private files with another one. The API only signs URLs and keeps metadata.
 */
export type FileVisibility = 'public' | 'private';

export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

export interface PresignedUpload {
  method: 'PUT';
  url: string;
  /** Headers the client MUST send unchanged: they are part of the signature. */
  headers: Record<string, string>;
  expiresAt: string;
}

export interface PresignedDownload {
  url: string;
  expiresAt: string;
}

export interface StoredObjectInfo {
  size: number;
  contentType?: string;
}

export interface UploadRequest {
  visibility: FileVisibility;
  key: string;
  contentType: string;
  /** Exact size in bytes the client declared. */
  size: number;
}

export interface DownloadRequest {
  key: string;
  /** Name proposed to the browser (Content-Disposition). */
  filename: string;
  contentType: string;
  /** true: display in the browser when possible; false (default): download. */
  inline?: boolean;
}

export interface ObjectStorage {
  /** Presigned PUT; Content-Type and Content-Length are signed, so they can't be changed. */
  createUploadUrl(request: UploadRequest): Promise<PresignedUpload>;
  /** Metadata of a stored object, or null when it doesn't exist (not uploaded yet). */
  stat(visibility: FileVisibility, key: string): Promise<StoredObjectInfo | null>;
  /** Stable public URL (CDN / custom domain) of an object in the PUBLIC bucket. */
  publicUrl(key: string): string;
  /** Short-lived presigned GET for an object in the PRIVATE bucket. */
  createDownloadUrl(request: DownloadRequest): Promise<PresignedDownload>;
  /** Idempotent: deleting a missing object is not an error. */
  delete(visibility: FileVisibility, key: string): Promise<void>;
}
