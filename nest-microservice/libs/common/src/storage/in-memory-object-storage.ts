import {
  DownloadRequest,
  FileVisibility,
  ObjectStorage,
  PresignedDownload,
  PresignedUpload,
  PutRequest,
  StoredObjectInfo,
  UploadRequest,
} from './object-storage';

/**
 * ObjectStorage for tests: keeps object metadata in memory. `put()` simulates the browser's
 * upload to the presigned URL.
 *   .overrideProvider(OBJECT_STORAGE).useValue(new InMemoryObjectStorage())
 */
export class InMemoryObjectStorage implements ObjectStorage {
  readonly objects = new Map<string, StoredObjectInfo>();
  readonly deleted: string[] = [];
  /** Requests passed to createDownloadUrl, for assertions. */
  readonly downloads: DownloadRequest[] = [];

  /** What the browser would do with the presigned URL. */
  put(visibility: FileVisibility, key: string, info: StoredObjectInfo): void {
    this.objects.set(`${visibility}:${key}`, info);
  }

  createUploadUrl(request: UploadRequest): Promise<PresignedUpload> {
    return Promise.resolve({
      method: 'PUT',
      url: `https://storage.test/${request.visibility}/${request.key}?signature=x`,
      headers: { 'Content-Type': request.contentType, 'Content-Length': String(request.size) },
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    });
  }

  stat(visibility: FileVisibility, key: string): Promise<StoredObjectInfo | null> {
    return Promise.resolve(this.objects.get(`${visibility}:${key}`) ?? null);
  }

  publicUrl(key: string): string {
    return `https://cdn.test/${key}`;
  }

  createDownloadUrl(request: DownloadRequest): Promise<PresignedDownload> {
    this.downloads.push(request);
    return Promise.resolve({
      url: `https://storage.test/private/${request.key}?signature=x`,
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
    });
  }

  putObject(request: PutRequest): Promise<void> {
    this.objects.set(`${request.visibility}:${request.key}`, {
      size: request.body.byteLength,
      contentType: request.contentType,
    });
    return Promise.resolve();
  }

  delete(visibility: FileVisibility, key: string): Promise<void> {
    this.objects.delete(`${visibility}:${key}`);
    this.deleted.push(`${visibility}:${key}`);
    return Promise.resolve();
  }
}
