'use client';

import type { Media } from '@web/core/api';
import type { MediaUploadPhase } from '@web/core/files/media-upload';
import { format } from '@web/core/i18n/format';
import { cn } from '@web/ui';
import { Button } from '@web/ui/button';
import { toast } from '@web/ui/toaster';
import { CheckIcon, CopyIcon, ImagePlusIcon, LoaderCircleIcon, Trash2Icon } from 'lucide-react';
import { useId, useRef, useState, type Dispatch, type DragEvent, type SetStateAction } from 'react';
import type { Messages } from '@/i18n/dictionaries';
import { deleteMediaAction } from './actions';
import { AiGeneratePanel } from './ai-generate-panel';
import { MEDIA_ACCEPT, uploadMedia } from './use-media-upload';

export type MediaLabels = Messages['media'];

interface Uploading {
  key: string;
  name: string;
  phase: MediaUploadPhase;
  percent: number;
}

/**
 * A site's media library: upload (optimized in the browser, ADR 0034) or generate with AI
 * (ADR 0037), browse, copy an image's
 * URL, and either pick one (`onPick`, in the picker dialog) or delete unused ones (library page).
 */
export function MediaLibrary({
  siteId,
  items,
  setItems,
  labels,
  onPick,
  canDelete = false,
}: {
  siteId: string;
  items: Media[];
  setItems: Dispatch<SetStateAction<Media[]>>;
  labels: MediaLabels;
  onPick?: (media: Media) => void;
  canDelete?: boolean;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<Uploading[]>([]);
  const [dragging, setDragging] = useState(false);

  const errorMessage = (code: string) => labels.errors[code as keyof MediaLabels['errors']] ?? labels.errors.generic;

  const upload = async (files: File[]) => {
    for (const file of files) {
      const key = `${file.name}:${file.size}:${Math.random()}`;
      const update = (patch: Partial<Uploading>) => setUploading((list) => list.map((u) => (u.key === key ? { ...u, ...patch } : u)));
      setUploading((list) => [...list, { key, name: file.name, phase: 'optimizing', percent: 0 }]);
      const result = await uploadMedia(siteId, file, {
        onPhase: (phase) => update({ phase }),
        onProgress: (loaded, total) => update({ percent: Math.round((loaded / total) * 100) }),
      });
      setUploading((list) => list.filter((u) => u.key !== key));
      if (result.ok) {
        setItems((list) => [result.media, ...list]);
        toast.success(format(labels.uploaded, { name: file.name }));
      } else {
        toast.error(format(labels.uploadFailed, { name: file.name }), {
          description: errorMessage(result.code),
        });
      }
    }
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void upload([...event.dataTransfer.files].filter((f) => f.type.startsWith('image/')));
  };

  return (
    <div className="grid gap-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-6 text-center transition-colors',
          dragging && 'border-brand bg-brand-soft',
        )}
      >
        <ImagePlusIcon aria-hidden className="size-6 text-subtle" />
        <p className="text-sm text-muted">{labels.dropHint}</p>
        <input
          ref={input}
          id={inputId}
          type="file"
          accept={MEDIA_ACCEPT}
          multiple
          className="sr-only"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = '';
            void upload(files);
          }}
        />
        <Button type="button" variant="secondary" size="sm" onClick={() => input.current?.click()}>
          {labels.upload}
        </Button>
        <p className="text-xs text-subtle">{labels.optimizeHint}</p>
      </div>

      <AiGeneratePanel siteId={siteId} labels={labels} onReady={(made) => setItems((list) => [...made, ...list])} />

      {uploading.length > 0 && (
        <ul className="grid gap-2" aria-live="polite">
          {uploading.map((u) => (
            <li key={u.key} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">
              <LoaderCircleIcon aria-hidden className="size-4 animate-spin text-brand" />
              <span className="min-w-0 flex-1 truncate">{u.name}</span>
              <span className="text-xs text-subtle">
                {labels.phases[u.phase]}
                {u.phase === 'uploading' ? ` ${u.percent}%` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}

      {items.length === 0 && uploading.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{labels.empty}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((media) => (
            <MediaTile
              key={media.id}
              media={media}
              labels={labels}
              onPick={onPick}
              onDelete={
                canDelete
                  ? async () => {
                      const result = await deleteMediaAction(siteId, media.id);
                      if (result.ok) {
                        setItems((list) => list.filter((m) => m.id !== media.id));
                        toast.success(labels.deleted);
                      } else {
                        toast.error(errorMessage(result.code));
                      }
                    }
                  : undefined
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function MediaTile({
  media,
  labels,
  onPick,
  onDelete,
}: {
  media: Media;
  labels: MediaLabels;
  onPick?: (media: Media) => void;
  onDelete?: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const thumb = media.variants[0]?.url ?? media.url;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(media.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(labels.copyFailed);
    }
  };

  const image = (
    // Our CDN's optimized sizes (CSP img-src: STORAGE_ORIGINS); the smallest is enough here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={thumb}
      alt=""
      width={media.width}
      height={media.height}
      loading="lazy"
      className="aspect-[4/3] w-full rounded-lg bg-surface-2 object-cover"
    />
  );

  // min-w-0 + grid-cols-1 (minmax(0, 1fr)): neither a long name (AI images are named after their
  // prompt) nor a portrait image (its intrinsic size) may widen the column.
  return (
    <li className="group grid min-w-0 grid-cols-1 gap-1.5">
      {onPick ? (
        <button
          type="button"
          onClick={() => onPick(media)}
          aria-label={format(labels.pick, { name: media.filename })}
          className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand hover:opacity-90"
        >
          {image}
        </button>
      ) : (
        image
      )}
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium" title={media.filename}>
            {media.filename}
          </p>
          <p className="text-[11px] text-subtle">
            {media.source === 'ai' && (
              <span title={media.prompt ?? undefined} className="mr-1 rounded bg-brand-soft px-1 font-semibold text-brand">
                {labels.ai.badge}
              </span>
            )}
            {media.width} × {media.height} · {media.contentType === 'image/webp' ? 'WebP' : 'JPEG'}
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          title={labels.copyUrl}
          aria-label={labels.copyUrl}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-brand"
        >
          {copied ? <CheckIcon aria-hidden className="size-3.5 text-emerald-600" /> : <CopyIcon aria-hidden className="size-3.5" />}
        </button>
        {onDelete && (
          <button
            type="button"
            disabled={deleting}
            onClick={async () => {
              if (!confirming) {
                setConfirming(true);
                setTimeout(() => setConfirming(false), 4000);
                return;
              }
              setDeleting(true);
              await onDelete();
              setDeleting(false);
              setConfirming(false);
            }}
            title={confirming ? labels.confirmDelete : labels.delete}
            aria-label={confirming ? labels.confirmDelete : labels.delete}
            className={cn(
              'inline-flex h-7 items-center justify-center gap-1 rounded-md px-1.5 text-muted hover:bg-surface-2 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50',
              confirming && 'bg-red-50 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300',
            )}
          >
            <Trash2Icon aria-hidden className="size-3.5" />
            {confirming && labels.confirmDelete}
          </button>
        )}
      </div>
    </li>
  );
}
