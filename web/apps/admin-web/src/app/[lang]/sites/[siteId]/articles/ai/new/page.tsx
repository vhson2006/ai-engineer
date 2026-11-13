import type { Metadata } from 'next';
import { Card } from '@web/ui';
import { Skeleton } from '@web/ui/skeleton';
import { ApiFailure } from '@/components/api-failure';
import { BackLink, PageHeader, PageShell } from '@/components/page';
import { IdeaForm } from '@/features/ai-articles/idea-form';
import { requireUser } from '@/features/auth/require-user';
import { categoryOptions } from '@/features/categories/display';
import { siteCategories, siteOr404 } from '@/features/sites/data';
import { href, type Locale } from '@/i18n/locales';
import { getLocale, getMessages, type Messages } from '@/i18n/messages';

type Props = PageProps<'/[lang]/sites/[siteId]/articles/ai/new'>;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).aiArticles.title };
}

/** Write an article with AI (ADR 0041), step 1: the idea. */
export default async function NewAiArticlePage({ params }: Props) {
  // params (and the session) only inside <Suspense>: the static shell prerenders without them.
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <PageShell fallback={<Skeleton className="h-[32rem] rounded-2xl" />}>
      <NewAiArticle t={t} locale={locale} params={params} />
    </PageShell>
  );
}

async function NewAiArticle({ t, locale, params }: { t: Messages; locale: Locale; params: Props['params'] }) {
  const { siteId } = await params;
  const list = href(locale, `/sites/${siteId}/articles`);
  const self = `${list}/ai/new`;
  await requireUser(locale, self);

  const site = await siteOr404(siteId);
  if (!site.ok) return <ApiFailure t={t} failure={site} />;
  const categories = await siteCategories(siteId);
  if (!categories.ok) return <ApiFailure t={t} failure={categories} />;
  const preferred = [locale, site.data.defaultLocale];
  const a = t.aiArticles;

  return (
    <div className="space-y-6">
      <BackLink href={list}>{a.back}</BackLink>
      <PageHeader eyebrow={site.data.name} title={a.title} subtitle={a.subtitle} />
      <Card>
        {categories.data.length === 0 ? (
          <p className="text-sm text-muted">{a.noTopics}</p>
        ) : (
          <IdeaForm
            siteId={siteId}
            base={`${list}/ai`}
            categories={categoryOptions(categories.data, preferred)}
            locales={site.data.locales}
            defaultLocale={site.data.defaultLocale}
            labels={{ t: a, common: t.common, validation: t.validation }}
          />
        )}
      </Card>
    </div>
  );
}
