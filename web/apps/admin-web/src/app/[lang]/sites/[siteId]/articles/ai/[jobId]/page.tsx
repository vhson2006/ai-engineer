import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isUuid } from '@web/core/actions/result';
import { ARTICLE_DRAFT_BUSY, getArticleDraft } from '@web/core/api';
import { format } from '@web/core/i18n/format';
import { buttonClass, Card } from '@web/ui';
import { Skeleton } from '@web/ui/skeleton';
import { AlertTriangleIcon, CheckCircle2Icon, LoaderCircleIcon } from 'lucide-react';
import { ApiFailure } from '@/components/api-failure';
import { BackLink, PageHeader, PageShell } from '@/components/page';
import { BriefForm } from '@/features/ai-articles/brief-form';
import { requireUser } from '@/features/auth/require-user';
import { siteOr404 } from '@/features/sites/data';
import { BusyPoller } from '@/features/studio/busy-poller';
import { href, type Locale } from '@/i18n/locales';
import { getLocale, getMessages, type Messages } from '@/i18n/messages';

type Props = PageProps<'/[lang]/sites/[siteId]/articles/ai/[jobId]'>;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).aiArticles.title };
}

/**
 * Write an article with AI (ADR 0041): the brief to check (step 2), the progress, then the draft
 * article. The page refreshes itself while an AI step runs.
 */
export default async function AiArticlePage({ params }: Props) {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <PageShell fallback={<Skeleton className="h-[32rem] rounded-2xl" />}>
      <AiArticle t={t} locale={locale} params={params} />
    </PageShell>
  );
}

async function AiArticle({ t, locale, params }: { t: Messages; locale: Locale; params: Props['params'] }) {
  const { siteId, jobId } = await params;
  const list = href(locale, `/sites/${siteId}/articles`);
  const self = `${list}/ai/${jobId}`;
  await requireUser(locale, self);
  if (!isUuid(jobId)) notFound();

  const site = await siteOr404(siteId);
  if (!site.ok) return <ApiFailure t={t} failure={site} />;
  const job = await getArticleDraft(siteId, jobId);
  if (!job.ok && job.status === 404) notFound();
  if (!job.ok) return <ApiFailure t={t} failure={job} />;

  const a = t.aiArticles;
  const j = job.data;
  const busy = ARTICLE_DRAFT_BUSY.includes(j.status);
  const canWrite = j.status === 'prompted' || (j.status === 'failed' && Boolean(j.prompt));
  const warnings: Record<string, string> = a.warnings;
  const warning = (code: string) => (/^\d+$/.test(code) ? format(a.warnings.number, { value: code }) : (warnings[code] ?? code));
  const step = { prompting: a.steps.prompting, writing: a.steps.writing, illustrating: a.steps.illustrating } as Record<string, string>;

  return (
    <div className="space-y-6">
      <BusyPoller busy={busy} />
      <BackLink href={list}>{a.back}</BackLink>
      <PageHeader eyebrow={<>{site.data.name} · {j.idea.topic} · {j.locale.toUpperCase()}</>} title={j.idea.idea} />

      {busy && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:bg-sky-500/10 dark:text-sky-200"
        >
          <LoaderCircleIcon aria-hidden className="size-4 animate-spin" />
          {step[j.status]}
        </p>
      )}
      {j.status === 'failed' && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900 dark:bg-red-500/10 dark:text-red-200"
        >
          <AlertTriangleIcon aria-hidden className="size-4" />
          {format(a.failed, { code: j.error ?? 'error' })}
        </p>
      )}

      {canWrite && j.prompt && (
        <Card>
          <h2 className="text-lg font-semibold">{a.briefTitle}</h2>
          <p className="mt-1 text-sm text-muted">{a.briefHint}</p>
          <div className="mt-4">
            <BriefForm
              key={j.updatedAt}
              siteId={siteId}
              jobId={j.id}
              prompt={j.prompt}
              outline={j.outline}
              labels={{ t: a, common: t.common, validation: t.validation }}
            />
          </div>
        </Card>
      )}

      {j.status === 'completed' && j.articleId && (
        <Card>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CheckCircle2Icon aria-hidden className="size-5 text-emerald-600" />
            {a.doneTitle}
          </h2>
          <p className="mt-1 text-sm text-muted">{a.doneHint}</p>
          {j.warnings.length > 0 && (
            <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              <p className="font-medium">{a.warnings.title}</p>
              <ul className="mt-1 list-disc pl-5">
                {j.warnings.map((code) => (
                  <li key={code}>{warning(code)}</li>
                ))}
              </ul>
            </div>
          )}
          <Link href={`${list}/${j.articleId}`} className={`${buttonClass.primary} mt-4`}>
            {a.open}
          </Link>
        </Card>
      )}
      <p className="text-xs text-subtle">{a.notice}</p>
    </div>
  );
}
