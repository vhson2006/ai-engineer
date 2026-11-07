'use client';

import { DayPicker, type DayPickerProps } from '@daypicker/react';
import { enGB, vi } from '@daypicker/react/locale';
import '@daypicker/react/style.css';
import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/cn';
import { fieldClass } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

/**
 * A month calendar (@daypicker/react), colored by the design tokens (theme.css `.rdp-root`).
 * `lang` is the page language ('en', 'vi'); add a language to CALENDAR_LOCALES when the apps do.
 */
const CALENDAR_LOCALES = { en: enGB, vi } as const;

export function calendarLocale(lang: string | undefined): DayPickerProps['locale'] {
  return CALENDAR_LOCALES[lang as keyof typeof CALENDAR_LOCALES] ?? enGB;
}

export function Calendar({ className, showOutsideDays = true, lang, ...props }: DayPickerProps & { lang?: string }) {
  return (
    <DayPicker
      data-slot="calendar"
      showOutsideDays={showOutsideDays}
      locale={calendarLocale(lang)}
      className={cn('p-1', className)}
      {...props}
    />
  );
}

export interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  /** Shown when no date is selected (in the page language). */
  placeholder: string;
  /** Page language ('en', 'vi'): calendar labels. */
  lang?: string;
  /** Intl locale used to display the chosen date, e.g. 'vi-VN'. */
  intlLocale?: string;
  disabled?: boolean;
  id?: string;
  'aria-invalid'?: boolean;
  className?: string;
}

/** A field-looking button that opens a calendar in a popover. Works inside FormControl. */
export function DatePicker({
  value,
  onChange,
  placeholder,
  lang,
  intlLocale,
  disabled,
  className,
  ...aria
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const label = value ? new Intl.DateTimeFormat(intlLocale, { dateStyle: 'medium' }).format(value) : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(fieldClass, 'flex h-10 items-center justify-between gap-2 text-left', !value && 'text-subtle', className)}
          {...aria}
        >
          <span className="truncate">{label}</span>
          <CalendarIcon className="size-4 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
          lang={lang}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
