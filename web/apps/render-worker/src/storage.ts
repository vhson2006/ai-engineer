import { createReadStream } from 'node:fs';
import { PutObjectCommand, S3Client, type ObjectCannedACL } from '@aws-sdk/client-s3';
import type { Config } from './config';

/**
 * Writes finished clips (MP4s and posters) to the public bucket (ADR 0039). In production its key
 * may write only under `studio/` (bucket policy): it never needs the rest of the bucket.
 */
export class ClipStorage {
  private readonly client: S3Client;

  constructor(private readonly config: Config) {
    this.client = new S3Client({
      region: config.STORAGE_REGION,
      endpoint: config.STORAGE_ENDPOINT,
      forcePathStyle: config.STORAGE_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: config.STORAGE_ACCESS_KEY_ID,
        secretAccessKey: config.STORAGE_SECRET_ACCESS_KEY,
      },
    });
  }

  async putFile(key: string, file: string, sizeBytes: number, contentType: 'video/mp4' | 'image/jpeg'): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.STORAGE_PUBLIC_BUCKET,
        Key: key,
        Body: createReadStream(file),
        ContentLength: sizeBytes,
        ContentType: contentType,
        // A render id never gets another file: cache it forever.
        CacheControl: 'public, max-age=31536000, immutable',
        ACL: (this.config.STORAGE_PUBLIC_OBJECT_ACL || undefined) as ObjectCannedACL | undefined,
      }),
    );
  }
}
