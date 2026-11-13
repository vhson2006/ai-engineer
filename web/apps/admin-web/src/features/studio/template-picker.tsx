'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { newSubmissionId } from '@web/core/actions/submission-id';
import type { StudioTemplate } from '@web/core/api';
import { format } from '@web/core/i18n/format';
import { Button } from '@web/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@web/ui/dialog';
import { applyActionErrors, Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@web/ui/form';
import { Input } from '@web/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@web/ui/select';
import { toast } from '@web/ui/toaster';
import { ClapperboardIcon, LoaderCircleIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { startTransition, useActionState, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Messages } from '@/i18n/dictionaries';
import { createStudioProjectAction } from './actions';
import { newProjectSchema, type NewProjectValues } from './schema';

type Labels = { t: Messages['studio']; common: Messages['common']; validation: Record<string, string> };

/** The script templates as cards; one opens the "new video" dialog (title + language). */
export function TemplatePicker({
  siteId,
  base,
  templates,
  locales,
  uiLocale,
  labels,
}: {
  siteId: string;
  base: string;
  templates: StudioTemplate[];
  locales: string[];
  uiLocale: 'vi' | 'en';
  labels: Labels;
}) {
  const { t, common, validation } = labels;
  const router = useRouter();
  const [template, setTemplate] = useState<StudioTemplate | null>(null);
  const defaults = (templateId = ''): NewProjectValues => ({
    submissionId: newSubmissionId(),
    templateId,
    title: '',
    language: locales[0] ?? 'vi',
  });
  const form = useForm<NewProjectValues>({ resolver: zodResolver(newProjectSchema), defaultValues: defaults() });

  const [, submit, pending] = useActionState(async (_previous: unknown, values: NewProjectValues) => {
    const result = await createStudioProjectAction(siteId, values);
    if (result.ok) {
      setTemplate(null);
      router.push(`${base}/${result.data.id}`);
    } else {
      const unmatched = applyActionErrors(form, result.errors);
      if (!result.errors?.length || unmatched.length) {
        toast.error(result.message, { description: result.requestId ? `${common.requestId}: ${result.requestId}` : undefined });
      }
    }
    return result;
  }, null);

  return (
    <section aria-labelledby="templates-title" className="space-y-4">
      <h2 id="templates-title" className="text-lg font-semibold">
        {t.templatesTitle}
      </h2>
      <ul className="grid gap-4 md:grid-cols-3">
        {templates.map((tpl) => (
          <li key={tpl.id} className="flex flex-col rounded-2xl border border-border bg-surface p-5">
            <ClapperboardIcon aria-hidden className="size-6 text-brand" />
            <h3 className="mt-3 font-semibold">{tpl.name[uiLocale]}</h3>
            <p className="mt-1 flex-1 text-sm text-muted">{tpl.description[uiLocale]}</p>
            <p className="mt-3 text-xs text-subtle">
              {format(t.seconds, { min: tpl.seconds[0], max: tpl.seconds[1] })} ·{' '}
              {format(t.slots, { images: tpl.images.length, avatars: tpl.avatars.length })}
            </p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => {
                form.reset(defaults(tpl.id));
                setTemplate(tpl);
              }}
            >
              {t.useTemplate}
            </Button>
          </li>
        ))}
      </ul>

      <Dialog open={template !== null} onOpenChange={(open) => !open && !pending && setTemplate(null)}>
        <DialogContent closeLabel={common.close}>
          <DialogHeader>
            <DialogTitle>{template?.name[uiLocale] ?? t.newVideo}</DialogTitle>
            <DialogDescription>{template?.description[uiLocale]}</DialogDescription>
          </DialogHeader>
          <Form
            form={form}
            translate={(key) => validation[key] ?? key}
            onSubmit={(values) => startTransition(() => submit(values))}
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.newTitle}</FormLabel>
                  <FormControl>
                    <Input maxLength={120} autoComplete="off" {...field} />
                  </FormControl>
                  <FormDescription>{t.newTitleHint}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {locales.length > 1 && (
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.language}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locales.map((locale) => (
                          <SelectItem key={locale} value={locale}>
                            {locale.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <LoaderCircleIcon className="animate-spin" />}
                {t.create}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
