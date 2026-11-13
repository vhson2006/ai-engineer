import type { Metadata } from 'next';
import { Skeleton } from '@web/ui/skeleton';
import { PageShell } from '@/components/page';
import { ArticleEditorPage } from '@/features/articles/editor-page';
import { getLocale, getMessages } from '@/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).articles.form.titleEdit };
}

export default async function EditArticlePage({ params }: PageProps<'/[lang]/sites/[siteId]/articles/[id]'>) {
  // params (and the session) only inside <Suspense>: the static shell prerenders without them.
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <PageShell fallback={<Skeleton className="h-[40rem] rounded-2xl" />}>
      <ArticleEditorPage t={t} locale={locale} params={params} />
    </PageShell>
  );
}
