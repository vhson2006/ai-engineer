import { Card } from '@web/ui';
import type { Messages } from '@/i18n/messages';

/** A failed API call on a page: the safe message and the request id (support finds the logs). */
export function ApiFailure({ t, failure, bare }: { t: Messages; failure: { message: string; requestId: string }; bare?: boolean }) {
  const content = (
    <>
      <p className="font-semibold">{t.overview.errors.title}</p>
      <p className="mt-2 text-sm text-subtle">
        {failure.message} · {t.common.requestId} <code className="font-mono">{failure.requestId}</code>
      </p>
    </>
  );
  return bare ? <div className="p-6">{content}</div> : <Card>{content}</Card>;
}
