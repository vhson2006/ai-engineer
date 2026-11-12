import { Inject, Injectable } from '@nestjs/common';
import {
  MEDIA_EXTENSIONS,
  OBJECT_STORAGE,
  type MediaContentType,
  type MediaImage,
  type ObjectStorage,
} from '@app/common';
import type { Media } from '../generated/prisma/client';

/** One stored size of an image (`media.variants`); a type alias, so Prisma accepts it as JSON. */
export type StoredVariant = {
  width: number;
  height: number;
  size: number;
};

/**
 * Where the images of the media library live (ADR 0034): `media/<siteId>/<id>/<width>.<ext>` in
 * the PUBLIC bucket, served by the CDN (STORAGE_PUBLIC_BASE_URL). Also the only image URLs an
 * article body may use besides the site's own `/images/…` files (article-html.ts).
 */
@Injectable()
export class MediaUrls {
  constructor(@Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage) {}

  key(siteId: string, id: string, width: number, contentType: MediaContentType): string {
    return `media/${siteId}/${id}/${width}.${MEDIA_EXTENSIONS[contentType]}`;
  }

  /** `https://cdn…/media/<siteId>/`: every image of this site starts with it. */
  sitePrefix(siteId: string): string {
    return this.storage.publicUrl(`media/${siteId}/`);
  }

  /** The image as pages use it: the widest size in `url`, every size in `srcset`. */
  image(media: Media): MediaImage {
    const sizes = variantsOf(media);
    const url = (width: number) =>
      this.storage.publicUrl(
        this.key(media.siteId, media.id, width, media.contentType as MediaContentType),
      );
    return {
      id: media.id,
      url: url(media.width),
      width: media.width,
      height: media.height,
      srcset: sizes.map((v) => `${url(v.width)} ${v.width}w`).join(', '),
    };
  }

  variantUrl(media: Media, width: number): string {
    return this.storage.publicUrl(
      this.key(media.siteId, media.id, width, media.contentType as MediaContentType),
    );
  }
}

/** The sizes of a row, narrowest first (stored as JSON, written only by MediaService). */
export function variantsOf(media: Pick<Media, 'variants'>): StoredVariant[] {
  return [...(media.variants as unknown as StoredVariant[])].sort((a, b) => a.width - b.width);
}
