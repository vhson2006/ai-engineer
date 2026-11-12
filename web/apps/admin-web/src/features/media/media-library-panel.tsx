'use client';

import type { Media } from '@web/core/api';
import { useState } from 'react';
import { MediaLibrary, type MediaLabels } from './media-library';

/** The library page's client part: its own list state, deletion allowed. */
export function MediaLibraryPanel({ siteId, initial, labels }: { siteId: string; initial: Media[]; labels: MediaLabels }) {
  const [items, setItems] = useState(initial);
  return <MediaLibrary siteId={siteId} items={items} setItems={setItems} labels={labels} canDelete />;
}
