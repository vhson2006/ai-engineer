'use client';

import type { Media, MediaImage } from '@web/core/api';
import { Button } from '@web/ui/button';
import { ImageIcon, XIcon } from 'lucide-react';
import type { Messages } from '@/i18n/dictionaries';

/**
 * The cover image of an article (ADR 0034): a preview of the chosen image of the site's library,
 * "choose / change" (the library dialog, where an image can also be uploaded) and "remove". The
 * form keeps only the id (`coverMediaId`); the alt text is per language (`coverAlt`).
 */
export function CoverField({
  cover,
  onChange,
  pick,
  labels,
  disabled,
}: {
  cover: MediaImage | null;
  onChange: (cover: MediaImage | null) => void;
  pick: () => Promise<Media | null>;
  labels: Messages['articles']['form']['cover'];
  disabled?: boolean;
}) {
  const choose = async () => {
    const media = await pick();
    if (media) onChange({ id: media.id, url: media.url, srcset: media.srcset, width: media.width, height: media.height });
  };

  return (
    <div className="grid gap-2">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover.url}
          srcSet={cover.srcset}
          sizes="20rem"
          width={cover.width}
          height={cover.height}
          alt=""
          className="aspect-[16/10] w-full rounded-lg bg-surface-2 object-cover"
        />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => void choose()}
          className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-sm text-muted hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
        >
          <ImageIcon aria-hidden className="size-6 text-subtle" />
          {labels.empty}
        </button>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={() => void choose()}>
          {cover ? labels.change : labels.choose}
        </Button>
        {cover && (
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onChange(null)}>
            <XIcon aria-hidden />
            {labels.remove}
          </Button>
        )}
      </div>
      <p className="text-xs text-subtle">{labels.hint}</p>
    </div>
  );
}
