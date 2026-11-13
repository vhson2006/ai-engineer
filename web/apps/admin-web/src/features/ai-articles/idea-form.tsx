'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { newSubmissionId } from '@web/core/actions/submission-id';
import { ARTICLE_LENGTHS, ARTICLE_MAX_IMAGES } from '@web/core/api/ai-article-limits';
import { Button } from '@web/ui/button';
import { applyActionErrors, Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@web/ui/form';
import { Input, Textarea } from '@web/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@web/ui/select';
import { toastFailure } from '@web/ui/toaster';
import { LoaderCircleIcon, SparklesIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { startTransition, useActionState } from 'react';
import { useForm } from 'react-hook-form';
import type { Messages } from '@/i18n/dictionaries';
import { startAiArticleAction } from './actions';
import { newAiArticleSchema, type NewAiArticleValues } from './schema';

type Labels = { t: Messages['aiArticles']; common: Messages['common']; validation: Record<string, string> };

/** Step 1: the idea. The AI answers with a brief and an outline (the job's page). */
export function IdeaForm({
  siteId,
  base,
  categories,
  locales,
  defaultLocale,
  labels,
}: {
  siteId: string;
  base: string;
  categories: { id: string; name: string }[];
  locales: string[];
  defaultLocale: string;
  labels: Labels;
}) {
  const { t, common, validation } = labels;
  const router = useRouter();
  const form = useForm<NewAiArticleValues>({
    resolver: zodResolver(newAiArticleSchema),
    defaultValues: {
      submissionId: newSubmissionId(),
      categoryId: categories[0]?.id ?? '',
      locale: defaultLocale,
      idea: '',
      audience: '',
      keyword: '',
      length: 'medium',
      images: 1,
    },
  });

  const [, submit, pending] = useActionState(async (_previous: unknown, values: NewAiArticleValues) => {
    const result = await startAiArticleAction(siteId, values);
    if (result.ok) router.push(`${base}/${result.data.id}`);
    else {
      const unmatched = applyActionErrors(form, result.errors);
      if (!result.errors?.length || unmatched.length) {
        toastFailure(result, common.requestId);
      }
    }
    return result;
  }, null);

  const select = (name: 'categoryId' | 'locale' | 'length', label: string, options: { value: string; label: string }[], hint?: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hint && <FormDescription>{hint}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form form={form} translate={(key) => validation[key] ?? key} onSubmit={(values) => startTransition(() => submit(values))}>
      <fieldset disabled={pending} className="grid gap-6 md:grid-cols-2">
        {select(
          'categoryId',
          t.topic,
          categories.map((c) => ({ value: c.id, label: c.name })),
        )}
        {select(
          'locale',
          t.language,
          locales.map((l) => ({ value: l, label: l.toUpperCase() })),
          t.languageHint,
        )}
        <FormField
          control={form.control}
          name="idea"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>{t.idea}</FormLabel>
              <FormControl>
                <Textarea rows={3} maxLength={500} {...field} />
              </FormControl>
              <FormDescription>{t.ideaHint}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="audience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.audience}</FormLabel>
              <FormControl>
                <Input maxLength={200} {...field} />
              </FormControl>
              <FormDescription>{t.audienceHint}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="keyword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.keyword}</FormLabel>
              <FormControl>
                <Input maxLength={80} {...field} />
              </FormControl>
              <FormDescription>{t.keywordHint}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {select(
          'length',
          t.length,
          ARTICLE_LENGTHS.map((l) => ({ value: l, label: t.lengths[l] })),
        )}
        <FormField
          control={form.control}
          name="images"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.images}</FormLabel>
              <Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Array.from({ length: ARTICLE_MAX_IMAGES + 1 }, (_, n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>{t.imagesHint}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-2">
          <Button type="submit">
            {pending ? <LoaderCircleIcon className="animate-spin" /> : <SparklesIcon />}
            {t.start}
          </Button>
        </div>
      </fieldset>
    </Form>
  );
}
