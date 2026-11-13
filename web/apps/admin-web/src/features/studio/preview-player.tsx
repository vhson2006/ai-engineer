'use client';

import { Player } from '@remotion/player';
import type { StudioCompositionProps } from '@web/core/api';
import { COMPOSITIONS, totalFrames } from '@web/video';

/**
 * The video in the browser (Remotion Player, ADR 0039): the same compositions render-worker
 * renders, with the same props. Nothing is rendered on a server or counted. Loaded with
 * next/dynamic (ssr: false): Remotion and its font loader need a browser.
 */
export default function PreviewPlayer({ props }: { props: StudioCompositionProps }) {
  const component = COMPOSITIONS[props.templateId];
  if (!component) return null;
  return (
    <Player
      component={component}
      inputProps={props}
      durationInFrames={Math.max(1, totalFrames(props))}
      fps={props.fps}
      compositionWidth={props.width}
      compositionHeight={props.height}
      controls
      style={{ width: '100%', aspectRatio: `${props.width} / ${props.height}`, borderRadius: 16, overflow: 'hidden' }}
    />
  );
}
