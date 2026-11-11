import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container } from '@web/ui';
import { Skeleton } from '@web/ui/skeleton';
import { ArticleEditorPage } from '@/features/articles/editor-page';
import { getLocale, getMessages } from '@/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).articles.form.titleNew };
}

export default async function NewArticlePage({ params }: PageProps<'/[lang]/sites/[siteId]/articles/new'>) {
  // params (and the session) only inside <Suspense>: the static shell prerenders without them.
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <Container className="py-10 sm:py-14">
      <Suspense fallback={<Skeleton className="h-[40rem] rounded-2xl" />}>
        <ArticleEditorPage t={t} locale={locale} params={params} />
      </Suspense>
    </Container>
  );
}
