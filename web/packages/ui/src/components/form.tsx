'use client';

import { Slot } from 'radix-ui';
import { createContext, useContext, useId, type ComponentProps } from 'react';
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  type Path,
  type SubmitErrorHandler,
  type SubmitHandler,
  type UseFormReturn,
} from 'react-hook-form';
import { cn } from '../lib/cn';
import { Label } from './label';

/**
 * Forms = react-hook-form + a zod schema shared with the Server Action (web/.claude/rules/forms.md).
 * Validation messages are KEYS ('required', 'tooLong'…), the same on the client and in the action's
 * field errors; `translate` turns them into the page language.
 *
 *   const form = useForm({ resolver: zodResolver(schema), defaultValues });
 *   <Form form={form} onSubmit={save} translate={(key) => t.validation[key] ?? key}>
 *     <FormField control={form.control} name="name" render={({ field }) => (
 *       <FormItem>
 *         <FormLabel>{t.name}</FormLabel>
 *         <FormControl><Input {...field} /></FormControl>
 *         <FormMessage />
 *       </FormItem>
 *     )} />
 *   </Form>
 */

type Translate = (key: string) => string;
const TranslateContext = createContext<Translate>((key) => key);

export function Form<TIn extends FieldValues, TOut = TIn>({
  form,
  onSubmit,
  onInvalidSubmit,
  translate,
  className,
  children,
  ...props
}: Omit<ComponentProps<'form'>, 'onSubmit' | 'translate'> & {
  form: UseFormReturn<TIn, unknown, TOut>;
  onSubmit: SubmitHandler<TOut>;
  /** The schema refused the values (e.g. to show the tab that holds the first error). */
  onInvalidSubmit?: SubmitErrorHandler<TIn>;
  translate?: Translate;
}) {
  return (
    <FormProvider {...form}>
      <TranslateContext.Provider value={translate ?? ((key) => key)}>
        {/* noValidate: the schema validates (same rules and messages as the server), not the browser. */}
        <form noValidate onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)} className={cn('grid gap-5', className)} {...props}>
          {children}
        </form>
      </TranslateContext.Provider>
    </FormProvider>
  );
}

const FieldContext = createContext<{ name: string } | null>(null);
const ItemContext = createContext<{ id: string } | null>(null);

export function FormField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>, TTransformed = TFieldValues>(
  props: ControllerProps<TFieldValues, TName, TTransformed>,
) {
  return (
    <FieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FieldContext.Provider>
  );
}

export function useFormField() {
  const field = useContext(FieldContext);
  const item = useContext(ItemContext);
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: field?.name });
  if (!field || !item) throw new Error('useFormField must be used inside <FormField> and <FormItem>');
  const state = getFieldState(field.name, formState);
  return {
    name: field.name,
    id: item.id,
    controlId: `${item.id}-control`,
    descriptionId: `${item.id}-description`,
    messageId: `${item.id}-message`,
    ...state,
  };
}

export function FormItem({ className, ...props }: ComponentProps<'div'>) {
  const id = useId();
  return (
    <ItemContext.Provider value={{ id }}>
      <div data-slot="form-item" className={cn('grid gap-2', className)} {...props} />
    </ItemContext.Provider>
  );
}

export function FormLabel({ className, ...props }: ComponentProps<typeof Label>) {
  const { controlId, error } = useFormField();
  return <Label data-error={!!error} htmlFor={controlId} className={cn('data-[error=true]:text-red-600', className)} {...props} />;
}

/** Passes id, aria-invalid and aria-describedby to its single child (Input, Select trigger…). */
export function FormControl(props: ComponentProps<typeof Slot.Root>) {
  const { controlId, descriptionId, messageId, error } = useFormField();
  return (
    <Slot.Root
      data-slot="form-control"
      id={controlId}
      aria-describedby={error ? `${descriptionId} ${messageId}` : descriptionId}
      aria-invalid={!!error}
      {...props}
    />
  );
}

export function FormDescription({ className, ...props }: ComponentProps<'p'>) {
  const { descriptionId } = useFormField();
  return <p data-slot="form-description" id={descriptionId} className={cn('text-xs text-subtle', className)} {...props} />;
}

/** The field's error, translated; renders nothing without one. */
export function FormMessage({ className, ...props }: ComponentProps<'p'>) {
  const { messageId, error } = useFormField();
  const translate = useContext(TranslateContext);
  if (!error?.message) return null;
  return (
    <p data-slot="form-message" id={messageId} role="alert" className={cn('text-xs font-medium text-red-600', className)} {...props}>
      {translate(String(error.message))}
    </p>
  );
}

/**
 * Shows a Server Action's field errors (ActionFailure.errors) next to the fields. Returns the
 * errors that match no field (show them in a toast or above the form).
 */
export function applyActionErrors<T extends FieldValues>(
  form: UseFormReturn<T, unknown, unknown>,
  errors: readonly { field: string; message: string }[] | undefined,
): { field: string; message: string }[] {
  const fields = new Set(Object.keys(form.getValues()));
  const unmatched: { field: string; message: string }[] = [];
  for (const error of errors ?? []) {
    const root = error.field.split('.')[0];
    if (fields.has(root)) form.setError(error.field as Path<T>, { type: 'server', message: error.message }, { shouldFocus: true });
    else unmatched.push(error);
  }
  return unmatched;
}
