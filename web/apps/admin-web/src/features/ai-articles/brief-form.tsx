'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ARTICLE_PROMPT_MAX_LENGTH } from '@web/core/api/ai-article-limits';
import { Button } from '@web/ui/button';
import { applyActionErrors, Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@web/ui/form';
import { Textarea } from '@web/ui/input';
import { toast, toastFailure } from '@web/ui/toaster';
import { LoaderCircleIcon, PenLineIcon } from 'lucide-react';
import { startTransition, useActionState } from 'react';
import { useForm } from 'react-hook-form';
import type { Messages } from '@/i18n/dictionaries';
import { writeAiArticleAction } from './actions';
import { briefSchema, type BriefOutput, type BriefValues } from './schema';

type Labels = { t: Messages['aiArticles']; common: Messages['common']; validation: Record<string, string> };

/** Step 2: the brief and the outline the AI suggested, edited by the admin, then confirmed. */
export function BriefForm({
  siteId,
  jobId,
  prompt,
  outline,
  labels,
}: {
  siteId: string;
  jobId: string;
  prompt: string;
  outline: string[];
  labels: Labels;
}) {
  const { t, common, validation } = labels;
  const form = useForm<BriefValues, unknown, BriefOutput>({
    resolver: zodResolver(briefSchema),
    defaultValues: { prompt, outline: outline.join('\n') },
  });

  // The form gives the parsed values (outline as lines); the action parses the text again.
  const [, submit, pending] = useActionState(async (_previous: unknown, values: BriefOutput) => {
    const result = await writeAiArticleAction(siteId, jobId, { prompt: values.prompt, outline: values.outline.join('\n') });
    if (result.ok) toast.success(t.writeStarted);
    else {
      const unmatched = applyActionErrors(form, result.errors);
      if (!result.errors?.length || unmatched.length) {
        toastFailure(result, common.requestId);
      }
    }
    return result;
  }, null);

  return (
    <Form form={form} translate={(key) => validation[key] ?? key} onSubmit={(values) => startTransition(() => submit(values))}>
      <fieldset disabled={pending} className="space-y-6">
        <FormField
          control={form.control}
          name="prompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.prompt}</FormLabel>
              <FormControl>
                <Textarea rows={14} maxLength={ARTICLE_PROMPT_MAX_LENGTH} {...field} />
              </FormControl>
              <FormDescription>{t.promptHint}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="outline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.outline}</FormLabel>
              <FormControl>
                <Textarea rows={8} {...field} />
              </FormControl>
              <FormDescription>{t.outlineHint}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">
          {pending ? <LoaderCircleIcon className="animate-spin" /> : <PenLineIcon />}
          {t.write}
        </Button>
      </fieldset>
    </Form>
  );
}
