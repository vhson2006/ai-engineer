import type { ReactNode } from 'react';
import { Container, cn } from '@web/ui';

const TONES = {
  white: 'bg-bg',
  mint: 'bg-wash-mint',
  rose: 'bg-wash-rose',
  baby: 'bg-wash-baby',
  lilac: 'bg-wash-lilac',
} as const;

/**
 * A full-width band behind one section: the page alternates white and pastel washes so long
 * scrolls don't feel empty. Washes are lighter than the bento card fills; cards that would be
 * grey on a wash use `bg-surface` (white) instead.
 *
 * `id`: the anchor the menu scrolls to (SectionNav, SmoothScroll). The BAND carries it, so a
 * section stops right under the sticky header (`--header-h`) with the band's own top padding as
 * breathing room, and the band's colour fills the screen edge to edge.
 */
export function Band({ id, tone, className, children }: { id?: string; tone: keyof typeof TONES; className?: string; children: ReactNode }) {
  return (
    <div id={id} className={cn('scroll-mt-(--header-h) py-14 sm:py-16', TONES[tone], className)}>
      <Container className="max-w-7xl">{children}</Container>
    </div>
  );
}
