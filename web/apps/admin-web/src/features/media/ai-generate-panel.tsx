'use client';

import type { Media, MediaGeneration } from '@web/core/api';
import { IMAGE_ASPECT_RATIOS, IMAGE_PROMPT_MAX_LENGTH, type ImageAspectRatio } from '@web/core/api/image-generation';
import { format } from '@web/core/i18n/format';
import { cn } from '@web/ui';
import { Button } from '@web/ui/button';
import { Textarea } from '@web/ui/input';
import { Label } from '@web/ui/label';
import { toast } from '@web/ui/toaster';
import { ChevronDownIcon, LoaderCircleIcon, SparklesIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { generateMediaAction, getMediaGenerationAction } from './actions';
import type { MediaLabels } from './media-library';

const POLL_MS = 3000;
/** ai-service retries for ~20 minutes at most; past this the admin is told to check back later. */
const GIVE_UP_MS = 4 * 60_000;
const COUNTS = [1, 2, 3, 4] as const;

/**
 * "Generate with AI" in the media library (ADR 0037): a description, a ratio and 1-4 options →
 * ai-service makes, optimizes and stores the images; this polls the job and hands the ready
 * ones to the library (`onReady`). Each image is paid for and counted in the site's quota.
 */
export function AiGeneratePanel({ siteId, labels, onReady }: { siteId: string; labels: MediaLabels; onReady: (media: Media[]) => void }) {
  const ai = labels.ai;
  const promptId = useId();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>('16:9');
  const [count, setCount] = useState(2);
  const [job, setJob] = useState<MediaGeneration | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const started = useRef(0);

  const errorText = (code: string | null | undefined) =>
    ai.errors[code as keyof typeof ai.errors] ?? labels.errors[code as keyof MediaLabels['errors']] ?? labels.errors.generic;

  const pending = job?.status === 'pending';

  const finish = (done: MediaGeneration) => {
    setJob(null);
    const ready = done.media.filter((m) => m.status === 'ready');
    if (ready.length) onReady(ready);
    if (done.status === 'failed' || !ready.length) {
      toast.error(errorText(done.media.find((m) => m.error)?.error ?? 'provider_unavailable'));
    } else if (ready.length < done.media.length) {
      toast.warning(format(ai.partial, { made: ready.length, count: done.media.length }));
    } else {
      toast.success(format(ai.done, { count: ready.length }));
    }
  };

  // Poll the job until ai-service has answered (or we stop waiting).
  useEffect(() => {
    if (!job || job.status !== 'pending') return;
    const timer = setTimeout(async () => {
      if (Date.now() - started.current > GIVE_UP_MS) {
        toast.message(errorText('timeout'));
        setJob(null);
        return;
      }
      const result = await getMediaGenerationAction(siteId, job.jobId);
      if (!result.ok) {
        // A network blip: keep polling (the job goes on server side); a 404 means it is gone.
        if (result.code === 'not_found') setJob(null);
        else setJob({ ...job });
        return;
      }
      setRemaining(result.data.remaining);
      if (result.data.status === 'pending') {
        setJob(result.data);
        return;
      }
      finish(result.data);
    }, POLL_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job]);

  const submit = async () => {
    if (!prompt.trim()) {
      toast.error(ai.errors.required);
      return;
    }
    setSubmitting(true);
    const result = await generateMediaAction(siteId, {
      prompt,
      aspectRatio,
      count,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(errorText(result.code));
      return;
    }
    started.current = Date.now();
    setRemaining(result.data.remaining);
    if (result.data.status === 'pending') setJob(result.data);
    else finish(result.data);
  };

  const [rw, rh] = aspectRatio.split(':').map(Number);

  return (
    <div className="rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand rounded-xl"
      >
        <SparklesIcon aria-hidden className="size-4 text-brand" />
        <span className="flex-1">{ai.title}</span>
        {remaining !== null && <span className="text-xs font-normal text-subtle">{format(ai.remaining, { count: remaining })}</span>}
        <ChevronDownIcon aria-hidden className={cn('size-4 text-subtle transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="grid gap-4 border-t border-border px-4 py-4">
          <p className="text-xs text-muted">{ai.hint}</p>
          <div className="grid gap-1.5">
            <Label htmlFor={promptId}>{ai.prompt}</Label>
            <Textarea
              id={promptId}
              value={prompt}
              maxLength={IMAGE_PROMPT_MAX_LENGTH}
              placeholder={ai.promptPlaceholder}
              disabled={pending || submitting}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </div>

          <fieldset className="grid gap-1.5" disabled={pending || submitting}>
            <legend className="mb-1.5 text-sm font-medium">{ai.aspectRatio}</legend>
            <div className="flex flex-wrap gap-2">
              {IMAGE_ASPECT_RATIOS.map((ratio) => (
                <Chip key={ratio} selected={aspectRatio === ratio} onClick={() => setAspectRatio(ratio)}>
                  {ai.ratios[ratio]}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-1.5" disabled={pending || submitting}>
            <legend className="mb-1.5 text-sm font-medium">{ai.count}</legend>
            <div className="flex gap-2">
              {COUNTS.map((n) => (
                <Chip key={n} selected={count === n} onClick={() => setCount(n)}>
                  {n}
                </Chip>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={submit} disabled={pending || submitting}>
              {pending || submitting ? (
                <LoaderCircleIcon aria-hidden className="size-4 animate-spin" />
              ) : (
                <SparklesIcon aria-hidden className="size-4" />
              )}
              {ai.generate}
            </Button>
            <p className="text-xs text-subtle">{ai.watermark}</p>
          </div>

          {pending && (
            <div aria-live="polite" className="grid gap-2">
              <p className="text-sm text-muted">{ai.generating}</p>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {job.media.map((m) => (
                  <li
                    key={m.id}
                    style={{ aspectRatio: `${rw} / ${rh}` }}
                    className="flex animate-pulse items-center justify-center rounded-lg bg-surface-2"
                  >
                    <SparklesIcon aria-hidden className="size-5 text-subtle" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50',
        selected ? 'border-brand bg-brand-soft font-medium text-fg' : 'border-border text-muted hover:bg-surface-2',
      )}
    >
      {children}
    </button>
  );
}
