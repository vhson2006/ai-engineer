import { checkFile, contentTypeOf, type FilePurpose, type StoredFile, type UploadTicket } from './index';

/**
 * Browser side of an upload, in 3 steps:
 *
 *   1. start   (Server Action → API)  declare the file, get a presigned PUT URL
 *   2. PUT     (browser → storage)    the bytes go straight to S3 / Spaces / R2, never through
 *                                     Next.js or KrakenD; XMLHttpRequest for upload progress
 *   3. finish  (Server Action → API)  the API checks the stored object → file `uploaded`
 *
 * Never throws: returns an UploadResult (same shape as the Server Actions' results). Components
 * use it through `uploadFile()` / `useFileUpload()` (an app's features/files/use-file-upload.ts); this module only
 * has the logic, with its dependencies injected (unit tested in upload.test.ts).
 */

export type UploadPhase = 'preparing' | 'uploading' | 'verifying';

export type UploadResult =
  | { ok: true; file: StoredFile }
  | {
      ok: false;
      /**
       * invalid_file (refused before sending), aborted, upload_failed (storage unreachable),
       * upload_rejected (storage refused: link expired or file changed), network_error (our
       * server unreachable), or an API code (unauthenticated, validation_error, upload_mismatch…).
       */
      code: string;
      message: string;
      errors?: { field: string; message: string }[];
      requestId?: string;
    };

export interface UploadOptions {
  /** Bytes sent so far, during step 2. */
  onProgress?: (loaded: number, total: number) => void;
  onPhase?: (phase: UploadPhase) => void;
  signal?: AbortSignal;
}

type Failure = Extract<UploadResult, { ok: false }>;
type ActionResult<T> = { ok: true; data: T } | Failure;

export type PutOutcome =
  | { kind: 'ok' }
  | { kind: 'http'; status: number }
  | { kind: 'network' }
  | { kind: 'aborted' };

export interface UploaderDeps {
  start(input: { purpose: FilePurpose; filename: string; contentType: string; size: number }): Promise<ActionResult<UploadTicket>>;
  finish(fileId: string): Promise<ActionResult<StoredFile>>;
  put?: (ticket: UploadTicket, body: Blob, options: Pick<UploadOptions, 'onProgress' | 'signal'>) => Promise<PutOutcome>;
  sleep?: (ms: number) => Promise<void>;
}

/** Retries of the PUT on a network error or a 5xx / 429 from the storage (same URL, same bytes). */
const PUT_RETRIES = 2;
const PUT_BACKOFF_MS = 500;

const ABORTED: Failure = { ok: false, code: 'aborted', message: 'The upload was cancelled.' };

export function createUploader(deps: UploaderDeps) {
  const put = deps.put ?? xhrPut;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  return async function upload(file: File, purpose: FilePurpose, options: UploadOptions = {}): Promise<UploadResult> {
    const { signal, onPhase, onProgress } = options;
    const problem = checkFile(purpose, file);
    if (problem) return { ok: false, code: 'invalid_file', message: problem };
    if (signal?.aborted) return ABORTED;

    onPhase?.('preparing');
    const started = await call(() =>
      deps.start({ purpose, filename: file.name, contentType: contentTypeOf(purpose, file), size: file.size }),
    );
    if (!started.ok) return started;
    const ticket = started.data;

    onPhase?.('uploading');
    for (let attempt = 0; ; attempt++) {
      if (signal?.aborted) return ABORTED;
      const outcome = await put(ticket, file, { onProgress, signal });
      if (outcome.kind === 'ok') break;
      if (outcome.kind === 'aborted') return ABORTED;

      const transient = outcome.kind === 'network' || outcome.status >= 500 || outcome.status === 429;
      if (transient && attempt < PUT_RETRIES) {
        await sleep(PUT_BACKOFF_MS * 2 ** attempt);
        continue;
      }
      if (transient) {
        return { ok: false, code: 'upload_failed', message: 'The file could not be sent. Check your connection and try again.' };
      }
      // 403: signature refused (link expired, or headers/size differ from the signed ones); 4xx else.
      return { ok: false, code: 'upload_rejected', message: 'The storage refused the file. Please try again.' };
    }

    onPhase?.('verifying');
    const finished = await call(() => deps.finish(ticket.fileId));
    return finished.ok ? { ok: true, file: finished.data } : finished;
  };
}

/** A Server Action call rejects when our server can't be reached: turn that into a result. */
async function call<T>(action: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await action();
  } catch {
    return { ok: false, code: 'network_error', message: 'Could not reach the server. Check your connection and try again.' };
  }
}

/** PUT with XMLHttpRequest: fetch() can't report upload progress. */
export function xhrPut(
  ticket: UploadTicket,
  body: Blob,
  { onProgress, signal }: Pick<UploadOptions, 'onProgress' | 'signal'> = {},
): Promise<PutOutcome> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', ticket.url);
    for (const [name, value] of Object.entries(ticket.headers)) {
      // Forbidden header: the browser sets Content-Length itself (from the body: the same value).
      if (name.toLowerCase() !== 'content-length') xhr.setRequestHeader(name, value);
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded, event.total);
    };
    const onAbort = () => xhr.abort();
    const done = (outcome: PutOutcome) => {
      signal?.removeEventListener('abort', onAbort);
      resolve(outcome);
    };
    xhr.onload = () => done(xhr.status >= 200 && xhr.status < 300 ? { kind: 'ok' } : { kind: 'http', status: xhr.status });
    xhr.onerror = () => done({ kind: 'network' }); // also CORS refusals (no detail available)
    xhr.ontimeout = () => done({ kind: 'network' });
    xhr.onabort = () => done({ kind: 'aborted' });
    signal?.addEventListener('abort', onAbort, { once: true });
    xhr.send(body);
  });
}
