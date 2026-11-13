'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@web/ui/dialog';
import type { PickedVideo } from '@web/ui/rich-text-editor';
import { VideoIcon } from 'lucide-react';
import { useCallback, useRef, useState, type ReactNode } from 'react';

/** A finished clip of the site's video studio (ADR 0039), as the server page lists it. */
export interface StudioClip extends PickedVideo {
  id: string;
  title: string;
}

export interface VideoPickerLabels {
  title: string;
  hint: string;
  empty: string;
}

/**
 * "Choose a video" among the site's finished studio clips: `pick()` opens the dialog and resolves
 * with the clip (its web MP4 and poster), or null when it is closed. Render `dialog` once.
 */
export function useVideoPicker({ clips, labels, closeLabel }: { clips: StudioClip[]; labels: VideoPickerLabels; closeLabel: string }): {
  pick: () => Promise<PickedVideo | null>;
  dialog: ReactNode;
} {
  const [open, setOpen] = useState(false);
  const resolver = useRef<((video: PickedVideo | null) => void) | null>(null);

  const settle = useCallback((video: PickedVideo | null) => {
    resolver.current?.(video);
    resolver.current = null;
    setOpen(false);
  }, []);

  const pick = useCallback(() => {
    resolver.current?.(null); // a previous, unanswered pick
    setOpen(true);
    return new Promise<PickedVideo | null>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const dialog = (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : settle(null))}>
      <DialogContent closeLabel={closeLabel} className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.hint}</DialogDescription>
        </DialogHeader>
        {clips.length === 0 ? (
          <p className="text-sm text-subtle">{labels.empty}</p>
        ) : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {clips.map(({ id, title, ...video }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => settle(video)}
                  className="group grid w-full gap-1.5 text-left focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <span className="flex aspect-[9/16] items-center justify-center overflow-hidden rounded-lg bg-black text-white/70 ring-brand group-hover:ring-2">
                    {video.poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={video.poster} alt="" className="size-full object-cover" />
                    ) : (
                      <VideoIcon aria-hidden className="size-6" />
                    )}
                  </span>
                  <span className="truncate text-xs font-medium">{title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
  return { pick, dialog };
}
