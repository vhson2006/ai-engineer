'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { newSubmissionId } from '@web/core/actions/submission-id';
import type { Category } from '@web/core/api';
import { format } from '@web/core/i18n/format';
import { Button } from '@web/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@web/ui/dialog';
import { applyActionErrors, Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@web/ui/form';
import { Input } from '@web/ui/input';
import { toast, toastFailure } from '@web/ui/toaster';
import { LoaderCircleIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { startTransition, useActionState, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import type { Messages } from '@/i18n/dictionaries';
import { slugify } from '../articles/slug';
import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from './actions';
import { categorySchema, type CategoryValues } from './schema';

type Labels = { t: Messages['categories']; common: Messages['common']; validation: Record<string, string> };

const valuesOf = (locales: string[], category?: Category): CategoryValues => ({
  submissionId: category ? undefined : newSubmissionId(),
  key: category?.key ?? '',
  position: category?.position ?? 0,
  translations: locales.map((locale) => {
    const t = category?.translations.find((tr) => tr.locale === locale);
    return { locale, name: t?.name ?? '', slug: t?.slug ?? '' };
  }),
});

/** Create (no `category`) or edit a topic: a name + URL per language of the site. */
export function CategoryDialog({ siteId, locales, category, labels }: { siteId: string; locales: string[]; category?: Category; labels: Labels }) {
  const { t, common, validation } = labels;
  const [open, setOpen] = useState(false);
  const form = useForm<CategoryValues>({ resolver: zodResolver(categorySchema), defaultValues: valuesOf(locales, category) });

  const [, submit, pending] = useActionState(async (_previous: unknown, values: CategoryValues) => {
    const result = category ? await updateCategoryAction(siteId, category.id, values) : await createCategoryAction(siteId, values);
    if (result.ok) {
      toast.success(category ? t.saved : format(t.created, { name: values.translations[0]?.name ?? values.key }));
      setOpen(false);
      form.reset(category ? values : valuesOf(locales));
    } else {
      const unmatched = applyActionErrors(form, result.errors);
      if (!result.errors?.length || unmatched.length) {
        toastFailure(result, common.requestId);
      }
    }
    return result;
  }, null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (!next) form.reset(valuesOf(locales, category));
      }}
    >
      <DialogTrigger asChild>
        {category ? (
          <Button variant="ghost" size="sm" aria-label={`${common.edit} ${category.key}`}>
            <PencilIcon />
          </Button>
        ) : (
          <Button>
            <PlusIcon />
            {t.new}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent closeLabel={common.close}>
        <DialogHeader>
          <DialogTitle>{category ? t.editTitle : t.createTitle}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>
        <Form
          form={form}
          translate={(key) => validation[key] ?? key}
          onSubmit={(values) => startTransition(() => submit(values))}
          onInvalidSubmit={() => toast.error(t.checkFields)}
        >
          <div className="grid gap-5 sm:grid-cols-[1fr_7rem]">
            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.key}</FormLabel>
                  <FormControl>
                    <Input maxLength={50} autoComplete="off" spellCheck={false} className="font-mono" {...field} />
                  </FormControl>
                  <FormDescription>{t.keyHint}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.position}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={1000}
                      inputMode="numeric"
                      {...field}
                      value={Number.isFinite(field.value) ? field.value : ''}
                      onChange={(event) => field.onChange(event.target.value === '' ? Number.NaN : Number(event.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {locales.map((locale, i) => (
            <div key={locale} className="grid gap-5 sm:grid-cols-2" lang={locale}>
              <FormField
                control={form.control}
                name={`translations.${i}.name`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{format(t.name, { locale: locale.toUpperCase() })}</FormLabel>
                    <FormControl>
                      <Input
                        maxLength={80}
                        autoComplete="off"
                        {...field}
                        onChange={(event) => {
                          field.onChange(event);
                          const slug = form.getValues(`translations.${i}.slug`);
                          const previous = slugify(field.value ?? '', 100);
                          if (!slug || slug === previous) form.setValue(`translations.${i}.slug`, slugify(event.target.value, 100));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`translations.${i}.slug`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{format(t.slug, { locale: locale.toUpperCase() })}</FormLabel>
                    <FormControl>
                      <Input maxLength={100} autoComplete="off" spellCheck={false} className="font-mono text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ))}
          <DialogFooter className="pt-1">
            <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
              {common.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <LoaderCircleIcon className="animate-spin" />}
              {category ? (pending ? common.saving : common.save) : pending ? t.creating : t.create}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/** Delete with a confirmation; a topic still used by articles is refused by the API (422). */
export function DeleteCategoryButton({ siteId, category, name, labels }: { siteId: string; category: Category; name: string; labels: Labels }) {
  const { t, common } = labels;
  const [open, setOpen] = useState(false);
  const [pending, startDelete] = useTransition();

  const remove = () =>
    startDelete(async () => {
      const result = await deleteCategoryAction(siteId, category.id);
      if (result.ok) {
        toast.success(t.deleted);
        setOpen(false);
      } else {
        toastFailure(result, common.requestId, result.code === 'foreign_key_violation' ? t.inUse : result.message);
      }
    });

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`${common.delete} ${category.key}`} className="text-red-600 dark:text-red-400">
          <Trash2Icon />
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={common.close}>
        <DialogHeader>
          <DialogTitle>{format(t.deleteTitle, { name })}</DialogTitle>
          <DialogDescription>{t.deleteDescription}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
            {common.cancel}
          </Button>
          <Button disabled={pending} onClick={remove} className="bg-red-600 text-white hover:bg-red-700">
            {pending && <LoaderCircleIcon className="animate-spin" />}
            {pending ? common.deleting : common.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
