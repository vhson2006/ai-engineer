import { STUDIO_BUSY, type StudioProjectStatus } from '@web/core/api/studio-status';
import { Badge } from '@web/ui/badge';
import { LoaderCircleIcon } from 'lucide-react';
import type { Messages } from '@/i18n/messages';

const TONES: Record<StudioProjectStatus, 'neutral' | 'info' | 'brand' | 'success'> = {
  draft: 'neutral',
  suggesting: 'info',
  writing: 'info',
  written: 'brand',
  voicing: 'info',
  voiced: 'brand',
  rendering: 'info',
  rendered: 'success',
};

export function StudioStatusBadge({ status, t }: { status: StudioProjectStatus; t: Messages['studio'] }) {
  return (
    <Badge tone={TONES[status]}>
      {STUDIO_BUSY.includes(status) && <LoaderCircleIcon aria-hidden className="size-3 animate-spin" />}
      {t.status[status]}
    </Badge>
  );
}
