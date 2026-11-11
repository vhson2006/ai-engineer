import type { ArticleStatus } from '@web/core/api';
import { Badge } from '@web/ui';

const TONES = { draft: 'neutral', scheduled: 'warning', published: 'success' } as const;

export function ArticleStatusBadge({ status, label }: { status: ArticleStatus; label: string }) {
  return <Badge tone={TONES[status]}>{label}</Badge>;
}
