import type { ComponentType } from 'react';
import type { StudioVideoProps } from './props';
import { ShowcaseVideo } from './showcase-video';
import { StudioVideo, type StudioLook } from './studio-video';

/**
 * One composition per script template (ADR 0039): the template id of `STUDIO_TEMPLATES` in
 * nest-microservice → its component. A new template = a spec there + an entry here.
 */
const LOOKS: Record<string, StudioLook> = {
  'price-hook': 'price',
  'host-intro': 'host',
  'article-tips': 'tips',
};

function withLook(look: StudioLook): ComponentType<StudioVideoProps> {
  function Composition(props: StudioVideoProps) {
    return <StudioVideo look={look} {...props} />;
  }
  Composition.displayName = `StudioVideo(${look})`;
  return Composition;
}

export const COMPOSITIONS: Record<string, ComponentType<StudioVideoProps>> = {
  ...Object.fromEntries(Object.entries(LOOKS).map(([id, look]) => [id, withLook(look)])),
  // The bento brand film (after video/nails-promo), for any site.
  'brand-showcase': ShowcaseVideo,
};

export const COMPOSITION_IDS = Object.keys(COMPOSITIONS);
