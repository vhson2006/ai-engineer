import Image, { type StaticImageData } from 'next/image';

/** An image of a site's media library (ADR 0034): optimized sizes on the CDN (`srcset`), the widest in `url`. */
export interface LibraryImage {
  url: string;
  srcset: string;
  width: number;
  height: number;
}

/**
 * An article cover: the media library image the admins chose (with its alt text in the page's
 * language), or one of the site's own photos (a static import).
 */
export type Cover = { kind: 'media'; image: LibraryImage; alt: string } | { kind: 'photo'; photo: StaticImageData };

/**
 * An article cover. A media library image is already optimized (WebP, 640/1280/1920 px on the
 * CDN, ADR 0034): a plain <img srcset> lets the browser pick the size, with no second resize by
 * the Next.js image optimizer. A site photo goes through next/image (blur placeholder).
 * `decorative`: in a card the title is the link, so the image says nothing more (alt="").
 */
export function CoverImage({
  cover,
  sizes,
  priority = false,
  decorative = false,
  className,
}: {
  cover: Cover;
  sizes: string;
  priority?: boolean;
  decorative?: boolean;
  className?: string;
}) {
  if (cover.kind === 'photo') {
    return <Image src={cover.photo} alt="" placeholder="blur" priority={priority} sizes={sizes} className={className} />;
  }
  const { image } = cover;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.url}
      srcSet={image.srcset}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={decorative ? '' : cover.alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      className={className}
    />
  );
}
