'use client';

import type { StudioCompositionProps } from '@web/core/api';
import dynamic from 'next/dynamic';

const PreviewPlayer = dynamic(() => import('./preview-player'), {
  ssr: false,
  loading: () => <div className="aspect-[9/16] w-full animate-pulse rounded-2xl bg-surface-2" />,
});

/** The preview, only in the browser (see preview-player.tsx). */
export function StudioPreview({ props }: { props: StudioCompositionProps }) {
  return <PreviewPlayer props={props} />;
}
