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
 */
export function Band({ tone, className, children }: { tone: keyof typeof TONES; className?: string; children: ReactNode }) {
  return (
    <div className={cn('py-20 sm:py-28', TONES[tone], className)}>
      <Container className="max-w-7xl">{children}</Container>
    </div>
  );
}
