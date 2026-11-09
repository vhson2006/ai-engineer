'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { newSubmissionId } from '@web/core/actions/submission-id';
import { format } from '@web/core/i18n/format';
import { Button } from '@web/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@web/ui/dialog';
import { applyActionErrors, Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@web/ui/form';
import { Input, Textarea } from '@web/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@web/ui/select';
import { toast } from '@web/ui/toaster';
import { LoaderCircleIcon, PlusIcon } from 'lucide-react';
import { startTransition, useActionState, useState } from 'react';
import { useForm } from 'react-hook-form';
import { createDeploymentAction } from './actions';
import { createDeploymentSchema, ENVIRONMENTS, type CreateDeploymentValues } from './schema';

export interface CreateDeploymentLabels {
  button: string;
  title: string;
  description: string;
  name: string;
  namePlaceholder: string;
  version: string;
  versionHint: string;
  environment: string;
  environments: Record<(typeof ENVIRONMENTS)[number], string>;
  notes: string;
  notesPlaceholder: string;
  submit: string;
  submitting: string;
  success: string;
  cancel: string;
  close: string;
  requestId: string;
  validation: Record<string, string>;
}

const blank = (): CreateDeploymentValues => ({
  submissionId: newSubmissionId(),
  name: '',
  version: '',
  environment: 'development',
  description: '',
});

/**
 * "New deployment" dialog: react-hook-form + the shared zod schema in the browser, then the Server
 * Action (which validates again). A new submissionId per form instance (double submits → once()).
 */
export function CreateDeploymentDialog({ labels }: { labels: CreateDeploymentLabels }) {
  const [open, setOpen] = useState(false);
  const form = useForm<CreateDeploymentValues>({ resolver: zodResolver(createDeploymentSchema), defaultValues: blank() });
  // The action's result is handled right here (inside the transition), not in an effect:
  // success → toast, close, a fresh form (new submissionId); failure → field errors and/or a toast.
  const [, submit, pending] = useActionState(async (_previous: unknown, values: CreateDeploymentValues) => {
    const result = await createDeploymentAction(values);
    if (result.ok) {
      toast.success(format(labels.success, { name: result.data.name }));
      setOpen(false);
      form.reset(blank());
    } else {
      const unmatched = applyActionErrors(form, result.errors);
      if (!result.errors?.length || unmatched.length) {
        toast.error(result.message, { description: result.requestId ? `${labels.requestId}: ${result.requestId}` : undefined });
      }
    }
    return result;
  }, null);

  const translate = (key: string) => labels.validation[key] ?? key;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return; // don't lose a submission in flight
        setOpen(next);
        if (!next) form.reset(blank());
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <PlusIcon />
          {labels.button}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={labels.close}>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>

        <Form form={form} translate={translate} onSubmit={(values) => startTransition(() => submit(values))}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{labels.name}</FormLabel>
                <FormControl>
                  <Input placeholder={labels.namePlaceholder} maxLength={100} autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="version"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels.version}</FormLabel>
                  <FormControl>
                    <Input placeholder="1.4.0" maxLength={50} autoComplete="off" className="font-mono" {...field} />
                  </FormControl>
                  <FormDescription>{labels.versionHint}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="environment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels.environment}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger onBlur={field.onBlur}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ENVIRONMENTS.map((environment) => (
                        <SelectItem key={environment} value={environment}>
                          {labels.environments[environment]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{labels.notes}</FormLabel>
                <FormControl>
                  <Textarea placeholder={labels.notesPlaceholder} maxLength={2000} rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <input type="hidden" {...form.register('submissionId')} />

          <DialogFooter className="pt-1">
            <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
              {labels.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <LoaderCircleIcon className="animate-spin" />}
              {pending ? labels.submitting : labels.submit}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
