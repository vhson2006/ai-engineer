'use client';

import type { TranslationJob } from '@web/core/api';
import { format } from '@web/core/i18n/format';
import { Button } from '@web/ui/button';
import { toast } from '@web/ui/toaster';
import { LanguagesIcon, LoaderCircleIcon, TriangleAlertIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import type { Messages } from '@/i18n/dictionaries';
import { translateArticleAction } from './actions';

/**
 * "Translate from VI" on a language tab (ADR 0036). Machine translation is asynchronous: while the
 * latest job is pending the page refreshes every 2 s; the translation then arrives as a draft
 * translation (the editor reloads it). Only for a SAVED draft, never over unsaved changes.
 */
export function TranslatePanel({
  siteId,
  articleId,
  sourceLocale,
  targetLocale,
  hasTarget,
  latest,
  blockedReason,
  labels,
}: {
  siteId: string;
  articleId: string;
  sourceLocale: string;
  targetLocale: string;
  /** The article already has this language: translating replaces it (asked first). */
  hasTarget: boolean;
  /** The newest job for this language, if any. */
  latest?: TranslationJob;
  /** Why it can't be translated now (unsaved changes, not a draft…), or undefined. */
  blockedReason?: string;
  labels: Messages['articles']['translate'];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const running = latest?.status === 'pending';
  const source = sourceLocale.toUpperCase();
  const target = targetLocale.toUpperCase();

  // Poll while ai-service works; the editor remounts with the new translation when it is saved.
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(timer);
  }, [running, router]);

  const translate = (overwrite: boolean) =>
    startTransition(async () => {
      setConfirming(false);
      const result = await translateArticleAction(siteId, articleId, { targetLocale, sourceLocale, overwrite });
      if (!result.ok) toast.error(labels.errors[result.code as keyof typeof labels.errors] ?? result.message);
    });

  const reason = latest?.error ? (labels.reasons[latest.error as keyof typeof labels.reasons] ?? latest.error) : '';

  return (
    <div className="grid gap-3 rounded-xl border border-dashed border-border bg-surface-2/50 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <LanguagesIcon aria-hidden className="size-5 shrink-0 text-brand" />
        <p className="min-w-0 flex-1 text-sm text-muted">{format(labels.hint, { source, target })}</p>
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{format(labels.confirmOverwrite, { target })}</span>
            <Button type="button" size="sm" variant="destructive" onClick={() => translate(true)}>
              {labels.overwrite}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              {labels.cancel}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={Boolean(blockedReason) || running || pending}
            onClick={() => (hasTarget ? setConfirming(true) : translate(false))}
          >
            {running || pending ? <LoaderCircleIcon className="animate-spin" /> : <LanguagesIcon />}
            {running ? labels.pending : format(hasTarget ? labels.retranslate : labels.translate, { source })}
          </Button>
        )}
      </div>
      {blockedReason && !running && <p className="text-xs text-subtle">{blockedReason}</p>}
      <div aria-live="polite">
        {latest?.status === 'completed' && (
          <div className="grid gap-1.5 text-sm">
            <p className="font-medium text-emerald-700 dark:text-emerald-300">
              {format(labels.done, { provider: latest.provider ?? '' })}
            </p>
            {latest.warnings.length > 0 && (
              <div className="rounded-lg bg-amber-50 p-3 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                <p className="flex items-center gap-2 font-medium">
                  <TriangleAlertIcon aria-hidden className="size-4" />
                  {format(labels.warnings, { count: latest.warnings.length })}
                </p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs">
                  {latest.warnings.map((w, i) => (
                    <li key={i}>
                      {labels.warningKinds[w.kind]}: “{w.text}”
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {latest?.status === 'failed' && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {format(labels.failed, { reason })}
          </p>
        )}
      </div>
    </div>
  );
}
