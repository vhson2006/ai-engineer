'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image, { type StaticImageData } from 'next/image';
import { useState, type KeyboardEvent } from 'react';
import { format } from '@web/core/i18n/format';
import { cn } from '@web/ui';
import { Dialog, DialogContent, DialogTitle } from '@web/ui/dialog';

export interface GalleryPhoto {
  id: string;
  image: StaticImageData;
  alt: string;
}

export interface GalleryLabels {
  viewPhoto: string;
  photoCount: string;
  previous: string;
  next: string;
  close: string;
}

/** Masonry album; a photo opens a lightbox (Radix Dialog: focus trap, Escape) with ← → navigation. */
export function Gallery({ photos, labels }: { photos: GalleryPhoto[]; labels: GalleryLabels }) {
  const [open, setOpen] = useState<number | null>(null);
  const current = open === null ? null : photos[open];
  const go = (step: number) => setOpen((index) => (index === null ? null : (index + step + photos.length) % photos.length));

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight') go(1);
    else if (event.key === 'ArrowLeft') go(-1);
  };

  return (
    <>
      <ul className="columns-2 gap-3 sm:gap-4 lg:columns-3">
        {photos.map((photo, index) => (
          <li key={photo.id} className="mb-3 break-inside-avoid sm:mb-4">
            <button
              type="button"
              onClick={() => setOpen(index)}
              aria-label={format(labels.viewPhoto, { title: photo.alt })}
              className="group block w-full overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <Image
                src={photo.image}
                alt=""
                placeholder="blur"
                sizes="(min-width: 1024px) 360px, 50vw"
                className="w-full transition duration-700 group-hover:scale-105 group-hover:brightness-105"
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={open !== null} onOpenChange={(value) => !value && setOpen(null)}>
        {current && open !== null && (
          <DialogContent
            closeLabel={labels.close}
            aria-describedby={undefined}
            onKeyDown={onKeyDown}
            className="max-w-5xl gap-3 border-none bg-black/90 p-3 text-white sm:p-4 [&>button:last-child]:text-white/80 [&>button:last-child]:hover:bg-white/10"
          >
            <DialogTitle className="pr-10 text-sm font-normal text-white/70">
              {format(labels.photoCount, { index: open + 1, total: photos.length })}
            </DialogTitle>
            <div className="relative flex items-center justify-center">
              <Image
                key={current.id}
                src={current.image}
                alt={current.alt}
                placeholder="blur"
                sizes="(min-width: 1024px) 1000px, 100vw"
                className="max-h-[78dvh] w-auto rounded-xl object-contain animate-fade-in"
              />
              {[
                { step: -1, label: labels.previous, Icon: ChevronLeft, side: 'left-1' },
                { step: 1, label: labels.next, Icon: ChevronRight, side: 'right-1' },
              ].map(({ step, label, Icon, side }) => (
                <button
                  key={step}
                  type="button"
                  aria-label={label}
                  onClick={() => go(step)}
                  className={cn(
                    'absolute top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-white',
                    side,
                  )}
                >
                  <Icon aria-hidden className="size-6" />
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-white/75">{current.alt}</p>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
