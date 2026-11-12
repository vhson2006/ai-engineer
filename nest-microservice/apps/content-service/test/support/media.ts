import { InMemoryObjectStorage, OBJECT_STORAGE } from '@app/common';
import { MediaUrls } from '../../src/media/media-urls';
import { MediaService } from '../../src/media/media.service';

/** The media library's providers for unit tests: a real MediaService on an in-memory bucket. */
export function mediaProviders(storage = new InMemoryObjectStorage()) {
  return [MediaService, MediaUrls, { provide: OBJECT_STORAGE, useValue: storage }];
}

/** A ready image row of the `nails` site (two sizes, WebP). */
export function mediaRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '7d0c4f3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f',
    siteId: 'nails',
    status: 'ready',
    source: 'upload',
    prompt: null,
    generationJobId: null,
    error: null,
    filename: 'shop.jpg',
    contentType: 'image/webp',
    width: 1280,
    height: 853,
    variants: [
      { width: 640, height: 427, size: 40_000 },
      { width: 1280, height: 853, size: 120_000 },
    ],
    createdBy: 'u-writer',
    createdAt: new Date('2026-11-12T01:00:00Z'),
    uploadedAt: new Date('2026-11-12T01:00:05Z'),
    ...overrides,
  };
}
