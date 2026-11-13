'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { newSubmissionId } from '@web/core/actions/submission-id';
import type { Article, Media, MediaImage, TranslationJob } from '@web/core/api';
import { format } from '@web/core/i18n/format';
import { Card, cn, removedOnSave } from '@web/ui';
import { Button } from '@web/ui/button';
import { Checkbox } from '@web/ui/checkbox';
import { applyActionErrors, Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@web/ui/form';
import { Input, Textarea } from '@web/ui/input';
import { RichTextEditor } from '@web/ui/rich-text-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@web/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@web/ui/tabs';
import { toast, toastFailure } from '@web/ui/toaster';
import { LoaderCircleIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startTransition, useActionState, useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { Messages } from '@/i18n/dictionaries';
import { useMediaPicker } from '../media/media-picker';
import { useVideoPicker, type StudioClip } from '../studio/video-picker';
import { createArticleAction, updateArticleAction } from './actions';
import { ArticlePublishing } from './article-publishing';
import { CoverField } from './cover-field';
import { articleSchema, isStarted, type ArticleValues } from './schema';
import { slugify } from './slug';
import { TranslatePanel } from './translate-panel';

export interface ArticleEditorProps {
  site: { id: string; name: string; locales: string[]; defaultLocale: string };
  categories: { id: string; name: string }[];
  /** Absent: a new article. */
  article?: Article;
  t: Messages['articles'];
  common: Messages['common'];
  /** The site's media library, first page (newest first): the picker of covers and body images. */
  media: Media[];
  mediaLabels: Messages['media'];
  /** The site's finished studio clips (ADR 0039): "insert a video"; empty: the item is hidden. */
  clips: StudioClip[];
  /** The article's latest machine-translation jobs, newest first (ADR 0036). */
  translationJobs?: TranslationJob[];
  validation: Record<string, string>;
  listHref: string;
  categoriesHref: string;
  /** `{id}` is replaced by the new article's id after a create. */
  editHrefTemplate: string;
  intlLocale: string;
}

function initialValues(site: ArticleEditorProps['site'], article?: Article): ArticleValues {
  return {
    submissionId: article ? undefined : newSubmissionId(),
    categoryId: article?.categoryId ?? '',
    featured: article?.featured ?? false,
    coverMediaId: article?.cover?.id ?? null,
    // One entry per language of the site, in the site's order; missing ones empty.
    translations: site.locales.map((locale) => {
      const t = article?.translations.find((tr) => tr.locale === locale);
      return {
        locale,
        title: t?.title ?? '',
        slug: t?.slug ?? '',
        excerpt: t?.excerpt ?? '',
        body: t?.body ?? '',
        coverAlt: t?.coverAlt ?? '',
        seoTitle: t?.seoTitle ?? '',
        seoDescription: t?.seoDescription ?? '',
      };
    }),
  };
}

/**
 * Create / edit an article: one tab per language of the site, the rich text body (HTML, sanitized
 * by the API, ADR 0031), topic and "featured" on the side, and, once saved, publishing.
 */
export function ArticleEditor({
  site,
  categories,
  article,
  t,
  common,
  media,
  mediaLabels,
  clips,
  translationJobs = [],
  validation,
  listHref,
  categoriesHref,
  editHrefTemplate,
  intlLocale,
}: ArticleEditorProps) {
  const router = useRouter();
  const f = t.form;
  const form = useForm<ArticleValues>({ resolver: zodResolver(articleSchema), defaultValues: initialValues(site, article) });
  const [tab, setTab] = useState(site.locales[0]);
  // The slug follows the title until the author edits it (or it already existed).
  const [slugEdited, setSlugEdited] = useState<boolean[]>(() =>
    site.locales.map((locale) => Boolean(article?.translations.some((tr) => tr.locale === locale))),
  );
  const translations = useWatch({ control: form.control, name: 'translations' });
  // The library dialog: the cover and the editor's image cards pick (or upload) images there.
  const picker = useMediaPicker({ siteId: site.id, initial: media, labels: mediaLabels, closeLabel: common.close });
  const videoPicker = useVideoPicker({ clips, labels: t.editor.videoPicker, closeLabel: common.close });
  const [cover, setCover] = useState<MediaImage | null>(article?.cover ?? null);
  const { isDirty } = form.formState;

  // Leaving with unsaved changes: the browser's own confirmation.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const [, submit, pending] = useActionState(async (_previous: unknown, values: ArticleValues) => {
    const result = article ? await updateArticleAction(site.id, article.id, values) : await createArticleAction(site.id, values);
    if (result.ok) {
      // The bodies as the API stored them (sanitized) become the new baseline: the editor shows
      // what the sites will render, and the author learns what was removed.
      const stored = new Map(result.data.bodies.map((b) => [b.locale, b.body]));
      const removed = [
        ...new Set(values.translations.flatMap((tr) => (stored.has(tr.locale) ? removedOnSave(tr.body, stored.get(tr.locale) ?? '') : []))),
      ].map((key) => key.replace(/^(tag|class):/, ''));
      if (removed.length) toast.warning(format(f.sanitized, { items: removed.join(', ') }));
      else toast.success(article ? f.saved : f.created);
      form.reset({ ...values, translations: values.translations.map((tr) => ({ ...tr, body: stored.get(tr.locale) ?? tr.body })) });
      if (!article) router.push(editHrefTemplate.replace('{id}', result.data.id));
    } else {
      const unmatched = applyActionErrors(form, result.errors);
      const firstTab = result.errors?.map((e) => /^translations\.(\d+)\./.exec(e.field)?.[1]).find((i) => i !== undefined);
      if (firstTab !== undefined) setTab(site.locales[Number(firstTab)]);
      if (!result.errors?.length || unmatched.length) toastFailure(result, common.requestId);
    }
    return result;
  }, null);

  const translate = (key: string) => validation[key] ?? key;
  const errors = form.formState.errors.translations;

  const complete = (i: number) => {
    const v = translations?.[i];
    return Boolean(v && isStarted(v) && v.title.trim() && v.excerpt.trim() && v.slug.trim());
  };

  return (
    <Form
      form={form}
      translate={translate}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
      onSubmit={(values) => startTransition(() => submit(values))}
      // Refused in the browser: show the first language with an error (the others are hidden tabs).
      onInvalidSubmit={(invalid) => {
        const index = site.locales.findIndex((_, i) => Boolean(invalid.translations?.[i]));
        if (index >= 0) setTab(site.locales[index]);
        // Never refuse silently: the field may be on another tab or in the side panel.
        toast.error(f.checkFields);
      }}
    >
      <Card className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">{f.languages}</h2>
          <p className="text-xs text-subtle">{format(f.languagesHint, { locales: site.locales.join(', ') })}</p>
        </div>
        {errors?.root?.message || errors?.message ? (
          <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
            {translate(String(errors?.root?.message ?? errors?.message))}
          </p>
        ) : null}

        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList aria-label={f.languages}>
            {site.locales.map((locale, i) => {
              const hasError = Boolean(errors?.[i]);
              return (
                <TabsTrigger key={locale} value={locale} className="uppercase">
                  {locale}
                  <span
                    aria-hidden
                    className={cn('size-1.5 rounded-full', hasError ? 'bg-red-500' : complete(i) ? 'bg-emerald-500' : 'bg-amber-400')}
                  />
                  <span className="sr-only">{hasError ? translate('invalid') : complete(i) ? f.complete : f.missing}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {site.locales.map((locale, i) => (
            <TabsContent key={locale} value={locale} forceMount className="grid gap-5 data-[state=inactive]:hidden" lang={locale}>
              {/* Machine translation from the site's main language into this one (ADR 0036). */}
              {article && locale !== site.defaultLocale && (
                <TranslatePanel
                  siteId={site.id}
                  articleId={article.id}
                  sourceLocale={site.defaultLocale}
                  targetLocale={locale}
                  hasTarget={article.translations.some((tr) => tr.locale === locale)}
                  latest={translationJobs.find((job) => job.targetLocale === locale)}
                  blockedReason={
                    article.status !== 'draft'
                      ? t.translate.draftOnly
                      : isDirty
                        ? t.translate.saveFirst
                        : !article.translations.some((tr) => tr.locale === site.defaultLocale)
                          ? format(t.translate.noSource, { source: site.defaultLocale.toUpperCase() })
                          : undefined
                  }
                  labels={t.translate}
                />
              )}
              <FormField
                control={form.control}
                name={`translations.${i}.title`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{f.title}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={f.titlePlaceholder}
                        maxLength={200}
                        autoComplete="off"
                        {...field}
                        onChange={(event) => {
                          field.onChange(event);
                          if (!slugEdited[i]) form.setValue(`translations.${i}.slug`, slugify(event.target.value), { shouldDirty: true });
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
                    <FormLabel>{f.slug}</FormLabel>
                    <FormControl>
                      <Input
                        maxLength={150}
                        autoComplete="off"
                        spellCheck={false}
                        className="font-mono text-sm"
                        {...field}
                        onChange={(event) => {
                          field.onChange(event);
                          setSlugEdited((previous) => previous.map((value, j) => (j === i ? event.target.value !== '' : value)));
                        }}
                      />
                    </FormControl>
                    <FormDescription>{f.slugHint}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`translations.${i}.excerpt`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{f.excerpt}</FormLabel>
                    <FormControl>
                      <Textarea rows={2} maxLength={500} {...field} />
                    </FormControl>
                    <FormDescription>{f.excerptHint}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`translations.${i}.body`}
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>{f.body}</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={f.bodyPlaceholder}
                        labels={t.editor}
                        // Layout blocks of the templates (ADR 0033): kept and editable in the visual
                        // mode, and the HTML source mode for anything else.
                        layout={{ labels: t.editor.layout, pickImage: picker.pick, pickVideo: clips.length ? videoPicker.pick : undefined }}
                        source={{ labels: t.editor.source }}
                        aria-invalid={Boolean(fieldState.error)}
                        className="min-h-72"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`translations.${i}.coverAlt`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{f.coverAlt}</FormLabel>
                    <FormControl>
                      <Input maxLength={300} autoComplete="off" {...field} />
                    </FormControl>
                    <FormDescription>{f.coverAltHint}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <details className="group rounded-lg border border-border p-4 open:pb-5">
                <summary className="cursor-pointer text-sm font-medium">{f.seo}</summary>
                <div className="mt-4 grid gap-5">
                  <FormField
                    control={form.control}
                    name={`translations.${i}.seoTitle`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{f.seoTitle}</FormLabel>
                        <FormControl>
                          <Input maxLength={200} autoComplete="off" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`translations.${i}.seoDescription`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{f.seoDescription}</FormLabel>
                        <FormControl>
                          <Textarea rows={2} maxLength={300} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </details>
            </TabsContent>
          ))}
        </Tabs>
      </Card>

      <div className="grid gap-6 lg:sticky lg:top-24">
        <Card className="grid gap-5">
          <h2 className="font-semibold">{f.settings}</h2>
          {categories.length === 0 ? (
            <div className="text-sm text-muted">
              <p>{f.noCategories}</p>
              <Link href={categoriesHref} className="mt-2 inline-block font-medium text-brand hover:underline">
                {f.createCategory}
              </Link>
            </div>
          ) : (
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{f.category}</FormLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger onBlur={field.onBlur}>
                        <SelectValue placeholder={f.categoryPlaceholder} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="featured"
            render={({ field }) => (
              <FormItem className="flex items-start gap-3">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} className="mt-0.5" />
                </FormControl>
                <div>
                  <FormLabel>{f.featured}</FormLabel>
                  <FormDescription>{f.featuredHint}</FormDescription>
                </div>
              </FormItem>
            )}
          />
          <div className="grid gap-2">
            <p className="text-sm font-medium">{f.cover.label}</p>
            <CoverField
              cover={cover}
              onChange={(next) => {
                setCover(next);
                form.setValue('coverMediaId', next?.id ?? null, { shouldDirty: true });
              }}
              pick={picker.pick}
              labels={f.cover}
              disabled={pending}
            />
          </div>
          {article?.status === 'published' && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">{f.liveWarning}</p>
          )}
          {article?.status === 'scheduled' && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              {f.scheduledWarning}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending || categories.length === 0 || (article && !isDirty)}>
              {pending && <LoaderCircleIcon className="animate-spin" />}
              {article ? (pending ? f.saving : f.save) : pending ? f.creating : f.create}
            </Button>
            <Button asChild variant="ghost">
              <Link href={listHref}>{f.backToList}</Link>
            </Button>
          </div>
        </Card>

        {article && (
          <ArticlePublishing
            siteId={site.id}
            article={article}
            dirty={isDirty}
            t={t}
            common={common}
            validation={validation}
            listHref={listHref}
            intlLocale={intlLocale}
          />
        )}
      </div>
      {picker.dialog}
      {videoPicker.dialog}
    </Form>
  );
}
