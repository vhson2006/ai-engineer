'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { finishUpload, startUpload } from './actions';
import { acceptFor, type FilePurpose, type StoredFile } from '@web/core/files';
import { createUploader, type UploadOptions, type UploadResult } from '@web/core/files/upload';

/**
 * Uploads a file from a client component, without a hook (several files, custom UI):
 *
 *   const result = await uploadFile(file, 'deployment-attachment', { onProgress, signal });
 *   if (result.ok) result.file.id  else  result.message (+ result.requestId)
 */
export const uploadFile: (file: File, purpose: FilePurpose, options?: UploadOptions) => Promise<UploadResult> =
  createUploader({ start: startUpload, finish: finishUpload });

export type FileUploadState =
  | { status: 'idle' }
  | { status: 'preparing' | 'uploading' | 'verifying'; fileName: string; /** 0..1 */ progress: number }
  | { status: 'done'; file: StoredFile }
  | { status: 'error'; code: string; message: string; requestId?: string };

/**
 * One upload at a time, with its state for the UI:
 *
 *   const upload = useFileUpload('deployment-attachment');
 *   <input type="file" accept={upload.accept} onChange={(e) => e.target.files?.[0] && upload.start(e.target.files[0])} />
 *   {upload.state.status === 'uploading' && <progress value={upload.state.progress} />}
 *   {upload.state.status === 'done' && <input type="hidden" name="attachmentIds" value={upload.state.file.id} />}
 *   {upload.state.status === 'error' && <p role="alert">{upload.state.message}</p>}
 *
 * `start` resolves with the same UploadResult (for chaining); cancelling resets to idle. The upload
 * is cancelled when the component unmounts. An abandoned file stays `pending` and is deleted by
 * the API's cleanup job.
 */
export function useFileUpload(purpose: FilePurpose) {
  const [state, setState] = useState<FileUploadState>({ status: 'idle' });
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const start = useCallback(
    async (file: File): Promise<UploadResult> => {
      controller.current?.abort(); // a new file replaces the one in progress
      const current = new AbortController();
      controller.current = current;
      const fileName = file.name;
      const isCurrent = () => controller.current === current;

      setState({ status: 'preparing', fileName, progress: 0 });
      const result = await uploadFile(file, purpose, {
        signal: current.signal,
        onPhase: (phase) => {
          if (isCurrent()) setState({ status: phase, fileName, progress: phase === 'verifying' ? 1 : 0 });
        },
        onProgress: (loaded, total) => {
          if (isCurrent()) setState({ status: 'uploading', fileName, progress: total ? loaded / total : 0 });
        },
      });

      if (isCurrent()) {
        controller.current = null;
        if (result.ok) setState({ status: 'done', file: result.file });
        else if (result.code === 'aborted') setState({ status: 'idle' });
        else setState({ status: 'error', code: result.code, message: result.message, requestId: result.requestId });
      }
      return result;
    },
    [purpose],
  );

  const cancel = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setState({ status: 'idle' });
  }, []);

  const reset = cancel;

  return {
    state,
    start,
    cancel,
    reset,
    /** For <input type="file" accept={…}>. */
    accept: acceptFor(purpose),
    busy: state.status === 'preparing' || state.status === 'uploading' || state.status === 'verifying',
  };
}
