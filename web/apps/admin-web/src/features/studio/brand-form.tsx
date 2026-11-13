'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Media, StudioBrandKit } from '@web/core/api';
import { Button } from '@web/ui/button';
import { applyActionErrors, Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@web/ui/form';
import { Input, Textarea } from '@web/ui/input';
import { toast } from '@web/ui/toaster';
import { ImageIcon, LoaderCircleIcon } from 'lucide-react';
import { startTransition, useActionState } from 'react';
import { useForm, useWatch, type FieldPath } from 'react-hook-form';
import type { Messages } from '@/i18n/dictionaries';
import { useMediaPicker } from '../media/media-picker';
import { saveStudioBrandAction } from './actions';
import { brandSchema, type BrandValues } from './schema';

type Labels = { t: Messages['studio']; common: Messages['common']; validation: Record<string, string>; media: Messages['media'] };

/** The site's brand kit (ADR 0039): the last card of every video, colours, tone, banned phrases. */
export function BrandForm({ siteId, brand, media, labels }: { siteId: string; brand: StudioBrandKit; media: Media[]; labels: Labels }) {
  const { t, common, validation } = labels;
  const form = useForm<BrandValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      brandName: brand.brandName,
      tagline: brand.tagline ?? '',
      phone: brand.phone ?? '',
      callToAction: brand.callToAction ?? '',
      tone: brand.tone ?? '',
      footerNote: brand.footerNote ?? '',
      bannedPhrases: brand.bannedPhrases.join('\n'),
      primaryColor: brand.primaryColor,
      accentColor: brand.accentColor,
      logoMediaId: brand.logo?.id ?? '',
    },
  });
  const picker = useMediaPicker({ siteId, initial: media, labels: labels.media, closeLabel: common.close });
  const logoId = useWatch({ control: form.control, name: 'logoMediaId' });
  const logo = media.find((m) => m.id === logoId) ?? (brand.logo?.id === logoId ? brand.logo : undefined);

  const [, submit, pending] = useActionState(async (_previous: unknown, values: BrandValues) => {
    const result = await saveStudioBrandAction(siteId, values);
    if (result.ok) {
      toast.success(t.brand.saved);
      form.reset(values);
    } else {
      const unmatched = applyActionErrors(form, result.errors);
      if (!result.errors?.length || unmatched.length) {
        toast.error(result.message, { description: result.requestId ? `${common.requestId}: ${result.requestId}` : undefined });
      }
    }
    return result;
  }, null);

  const text = (name: FieldPath<BrandValues>, label: string, max: number, hint?: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input maxLength={max} {...field} />
          </FormControl>
          {hint && <FormDescription>{hint}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const color = (name: 'primaryColor' | 'accentColor', label: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="flex items-center gap-3">
            <input
              type="color"
              aria-label={label}
              value={/^#[0-9a-fA-F]{6}$/.test(field.value) ? field.value : '#000000'}
              onChange={(event) => field.onChange(event.target.value)}
              className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-bg"
            />
            <FormControl>
              <Input maxLength={7} className="font-mono" {...field} />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form form={form} translate={(key) => validation[key] ?? key} onSubmit={(values) => startTransition(() => submit(values))}>
      <fieldset disabled={pending} className="grid gap-6 md:grid-cols-2">
        {text('brandName', t.brand.brandName, 100)}
        {text('tagline', t.brand.tagline, 200)}
        {text('phone', t.brand.phone, 40)}
        {text('callToAction', t.brand.callToAction, 200)}
        {text('tone', t.brand.tone, 300, t.brand.toneHint)}
        {text('footerNote', t.brand.footerNote, 200, t.brand.footerNoteHint)}
        {color('primaryColor', t.brand.primaryColor)}
        {color('accentColor', t.brand.accentColor)}
        <FormField
          control={form.control}
          name="bannedPhrases"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>{t.brand.bannedPhrases}</FormLabel>
              <FormControl>
                <Textarea rows={4} maxLength={5000} {...field} />
              </FormControl>
              <FormDescription>{t.brand.bannedHint}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="logoMediaId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.brand.logo}</FormLabel>
              <div className="flex items-center gap-4">
                <div className="flex size-20 items-center justify-center overflow-hidden rounded-xl bg-surface-2">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo.url} srcSet={logo.srcset} sizes="80px" alt="" className="size-full object-contain" />
                  ) : (
                    <ImageIcon aria-hidden className="size-8 text-subtle" />
                  )}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={async () => {
                    const picked = await picker.pick();
                    if (picked) field.onChange(picked.id);
                  }}
                >
                  {field.value ? t.change : t.pick}
                </Button>
                {field.value && (
                  <Button type="button" variant="ghost" onClick={() => field.onChange('')}>
                    {t.remove}
                  </Button>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-2">
          <Button type="submit">
            {pending && <LoaderCircleIcon className="animate-spin" />}
            {common.save}
          </Button>
        </div>
      </fieldset>
      {picker.dialog}
    </Form>
  );
}
