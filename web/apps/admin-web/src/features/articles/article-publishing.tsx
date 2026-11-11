'use client';

import type { ActionFailure } from '@web/core/actions/result';
import type { Article } from '@web/core/api';
import { format } from '@web/core/i18n/format';
import { Card } from '@web/ui';
import { Button } from '@web/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@web/ui/dialog';
import { Input } from '@web/ui/input';
import { toast } from '@web/ui/toaster';
import { LoaderCircleIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import { LocalDate } from '@/components/local-date';
import type { Messages } from '@/i18n/dictionaries';
import { deleteArticleAction, publishArticleAction, unpublishArticleAction } from './actions';
import { ArticleStatusBadge } from './status-badge';

/** The API refuses a schedule less than a minute ahead; ask for two to leave time to click. */
const MIN_LEAD_MS = 2 * 60_000;

/** `datetime-local` value (the browser's time zone) for a Date. */
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Status, publish (now or at a date), unpublish / cancel the schedule, delete. Inside the
 * article form: buttons only (type="button"), no nested <form>.
 */
export function ArticlePublishing({
  siteId,
  article,
  dirty,
  t,
  common,
  validation,
  listHref,
  intlLocale,
}: {
  siteId: string;
  article: Article;
  dirty: boolean;
  t: Messages['articles'];
  common: Messages['common'];
  validation: Record<string, string>;
  listHref: string;
  intlLocale: string;
}) {
  const p = t.publish;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<'publish' | 'unpublish' | 'delete' | null>(null);
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [at, setAt] = useState('');
  const [minAt, setMinAt] = useState('');
  const [atError, setAtError] = useState<string | null>(null);
  const atId = useId();
  const dateFormat = new Intl.DateTimeFormat(intlLocale, { dateStyle: 'medium', timeStyle: 'short' });

  const fail = (result: ActionFailure): void => {
    toast.error(result.message, { description: result.requestId ? `${common.requestId}: ${result.requestId}` : undefined });
  };

  const openDialog = (next: typeof dialog) => {
    if (next === 'publish' && dirty) {
      toast.error(p.saveFirst); // publishing would publish the SAVED version, not what is on screen
      return;
    }
    setAtError(null);
    setWhen('now');
    setAt(toLocalInput(new Date(Date.now() + 60 * 60_000)));
    setMinAt(toLocalInput(new Date(Date.now() + MIN_LEAD_MS)));
    setDialog(next);
  };

  const publish = () => {
    let iso: string | undefined;
    if (when === 'later') {
      const date = new Date(at);
      if (!at || Number.isNaN(date.getTime())) return setAtError(validation.invalidDate);
      if (date.getTime() < Date.now() + MIN_LEAD_MS) return setAtError(validation.tooSoon);
      iso = date.toISOString();
    }
    startTransition(async () => {
      const result = await publishArticleAction(siteId, article.id, iso ? { at: iso } : {});
      if (!result.ok) return fail(result);
      toast.success(iso ? format(p.scheduled, { date: dateFormat.format(new Date(iso)) }) : p.published);
      setDialog(null);
    });
  };

  const unpublish = () =>
    startTransition(async () => {
      const result = await unpublishArticleAction(siteId, article.id);
      if (!result.ok) return fail(result);
      toast.success(p.unpublished);
      setDialog(null);
    });

  const remove = () =>
    startTransition(async () => {
      const result = await deleteArticleAction(siteId, article.id);
      if (!result.ok) return fail(result);
      toast.success(t.delete.deleted);
      setDialog(null);
      router.push(listHref);
    });

  const onOpenChange = (open: boolean) => {
    if (!pending && !open) setDialog(null);
  };
  const spinner = pending && <LoaderCircleIcon className="animate-spin" />;

  return (
    <Card className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{t.columns.status}</h2>
        <ArticleStatusBadge status={article.status} label={t.status[article.status]} />
      </div>
      {article.status === 'scheduled' && article.scheduledAt && (
        <p className="text-sm text-muted">
          <LocalDate iso={article.scheduledAt} intlLocale={intlLocale} template={t.scheduledFor} />
        </p>
      )}
      {article.status === 'published' && article.publishedAt && (
        <p className="text-sm text-muted">
          <LocalDate iso={article.publishedAt} intlLocale={intlLocale} template={t.publishedOn} />
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {article.status === 'draft' && (
          <Dialog open={dialog === 'publish'} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
              <Button
                onClick={(event) => {
                  event.preventDefault();
                  openDialog('publish');
                }}
              >
                {p.button}
              </Button>
            </DialogTrigger>
            <DialogContent closeLabel={common.close}>
              <DialogHeader>
                <DialogTitle>{p.title}</DialogTitle>
                <DialogDescription>{p.description}</DialogDescription>
              </DialogHeader>
              <fieldset className="grid gap-3">
                <legend className="sr-only">{p.title}</legend>
                {(['now', 'later'] as const).map((value) => (
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <input type="radio" name="publish-when" value={value} checked={when === value} onChange={() => setWhen(value)} className="accent-brand" />
                    {value === 'now' ? p.now : p.later}
                  </label>
                ))}
                {when === 'later' && (
                  <div className="grid gap-1.5 pl-6">
                    <label htmlFor={atId} className="text-sm font-medium">
                      {p.at}
                    </label>
                    <Input
                      id={atId}
                      type="datetime-local"
                      value={at}
                      min={minAt}
                      onChange={(event) => {
                        setAt(event.target.value);
                        setAtError(null);
                      }}
                      aria-invalid={Boolean(atError)}
                      aria-describedby={`${atId}-hint`}
                    />
                    <p id={`${atId}-hint`} className={atError ? 'text-sm text-red-600 dark:text-red-400' : 'text-sm text-subtle'}>
                      {atError ?? format(p.atHint, { tz: Intl.DateTimeFormat().resolvedOptions().timeZone })}
                    </p>
                  </div>
                )}
              </fieldset>
              <DialogFooter>
                <Button variant="secondary" disabled={pending} onClick={() => setDialog(null)}>
                  {common.cancel}
                </Button>
                <Button disabled={pending} onClick={publish}>
                  {spinner}
                  {pending ? p.submitting : when === 'now' ? p.submit : p.schedule}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {article.status !== 'draft' && (
          <Dialog open={dialog === 'unpublish'} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
              <Button variant="secondary" onClick={() => openDialog('unpublish')}>
                {article.status === 'scheduled' ? p.cancelSchedule : p.unpublish}
              </Button>
            </DialogTrigger>
            <DialogContent closeLabel={common.close}>
              <DialogHeader>
                <DialogTitle>{p.unpublishTitle}</DialogTitle>
                <DialogDescription>{p.unpublishDescription}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="secondary" disabled={pending} onClick={() => setDialog(null)}>
                  {common.cancel}
                </Button>
                <Button disabled={pending} onClick={unpublish}>
                  {spinner}
                  {pending ? p.unpublishing : article.status === 'scheduled' ? p.cancelSchedule : p.unpublish}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <Dialog open={dialog === 'delete'} onOpenChange={onOpenChange}>
          <DialogTrigger asChild>
            <Button variant="ghost" className="text-red-600 hover:text-red-700 dark:text-red-400" onClick={() => openDialog('delete')}>
              {t.delete.button}
            </Button>
          </DialogTrigger>
          <DialogContent closeLabel={common.close}>
            <DialogHeader>
              <DialogTitle>{t.delete.title}</DialogTitle>
              <DialogDescription>{t.delete.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" disabled={pending} onClick={() => setDialog(null)}>
                {common.cancel}
              </Button>
              <Button disabled={pending} onClick={remove} className="bg-red-600 text-white hover:bg-red-700">
                {spinner}
                {pending ? common.deleting : t.delete.confirm}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}
