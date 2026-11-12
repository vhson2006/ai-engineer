import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UpstreamError } from '../http-client/upstream-error';
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
import { StorageConfig } from './storage.config';

/**
 * ObjectStorage on any S3-compatible API (AWS S3, DigitalOcean Spaces, Cloudflare R2, SeaweedFS).
 *
 * Presigning is local (no network call). stat/delete call the provider; their failures become
 * UpstreamError ('object-storage'), so the API answers 503/502 through toProblem.
 */
export class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;

  constructor(private readonly config: StorageConfig) {
    this.client = new S3Client({
      region: config.signingRegion,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      // Recent SDKs add CRC32 checksums to every PutObject, presigned URLs included; Spaces, R2
      // and local S3 servers then reject browser uploads. Only send checksums when required.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      maxAttempts: 3,
    });
  }

  async createUploadUrl(request: UploadRequest): Promise<PresignedUpload> {
    const expiresIn = this.config.uploadUrlTtlSeconds;
    const acl = request.visibility === 'public' ? this.config.publicObjectAcl : undefined;
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket(request.visibility),
        Key: request.key,
        ContentType: request.contentType,
        ContentLength: request.size,
        ACL: acl,
      }),
      // Signed headers: the provider refuses the upload if the client changes them, so the
      // bytes stored are exactly the declared type and size. (Checked again on completion.)
      {
        expiresIn,
        signableHeaders: new Set(['content-type', 'content-length', ...(acl ? ['x-amz-acl'] : [])]),
        // Keep the ACL a real (signed) header instead of a query parameter: the client must send it.
        unhoistableHeaders: acl ? new Set(['x-amz-acl']) : undefined,
      },
    );
    return {
      method: 'PUT',
      url,
      headers: {
        'Content-Type': request.contentType,
        'Content-Length': String(request.size),
        ...(acl ? { 'x-amz-acl': acl } : {}),
      },
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  }

  async stat(visibility: FileVisibility, key: string): Promise<StoredObjectInfo | null> {
    try {
      const head = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket(visibility), Key: key }),
      );
      return { size: head.ContentLength ?? 0, contentType: head.ContentType };
    } catch (error) {
      if (statusOf(error) === 404) return null;
      throw this.fail('HEAD', key, error);
    }
  }

  publicUrl(key: string): string {
    return `${this.config.publicBaseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }

  async createDownloadUrl(request: DownloadRequest): Promise<PresignedDownload> {
    const expiresIn = this.config.downloadUrlTtlSeconds;
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.config.privateBucket,
        Key: request.key,
        // The provider answers with these headers: the stored file is never rendered as
        // something else, and is downloaded under its original name.
        ResponseContentType: request.contentType,
        ResponseContentDisposition: contentDisposition(request.filename, request.inline),
      }),
      { expiresIn },
    );
    return { url, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
  }

  async delete(visibility: FileVisibility, key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket(visibility), Key: key }),
      );
    } catch (error) {
      if (statusOf(error) === 404) return;
      throw this.fail('DELETE', key, error);
    }
  }

  async putObject(request: PutRequest): Promise<void> {
    const acl = request.visibility === 'public' ? this.config.publicObjectAcl : undefined;
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket(request.visibility),
          Key: request.key,
          Body: request.body,
          ContentType: request.contentType,
          ContentLength: request.body.byteLength,
          CacheControl: request.cacheControl,
          ACL: acl,
        }),
      );
    } catch (error) {
      throw this.fail('PUT', request.key, error);
    }
  }

  private bucket(visibility: FileVisibility): string {
    return visibility === 'public' ? this.config.publicBucket : this.config.privateBucket;
  }

  private fail(method: string, key: string, error: unknown): UpstreamError {
    const status = statusOf(error);
    return new UpstreamError(
      {
        upstream: 'object-storage',
        kind: status ? 'http' : 'network',
        method,
        path: `/${key}`,
        attempts: 1,
        status,
        code: (error as { name?: string } | null)?.name,
      },
      { cause: error },
    );
  }
}

function statusOf(error: unknown): number | undefined {
  return (error as { $metadata?: { httpStatusCode?: number } } | null)?.$metadata?.httpStatusCode;
}

/** RFC 6266 + RFC 8187: ASCII fallback name and the exact UTF-8 name. */
export function contentDisposition(filename: string, inline = false): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  const utf8 = encodeURIComponent(filename).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}
