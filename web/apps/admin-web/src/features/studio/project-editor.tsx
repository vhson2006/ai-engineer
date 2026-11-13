'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Media, StudioAvatar, StudioProject, StudioTemplate, StudioVoice } from '@web/core/api';
import { STUDIO_BUSY } from '@web/core/api/studio-status';
import { format } from '@web/core/i18n/format';
import { Card, cn } from '@web/ui';
import { Badge } from '@web/ui/badge';
import { Button } from '@web/ui/button';
import { Checkbox } from '@web/ui/checkbox';
import { applyActionErrors, Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@web/ui/form';
import { Input, Textarea } from '@web/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@web/ui/select';
import { toast } from '@web/ui/toaster';
import { AlertTriangleIcon, DownloadIcon, ImageIcon, LoaderCircleIcon, MicIcon, SparklesIcon, Trash2Icon, VideoIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startTransition, useActionState, useTransition, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { Messages } from '@/i18n/dictionaries';
import { useMediaPicker } from '../media/media-picker';
import { deleteStudioProjectAction, saveStudioInputsAction, saveStudioScriptAction, startStudioStepAction } from './actions';
import { StudioPreview } from './preview';
import { inputsSchema, scriptSchema, type InputsValues, type ScriptValues, type StudioStep } from './schema';

type Labels = {
  t: Messages['studio'];
  common: Messages['common'];
  validation: Record<string, string>;
  media: Messages['media'];
};

interface Props {
  siteId: string;
  base: string;
  project: StudioProject;
  template: StudioTemplate;
  voices: StudioVoice[];
  avatars: StudioAvatar[];
  media: Media[];
  articles: { id: string; title: string }[];
  uiLocale: 'vi' | 'en';
  labels: Labels;
}

/** Radix Select can't hold an empty value: "nothing chosen" / "the host's own voice". */
const NONE = '__none';

const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/**
 * The editor of one video (ADR 0039), in the order of the work: inputs → AI script (edit it) →
 * voices → preview (in the browser) → export. Every step that runs elsewhere (AI, voice, render)
 * is started by an action; the page polls (BusyPoller) until the project is idle again.
 */
export function ProjectEditor(props: Props) {
  const { project, labels } = props;
  const { t, common } = labels;
  const router = useRouter();
  const busy = STUDIO_BUSY.includes(project.status);
  const [stepping, startStep] = useTransition();
  // A silent video (optional narration, off): no voice step, rendered straight from the script.
  const narrated = props.template.narration === 'required' || project.inputs.narration === true;
  const canRender = Boolean(project.script) && (!narrated || Boolean(project.voice));

  const runStep = (step: StudioStep) =>
    startStep(async () => {
      const result = await startStudioStepAction(props.siteId, project.id, step);
      if (result.ok) toast.success(t.started);
      else toast.error(result.message, { description: result.requestId ? `${common.requestId}: ${result.requestId}` : undefined });
    });

  const [deleting, startDelete] = useTransition();
  const remove = () => {
    if (!window.confirm(t.confirmDelete)) return;
    startDelete(async () => {
      const result = await deleteStudioProjectAction(props.siteId, project.id);
      if (result.ok) {
        toast.success(t.deleted);
        router.push(props.base);
      } else toast.error(result.code === 'video_in_use' ? t.videoInUse : result.message);
    });
  };

  return (
    <div className="space-y-6">
      {busy && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:bg-sky-500/10 dark:text-sky-200"
        >
          <LoaderCircleIcon aria-hidden className="size-4 animate-spin" />
          {t.busy}
        </p>
      )}
      {project.error && !busy && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900 dark:bg-red-500/10 dark:text-red-200"
        >
          <AlertTriangleIcon aria-hidden className="size-4" />
          {format(t.failed, { code: project.error })}
        </p>
      )}

      {/* A fresh form after a step changed the inputs on the server (AI drafts, brand facts). */}
      <InputsSection key={project.updatedAt} {...props} disabled={busy} />

      <Step title={t.scriptTitle} hint={t.scriptHint}>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => runStep('script')} disabled={busy || stepping} variant={project.script ? 'secondary' : 'primary'}>
            {stepping ? <LoaderCircleIcon className="animate-spin" /> : <SparklesIcon />}
            {project.script ? t.rewrite : t.writeScript}
          </Button>
        </div>
        {project.script && <ScriptForm key={project.updatedAt} {...props} disabled={busy} />}
      </Step>

      {narrated && (
        <Step title={t.voiceTitle} hint={t.voiceHint}>
          <Button
            onClick={() => runStep('voice')}
            disabled={busy || stepping || !project.script}
            variant={project.voice ? 'secondary' : 'primary'}
          >
            <MicIcon />
            {project.voice ? t.rerecord : t.record}
          </Button>
          {!project.script && <p className="text-sm text-subtle">{t.needScript}</p>}
          {project.voice && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {project.voice.lines.map((line) => (
                <li key={line.id} className="rounded-xl border border-border p-3">
                  <p className="text-xs font-mono text-subtle">
                    {line.id} · {(line.durationMs / 1000).toFixed(1)} s
                  </p>
                  <audio controls preload="none" src={line.url} className="mt-2 w-full" />
                </li>
              ))}
            </ul>
          )}
        </Step>
      )}

      {project.preview && (
        <Step title={t.previewTitle} hint={t.previewHint}>
          <div className="mx-auto w-full max-w-xs">
            <StudioPreview props={project.preview} />
          </div>
          <p className="text-xs text-subtle">{t.aiNotice}</p>
        </Step>
      )}

      <Step title={t.renderTitle} hint={t.renderHint}>
        <Button
          onClick={() => runStep('render')}
          disabled={busy || stepping || !canRender}
          variant={project.video ? 'secondary' : 'primary'}
        >
          <VideoIcon />
          {project.video ? t.rerender : t.render}
        </Button>
        {!canRender && <p className="text-sm text-subtle">{project.script ? t.needVoice : t.needScript}</p>}
        {project.video && (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              {format(t.videoReady, {
                seconds: (project.video.durationMs / 1000).toFixed(1),
                size: (project.video.sizeBytes / 1024 / 1024).toFixed(1),
              })}
            </p>
            <video
              controls
              playsInline
              preload="metadata"
              poster={project.video.posterUrl ?? undefined}
              src={project.video.url}
              className="aspect-[9/16] w-full max-w-xs rounded-2xl bg-black"
            />
            <a href={project.video.url} download className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline">
              <DownloadIcon aria-hidden className="size-4" />
              {t.download}
            </a>
          </div>
        )}
      </Step>

      <div className="flex justify-end">
        <Button variant="ghost" onClick={remove} disabled={busy || deleting} className="text-red-700 hover:text-red-800 dark:text-red-300">
          {deleting ? <LoaderCircleIcon className="animate-spin" /> : <Trash2Icon />}
          {t.deleteProject}
        </Button>
      </div>
    </div>
  );
}

