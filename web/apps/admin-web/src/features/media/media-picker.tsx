'use client';

import type { Media } from '@web/core/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@web/ui/dialog';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { MediaLibrary, type MediaLabels } from './media-library';

/**
 * "Choose an image" from the site's library (or upload one right there): `pick()` opens the
 * dialog and resolves with the chosen image, or null when it is closed. Render `dialog` once.
 */
export function useMediaPicker({
  siteId,
  initial,
  labels,
  closeLabel,
}: {
  siteId: string;
  initial: Media[];
  labels: MediaLabels;
  closeLabel: string;
}): {
  pick: () => Promise<Media | null>;
  dialog: ReactNode;
} {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initial);
  const resolver = useRef<((media: Media | null) => void) | null>(null);

  const settle = useCallback((media: Media | null) => {
    resolver.current?.(media);
    resolver.current = null;
    setOpen(false);
  }, []);

  const pick = useCallback(() => {
    resolver.current?.(null); // a previous, unanswered pick
    setOpen(true);
    return new Promise<Media | null>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const dialog = (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : settle(null))}>
      <DialogContent closeLabel={closeLabel} className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{labels.pickerTitle}</DialogTitle>
          <DialogDescription>{labels.pickerHint}</DialogDescription>
        </DialogHeader>
        <MediaLibrary siteId={siteId} items={items} setItems={setItems} labels={labels} onPick={settle} />
      </DialogContent>
    </Dialog>
  );
  return { pick, dialog };
}
