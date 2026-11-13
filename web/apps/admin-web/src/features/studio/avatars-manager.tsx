'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { newSubmissionId } from '@web/core/actions/submission-id';
import type { Media, StudioAvatar, StudioVoice } from '@web/core/api';
import { Button } from '@web/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@web/ui/dialog';
import { applyActionErrors, Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@web/ui/form';
import { Input, Textarea } from '@web/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@web/ui/select';
import { toast } from '@web/ui/toaster';
import { LoaderCircleIcon, PencilIcon, PlusIcon, Trash2Icon, UserRoundIcon } from 'lucide-react';
import { startTransition, useActionState, useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { Messages } from '@/i18n/dictionaries';
import { useMediaPicker } from '../media/media-picker';
import { createStudioAvatarAction, deleteStudioAvatarAction, updateStudioAvatarAction } from './actions';
import { avatarSchema, type AvatarValues } from './schema';

type Labels = { t: Messages['studio']; common: Messages['common']; validation: Record<string, string>; media: Messages['media'] };

/**
 * The site's hosts (ADR 0039): a face from the media library, a default voice, and the consent
 * note (who agreed to appear). Only real people who agreed, or licensed stock photos.
 */
export function AvatarsManager({
  siteId,
  avatars,
  voices,
  media,
  uiLocale,
  labels,
}: {
  siteId: string;
  avatars: StudioAvatar[];
  voices: StudioVoice[];
  media: Media[];
  uiLocale: 'vi' | 'en';
  labels: Labels;
}) {
  const { t, common } = labels;
  const [editing, setEditing] = useState<StudioAvatar | 'new' | null>(null);
  const [deleting, startDelete] = useTransition();
  const voiceLabel = (id: string) => voices.find((v) => v.id === id)?.label[uiLocale] ?? id;

  const remove = (avatar: StudioAvatar) => {
    if (!window.confirm(t.avatars.confirmDelete)) return;
    startDelete(async () => {
      const result = await deleteStudioAvatarAction(siteId, avatar.id);
      if (result.ok) toast.success(t.avatars.deleted);
      else toast.error(result.message);
    });
  };

  return (
    <div className="space-y-4">
      <Button onClick={() => setEditing('new')}>
        <PlusIcon />
        {t.avatars.new}
      </Button>
      {avatars.length === 0 ? (
        <p className="text-sm text-subtle">{t.avatars.empty}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {avatars.map((avatar) => (
            <li key={avatar.id} className="flex gap-4 rounded-2xl border border-border bg-surface p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatar.image.url} srcSet={avatar.image.srcset} sizes="80px" alt="" className="size-20 shrink-0 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{avatar.name}</p>
                <p className="text-sm text-muted">{voiceLabel(avatar.voice)}</p>
                <p className="mt-1 line-clamp-2 text-xs text-subtle">{avatar.consentNote}</p>
                <div className="mt-2 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(avatar)} aria-label={`${common.edit} ${avatar.name}`}>
                    <PencilIcon />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(avatar)} disabled={deleting} aria-label={`${common.delete} ${avatar.name}`}>
                    <Trash2Icon />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <AvatarDialog
          key={editing === 'new' ? 'new' : editing.id}
          siteId={siteId}
          avatar={editing === 'new' ? undefined : editing}
          voices={voices}
          media={media}
          uiLocale={uiLocale}
          labels={labels}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function AvatarDialog({
  siteId,
  avatar,
  voices,
  media,
  uiLocale,
  labels,
  onClose,
}: {
  siteId: string;
  avatar?: StudioAvatar;
  voices: StudioVoice[];
  media: Media[];
  uiLocale: 'vi' | 'en';
  labels: Labels;
  onClose: () => void;
}) {
  const { t, common, validation } = labels;
  const form = useForm<AvatarValues>({
    resolver: zodResolver(avatarSchema),
    defaultValues: {
      submissionId: avatar ? undefined : newSubmissionId(),
      name: avatar?.name ?? '',
      mediaId: avatar?.image.id ?? '',
      voice: avatar?.voice ?? voices[0]?.id ?? '',
      consentNote: avatar?.consentNote ?? '',
    },
  });
  const picker = useMediaPicker({ siteId, initial: media, labels: labels.media, closeLabel: common.close });
  const mediaId = useWatch({ control: form.control, name: 'mediaId' });
  const face = media.find((m) => m.id === mediaId) ?? (avatar?.image.id === mediaId ? avatar.image : undefined);

  const [, submit, pending] = useActionState(async (_previous: unknown, values: AvatarValues) => {
    const result = avatar ? await updateStudioAvatarAction(siteId, avatar.id, values) : await createStudioAvatarAction(siteId, values);
    if (result.ok) {
      toast.success(t.avatars.saved);
      onClose();
    } else {
      const unmatched = applyActionErrors(form, result.errors);
      if (!result.errors?.length || unmatched.length) {
        toast.error(result.message, { description: result.requestId ? `${common.requestId}: ${result.requestId}` : undefined });
      }
    }
    return result;
  }, null);

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent closeLabel={common.close}>
        <DialogHeader>
          <DialogTitle>{avatar ? t.avatars.edit : t.avatars.new}</DialogTitle>
          <DialogDescription>{t.avatars.subtitle}</DialogDescription>
        </DialogHeader>
        <Form form={form} translate={(key) => validation[key] ?? key} onSubmit={(values) => startTransition(() => submit(values))}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.avatars.name}</FormLabel>
                <FormControl>
                  <Input maxLength={80} autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mediaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.avatars.image}</FormLabel>
                <div className="flex items-center gap-4">
                  <div className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-surface-2">
                    {face ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={face.url} srcSet={face.srcset} sizes="80px" alt="" className="size-full object-cover" />
                    ) : (
                      <UserRoundIcon aria-hidden className="size-8 text-subtle" />
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
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="voice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.avatars.voice}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
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
          <FormField
            control={form.control}
            name="consentNote"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.avatars.consent}</FormLabel>
                <FormControl>
                  <Textarea maxLength={500} rows={3} {...field} />
                </FormControl>
                <FormDescription>{t.avatars.consentHint}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <LoaderCircleIcon className="animate-spin" />}
              {common.save}
            </Button>
          </DialogFooter>
        </Form>
        {picker.dialog}
      </DialogContent>
    </Dialog>
  );
}
