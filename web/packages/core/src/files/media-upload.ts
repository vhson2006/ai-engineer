import type { Media, MediaUpload, MediaVariantInput } from '../api/content';
import type { UploadTicket } from './index';
import { optimizeImage, OptimizeImageError, type OptimizedImage } from './optimize-image';
import { xhrPut, type PutOutcome } from './upload';

/**
 * Browser side of an upload to the media library (ADR 0034), in 4 steps:
 *
 *   1. optimize  (browser)                  WebP/JPEG, up to 3 widths, no metadata
 *   2. declare   (Server Action → API)      sizes and type → one presigned PUT per size
 *   3. PUT       (browser → storage)        every size straight to the public bucket
 *   4. complete  (Server Action → API)      the API checks every object → image `ready`
 *
 * Never throws: answers a result like the Server Actions. Dependencies are injected (tested in
 * media-upload.test.ts); an app wires its Server Actions in.
 */

export type MediaUploadPhase = 'optimizing' | 'preparing' | 'uploading' | 'verifying';

export type MediaUploadResult =
  | { ok: true; media: Media }
  | {
      ok: false;
      /**
       * unsupported_type, too_large, decode_failed, encode_failed (optimizing), aborted,
       * upload_failed (storage unreachable or CORS), upload_rejected (storage refused), or an API
       * code (validation_error, upload_incomplete, upload_mismatch, rate_limited…).
       */
      code: string;
      message: string;
      requestId?: string;
    };

type Failure = Extract<MediaUploadResult, { ok: false }>;
type ActionResult<T> = { ok: true; data: T } | (Failure & { errors?: unknown });

export interface MediaUploaderDeps {
  declare(input: { filename: string; contentType: Media['contentType']; variants: MediaVariantInput[] }): Promise<ActionResult<MediaUpload>>;
  complete(mediaId: string): Promise<ActionResult<Media>>;
  optimize?: (file: File) => Promise<OptimizedImage>;
  put?: (ticket: UploadTicket, body: Blob, options: { onProgress?: (loaded: number) => void; signal?: AbortSignal }) => Promise<PutOutcome>;
}

export interface MediaUploadOptions {
  onPhase?: (phase: MediaUploadPhase) => void;
  /** Bytes sent so far over every size, during step 3. */
  onProgress?: (loaded: number, total: number) => void;
  signal?: AbortSignal;
}

const ABORTED: Failure = { ok: false, code: 'aborted', message: 'The upload was cancelled.' };

export function createMediaUploader(deps: MediaUploaderDeps) {
  const optimize = deps.optimize ?? optimizeImage;
  const put = deps.put ?? ((ticket, body, options) => xhrPut(ticket, body, { onProgress: options.onProgress, signal: options.signal }));

  return async function upload(file: File, options: MediaUploadOptions = {}): Promise<MediaUploadResult> {
    const { signal, onPhase, onProgress } = options;
    onPhase?.('optimizing');
    let image: OptimizedImage;
    try {
      image = await optimize(file);
    } catch (error) {
      const code = error instanceof OptimizeImageError ? error.code : 'decode_failed';
      return { ok: false, code, message: `The image could not be prepared (${code}).` };
    }
    if (signal?.aborted) return ABORTED;

    onPhase?.('preparing');
    const declared = await call(() =>
      deps.declare({
        filename: file.name,
        contentType: image.contentType,
        variants: image.sizes.map(({ width, height, blob }) => ({ width, height, size: blob.size })),
      }),
    );
    if (!declared.ok) return declared;

    onPhase?.('uploading');
    const total = image.sizes.reduce((sum, s) => sum + s.blob.size, 0);
    const sent = new Map<number, number>();
    for (const size of image.sizes) {
      const target = declared.data.uploads.find((u) => u.width === size.width);
      if (!target) return { ok: false, code: 'upload_rejected', message: 'The server did not accept every size.' };
      const ticket: UploadTicket = { fileId: declared.data.media.id, url: target.url, headers: target.headers, expiresAt: target.expiresAt };
      const outcome = await put(ticket, size.blob, {
        signal,
        onProgress: (loaded) => {
          sent.set(size.width, loaded);
          onProgress?.([...sent.values()].reduce((a, b) => a + b, 0), total);
        },
      });
      if (outcome.kind === 'aborted') return ABORTED;
      if (outcome.kind === 'network') return { ok: false, code: 'upload_failed', message: 'The storage could not be reached.' };
      if (outcome.kind === 'http') return { ok: false, code: 'upload_rejected', message: `The storage refused the upload (${outcome.status}).` };
      sent.set(size.width, size.blob.size);
    }

    onPhase?.('verifying');
    const completed = await call(() => deps.complete(declared.data.media.id));
    return completed.ok ? { ok: true, media: completed.data } : completed;
  };
}

/** A Server Action that throws (network, server down) becomes a failure, never an exception. */
async function call<T>(action: () => Promise<ActionResult<T>>): Promise<ActionResult<T> & ({ ok: true } | Failure)> {
  try {
    const result = await action();
    if (result.ok) return result;
    return { ok: false, code: result.code, message: result.message, requestId: result.requestId };
  } catch {
    return { ok: false, code: 'network_error', message: 'The server could not be reached.' };
  }
}
