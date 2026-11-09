import Image, { type StaticImageData } from 'next/image';
import { cn } from '@web/ui';

/** A screenshot in a minimal browser window (an address line, editorial chrome). */
export function BrowserFrame({
  image,
  alt,
  url,
  sizes,
  priority = false,
  className,
}: {
  image: StaticImageData;
  alt: string;
  url?: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('overflow-hidden rounded-sm bg-surface shadow-2xl shadow-black/10 ring-1 ring-border dark:shadow-black/40', className)}>
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <span aria-hidden className="size-1.5 rounded-full bg-brand" />
        {url && <span className="min-w-0 flex-1 truncate font-mono text-[0.7rem] text-subtle">{url}</span>}
      </div>
      <Image src={image} alt={alt} placeholder="blur" priority={priority} sizes={sizes} className="block w-full" />
    </div>
  );
}

/** A screenshot in a phone (rounded bezel). */
export function PhoneFrame({ image, alt, sizes, className }: { image: StaticImageData; alt: string; sizes: string; className?: string }) {
  return (
    <div className={cn('rounded-[1.6rem] border-[5px] border-neutral-900 bg-neutral-900 shadow-2xl shadow-black/25 dark:border-neutral-700', className)}>
      <Image src={image} alt={alt} placeholder="blur" sizes={sizes} className="block w-full rounded-[1.25rem]" />
    </div>
  );
}