function Step({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{hint}</p>
      <div className="mt-4 space-y-4">{children}</div>
    </Card>
  );
}

/* ─────────────────────────────── 1. Inputs ─────────────────────────────── */

function InputsSection({
  siteId,
  base,
  project,
  template,
  voices,
  avatars,
  media,
  articles,
  uiLocale,
  labels,
  disabled,
}: Props & { disabled: boolean }) {
  const { t, common, validation } = labels;
  const fill = (ids: string[], values: Record<string, string>) => Object.fromEntries(ids.map((id) => [id, values[id] ?? '']));
  const defaults: InputsValues = {
    title: project.title,
    brief: project.brief ?? '',
    images: fill(
      template.images.map((s) => s.id),
      project.inputs.images,
    ),
    avatars: fill(
      template.avatars.map((s) => s.id),
      project.inputs.avatars,
    ),
    voices: fill(
      template.speakers.map((s) => s.id),
      project.inputs.voices,
    ),
    facts: fill(
      template.facts.map((s) => s.id),
      project.inputs.facts,
    ),
    narration: template.narration === 'required' || project.inputs.narration === true,
  };
  const form = useForm<InputsValues>({ resolver: zodResolver(inputsSchema), defaultValues: defaults });
  const picker = useMediaPicker({ siteId, initial: media, labels: labels.media, closeLabel: common.close });

  const [, submit, pending] = useActionState(async (_previous: unknown, values: InputsValues) => {
    const result = await saveStudioInputsAction(siteId, project.id, values);
    if (result.ok) {
      toast.success(t.inputsSaved);
      form.reset(values);
    } else {
      const unmatched = applyActionErrors(form, result.errors);
      if (!result.errors?.length || unmatched.length) {
        toast.error(result.message, { description: result.requestId ? `${common.requestId}: ${result.requestId}` : undefined });
      }
    }
    return result;
  }, null);

  const thumb = (mediaId: string) => media.find((m) => m.id === mediaId);
  const drafts = new Set(project.inputs.suggested ?? []);
  const canSuggest = template.facts.some((slot) => slot.suggest || slot.fromBrand);
  const { isDirty } = form.formState;
  const [suggesting, startSuggest] = useTransition();
  const suggest = () =>
    startSuggest(async () => {
      const result = await startStudioStepAction(siteId, project.id, 'suggest');
      if (result.ok) toast.success(t.suggestStarted);
      else toast.error(result.message, { description: result.requestId ? `${common.requestId}: ${result.requestId}` : undefined });
    });
  const narration = useWatch({ control: form.control, name: 'narration' });
  const avatarSpeakers = new Set(template.speakers.filter((s) => s.avatar).map((s) => s.id));

  return (
    <Step title={t.inputsTitle} hint={t.inputsHint}>
      <Form form={form} translate={(key) => validation[key] ?? key} onSubmit={(values) => startTransition(() => submit(values))}>
        <fieldset disabled={disabled || pending} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.newTitle}</FormLabel>
                <FormControl>
                  <Input maxLength={120} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Images from the media library */}
          {template.images.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {template.images.map((slot) => (
                <FormField
                  key={slot.id}
                  control={form.control}
                  name={`images.${slot.id}`}
                  render={({ field }) => {
                    const chosen = field.value ? thumb(field.value) : undefined;
                    return (
                      <FormItem>
                        <FormLabel>
                          {slot.label[uiLocale]}{' '}
                          <span className="text-xs font-normal text-subtle">· {slot.required ? t.required : t.optional}</span>
                        </FormLabel>
                        <div className="overflow-hidden rounded-xl border border-border">
                          <div className="flex aspect-[9/16] max-h-56 w-full items-center justify-center bg-surface-2">
                            {chosen ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={chosen.url} srcSet={chosen.srcset} sizes="200px" alt="" className="size-full object-cover" />
                            ) : field.value ? (
                              <ImageIcon aria-hidden className="size-8 text-subtle" />
                            ) : (
                              <ImageIcon aria-hidden className="size-8 text-border" />
                            )}
                          </div>
                          <div className="flex gap-1 p-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={async () => {
                                const picked = await picker.pick();
                                if (picked) field.onChange(picked.id);
                              }}
                            >
                              {field.value ? t.change : t.pick}
                            </Button>
                            {field.value && (
                              <Button type="button" size="sm" variant="ghost" onClick={() => field.onChange('')}>
                                {t.remove}
                              </Button>
                            )}
                          </div>
                        </div>
                        <FormDescription>{slot.hint[uiLocale]}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              ))}
            </div>
          )}

          {/* Narration: a choice only for templates that can be silent */}
          {template.narration === 'optional' && (
            <FormField
              control={form.control}
              name="narration"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 rounded-xl border border-border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel>{t.narration}</FormLabel>
                    <FormDescription>{t.narrationHint}</FormDescription>
                  </div>
                </FormItem>
              )}
            />
          )}

          {/* Hosts and voices */}
          <div className="grid gap-4 sm:grid-cols-2">
            {template.avatars.map((slot) => (
              <FormField
                key={slot.id}
                control={form.control}
                name={`avatars.${slot.id}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{slot.label[uiLocale]}</FormLabel>
                    <Select value={field.value || NONE} onValueChange={(value) => field.onChange(value === NONE ? '' : value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>{t.noAvatar}</SelectItem>
                        {avatars.map((avatar) => (
                          <SelectItem key={avatar.id} value={avatar.id}>
                            {avatar.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      <Link href={`${base}/avatars`} className="underline">
                        {t.manageAvatars}
                      </Link>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            {narration &&
              template.speakers.map((speaker) => (
                <FormField
                  key={speaker.id}
                  control={form.control}
                  name={`voices.${speaker.id}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{format(t.voiceOf, { speaker: speaker.label[uiLocale] })}</FormLabel>
                      <Select value={field.value || NONE} onValueChange={(value) => field.onChange(value === NONE ? '' : value)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE}>{avatarSpeakers.has(speaker.id) ? t.hostVoice : voices[0]?.label[uiLocale]}</SelectItem>
                          {voices.map((voice) => (
                            <SelectItem key={voice.id} value={voice.id}>
                              {voice.label[uiLocale]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
          </div>

          {/* Fill the empty fields: business facts from the brand kit, descriptive ones by AI */}
          {canSuggest && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border p-4">
              <Button type="button" variant="secondary" onClick={suggest} disabled={disabled || suggesting || isDirty}>
                {suggesting ? <LoaderCircleIcon className="animate-spin" /> : <SparklesIcon />}
                {t.suggest}
              </Button>
              <p className="min-w-0 flex-1 text-sm text-muted">{isDirty ? t.suggestSaveFirst : t.suggestHint}</p>
            </div>
          )}

          {/* Facts */}
          {template.facts.map((slot) => (
            <FormField
              key={slot.id}
              control={form.control}
              name={`facts.${slot.id}`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {slot.label[uiLocale]}{' '}
                    <span className="text-xs font-normal text-subtle">· {slot.required ? t.required : t.optional}</span>
                    {drafts.has(slot.id) && (
                      <Badge tone="warning" className="ml-2">
                        {t.aiDraft}
                      </Badge>
                    )}
                  </FormLabel>
                  {slot.kind === 'article' ? (
                    articles.length ? (
                      <Select value={field.value || NONE} onValueChange={(value) => field.onChange(value === NONE ? '' : value)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE}>{t.chooseArticle}</SelectItem>
                          {articles.map((article) => (
                            <SelectItem key={article.id} value={article.id}>
                              {article.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-subtle">{t.noArticles}</p>
                    )
                  ) : (
                    <FormControl>
                      <Textarea maxLength={slot.maxLength} rows={slot.maxLength > 300 ? 4 : 2} {...field} />
                    </FormControl>
                  )}
                  <FormDescription>{slot.hint[uiLocale]}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}

          <FormField
            control={form.control}
            name="brief"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.brief}</FormLabel>
                <FormControl>
                  <Textarea maxLength={1000} rows={2} {...field} />
                </FormControl>
                <FormDescription>{t.briefHint}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">
            {pending && <LoaderCircleIcon className="animate-spin" />}
            {t.saveInputs}
          </Button>
        </fieldset>
      </Form>
      {picker.dialog}
    </Step>
  );
}

/* ─────────────────────────────── 2. Script ─────────────────────────────── */

function ScriptForm({ siteId, project, template, labels, disabled }: Props & { disabled: boolean }) {
  const { t, common, validation } = labels;
  const script = project.script!;
  const specs = Object.fromEntries(template.scenes.map((scene) => [scene.id, scene]));
  const defaults: ScriptValues = {
    hooks: script.hooks,
    scenes: script.scenes.map((scene) => ({ id: scene.id, voice: scene.voice, onScreen: scene.onScreen })),
    caption: script.caption,
    hashtags: script.hashtags.join(' '),
  };
  const form = useForm<ScriptValues>({ resolver: zodResolver(scriptSchema), defaultValues: defaults });
  const scenes = useWatch({ control: form.control, name: 'scenes' });

  const [, submit, pending] = useActionState(async (_previous: unknown, values: ScriptValues) => {
    const result = await saveStudioScriptAction(siteId, project.id, values);
    if (result.ok) toast.success(t.scriptSaved);
    else {
      const unmatched = applyActionErrors(form, result.errors);
      if (!result.errors?.length || unmatched.length) {
        toast.error(result.message, { description: result.requestId ? `${common.requestId}: ${result.requestId}` : undefined });
      }
    }
    return result;
  }, null);

  return (
    <Form form={form} translate={(key) => validation[key] ?? key} onSubmit={(values) => startTransition(() => submit(values))}>
      <fieldset disabled={disabled || pending} className="space-y-6">
        {project.warnings.length > 0 && (
          <div
            role="note"
            className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
          >
            <p className="font-semibold">{t.warningsTitle}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {project.warnings.map((warning, i) => (
                <li key={i}>
                  {warning.scene && <span className="font-mono text-xs">{warning.scene}: </span>}
                  {format(t.warnings[warning.code], { detail: warning.detail })}
                </li>
              ))}
            </ul>
          </div>
        )}

        {script.hooks.length > 1 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t.hooks}</legend>
            {script.hooks.map((hook, i) => (
              <label
                key={i}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 text-sm has-checked:border-brand has-checked:bg-brand-soft"
              >
                <input
                  type="radio"
                  name="hook"
                  className="mt-1"
                  checked={scenes[0]?.voice === hook}
                  onChange={() => form.setValue('scenes.0.voice', hook, { shouldDirty: true })}
                />
                <span>
                  <span className="block text-xs text-subtle">{format(t.hookOption, { n: i + 1 })}</span>
                  {hook}
                </span>
              </label>
            ))}
          </fieldset>
        )}

        <ol className="space-y-4">
          {scenes.map((scene, i) => {
            const spec = specs[scene.id];
            const words = countWords(scene.voice ?? '');
            const chars = (scene.onScreen ?? '').length;
            return (
              <li key={scene.id} className="rounded-xl border border-border p-4">
                <p className="text-xs font-mono text-subtle">
                  {i + 1}. {scene.id}
                </p>
                <div className="mt-2 grid gap-4 md:grid-cols-[2fr_1fr]">
                  <FormField
                    control={form.control}
                    name={`scenes.${i}.voice`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.sceneVoice}</FormLabel>
                        <FormControl>
                          <Textarea rows={2} maxLength={600} {...field} />
                        </FormControl>
                        {spec && (
                          <FormDescription className={cn(words > spec.maxWords && 'text-amber-700 dark:text-amber-300')}>
                            {format(t.words, { count: words, max: spec.maxWords })}
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`scenes.${i}.onScreen`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.sceneOnScreen}</FormLabel>
                        <FormControl>
                          <Input maxLength={200} {...field} />
                        </FormControl>
                        {spec && (
                          <FormDescription className={cn(chars > spec.onScreenMaxChars && 'text-amber-700 dark:text-amber-300')}>
                            {format(t.chars, { count: chars, max: spec.onScreenMaxChars })}
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </li>
            );
          })}
        </ol>

        <FormField
          control={form.control}
          name="caption"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.caption}</FormLabel>
              <FormControl>
                <Textarea rows={3} maxLength={2200} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="hashtags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.hashtags}</FormLabel>
              <FormControl>
                <Input maxLength={1000} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">
          {pending && <LoaderCircleIcon className="animate-spin" />}
          {t.saveScript}
        </Button>
      </fieldset>
    </Form>
  );
}
