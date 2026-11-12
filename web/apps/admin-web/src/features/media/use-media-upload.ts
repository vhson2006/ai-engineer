'use client';

import { createMediaUploader } from '@web/core/files/media-upload';
import { completeMediaAction, declareMediaUploadAction } from './actions';

/**
 * Uploads one image to a site's media library (ADR 0034): optimized in this browser, every size
 * PUT straight to storage, then confirmed by the API. Never throws (see MediaUploadResult).
 */
export function uploadMedia(siteId: string, file: File, options?: Parameters<ReturnType<typeof createMediaUploader>>[1]) {
  const upload = createMediaUploader({
    declare: (input) => declareMediaUploadAction(siteId, input),
    complete: (id) => completeMediaAction(siteId, id),
  });
  return upload(file, options);
}

/** What <input type="file" accept> offers (decodable everywhere; never SVG or GIF). */
export const MEDIA_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
