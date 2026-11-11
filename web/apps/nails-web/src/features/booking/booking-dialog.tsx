'use client';

import { ArrowLeft, ArrowRight, CalendarCheck, Check, Copy, ExternalLink, Phone } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { format } from '@web/core/i18n/format';
import { cn } from '@web/ui';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@web/ui/dialog';
import { pill } from '@/components/pill';
import { LOCALES, type Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';
import { formatTime } from '@/lib/format';
import type { BookingPreset } from './booking-provider';
import { dayKey, nextDays, slotsFor, type HoursRow } from './slots';

export type BookingGroup = { id: string; name: string; services: { id: string; name: string; price: string }[] };

/** Everything the dialog shows, translated and formatted on the server. */
export type BookingData = {
  locale: Locale;
  groups: BookingGroup[];
  hours: readonly HoursRow[];
  phone: { display: string; href: string };
  /** The salon's online booking page (third party, new tab). */
  bookingUrl: string;
  labels: Messages['booking'];
};

const DAYS_AHEAD = 14;

/**
 * Plan a visit, then book: the visitor picks a service, a day, a time and (optionally) a nail
 * tech, then finishes on the salon's online booking page (the summary is copied on the way) or
 * calls (a favorite tech is booked by phone, the salon's own rule). Nothing is submitted or
 * stored here: if the salon ever books through our API, step 3 becomes a Server Action
 * (forms.md, /new-form).
 */
export function BookingDialog({
  data,
  open,
  preset,
  onOpenChange,
}: {
  data: BookingData;
  open: boolean;
  preset?: BookingPreset;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={data.labels.close}
        className="max-w-2xl gap-0 rounded-3xl border-0 bg-bg p-0 sm:max-h-[min(46rem,calc(100dvh-2rem))]"
      >
        <BookingFlow data={data} preset={preset} />
      </DialogContent>
    </Dialog>
  );
}

/** Mounted only while the dialog is open, so "today" is read in the browser, never on the server. */
function BookingFlow({ data, preset }: { data: BookingData; preset?: BookingPreset }) {
  const t = data.labels;
  const intl = LOCALES[data.locale].intl;
  const [now] = useState(() => new Date());
  const days = useMemo(() => nextDays(now, DAYS_AHEAD), [now]);
  const presetService = preset?.service ? data.groups.flatMap((group) => group.services).find((item) => item.id === preset.service) : undefined;

  const [step, setStep] = useState(presetService ? 1 : 0);
  const [groupId, setGroupId] = useState(
    () =>
      data.groups.find((group) => (presetService ? group.services.includes(presetService) : group.id === preset?.group))?.id ?? data.groups[0].id,
  );
  const [serviceId, setServiceId] = useState<string | null>(presetService?.id ?? null);
  const [day, setDay] = useState(() => dayKey(days.find((date) => slotsFor(data.hours, date, now).length > 0) ?? days[0]));
  const [time, setTime] = useState<string | null>(null);
  const [artist, setArtist] = useState<'any' | 'named'>('any');
  const [artistName, setArtistName] = useState('');
  const [copied, setCopied] = useState(false);

  const group = data.groups.find((item) => item.id === groupId) ?? data.groups[0];
  const service = data.groups.flatMap((item) => item.services).find((item) => item.id === serviceId);
  const date = days.find((item) => dayKey(item) === day) ?? days[0];
  const slots = slotsFor(data.hours, date, now);
  const ready = [service !== undefined, time !== null, true][step];

  const dateLong = new Intl.DateTimeFormat(intl, { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
  const timeText = time ? formatTime(data.locale, time) : '';
  const named = artist === 'named' && artistName.trim() ? artistName.trim() : null;
  const summary = service ? format(t.copyText, { service: service.name, date: dateLong, time: timeText, artist: named ?? t.anyArtist }) : '';

  async function copy() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
    } catch {
      // Clipboard blocked (permissions, insecure origin): the summary is on screen to read out.
    }
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="bg-mint px-6 pt-6 pb-5 sm:px-8">
        <p className="text-xs font-semibold tracking-wide text-muted">
          {format(t.stepOf, { current: step + 1, total: t.steps.length })} · {t.steps[step]}
        </p>
        <DialogTitle className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">{t.title}</DialogTitle>
        <DialogDescription className="mt-1 max-w-md text-sm text-muted">{t.description}</DialogDescription>
        <ol className="mt-5 grid grid-cols-3 gap-1.5" aria-hidden>
          {t.steps.map((label, index) => (
            <li key={label} className={cn('h-1.5 rounded-full transition-colors duration-500', index <= step ? 'bg-fg' : 'bg-white/70 dark:bg-white/15')} />
          ))}
        </ol>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
        {step === 0 && (
          <div className="space-y-6">
            <fieldset>
              <legend className="mb-3 text-sm font-bold">{t.category}</legend>
              <div className="flex flex-wrap gap-2">
                {data.groups.map((item) => (
                  <Choice key={item.id} name="group" checked={item.id === groupId} onChange={() => setGroupId(item.id)} className="rounded-full px-4 py-2 text-sm">
                    {item.name}
                  </Choice>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-3 text-sm font-bold">{t.service}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.services.map((item) => (
                  <Choice
                    key={item.id}
                    name="service"
                    checked={item.id === serviceId}
                    onChange={() => setServiceId(item.id)}
                    className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left"
                  >
                    <span className="text-sm font-semibold">{item.name}</span>
                    <span className="text-sm whitespace-nowrap tabular-nums opacity-80">{item.price}</span>
                  </Choice>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-7">
            {service && (
              <p className="flex items-center justify-between gap-3 rounded-2xl bg-lilac px-4 py-3 text-sm">
                <span className="font-semibold">{service.name}</span>
                <button type="button" onClick={() => setStep(0)} className="cursor-pointer text-muted underline underline-offset-4">
                  {t.back}
                </button>
              </p>
            )}
            <fieldset>
              <legend className="mb-3 text-sm font-bold">{t.day}</legend>
              <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-2 sm:-mx-8 sm:px-8">
                {days.map((item, index) => {
                  const open = slotsFor(data.hours, item, now).length > 0;
                  return (
                    <Choice
                      key={dayKey(item)}
                      name="day"
                      checked={dayKey(item) === day}
                      disabled={!open}
                      onChange={() => {
                        setDay(dayKey(item));
                        setTime(null);
                      }}
                      className="flex w-16 shrink-0 flex-col items-center rounded-2xl px-2 py-3"
                    >
                      <span className="text-[0.68rem] font-semibold tracking-wide uppercase opacity-70">
                        {index === 0 ? t.today : new Intl.DateTimeFormat(intl, { weekday: 'short' }).format(item)}
                      </span>
                      <span className="mt-0.5 text-xl font-extrabold tabular-nums">{item.getDate()}</span>
                    </Choice>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-sm font-bold">{t.time}</legend>
              {slots.length === 0 ? (
                <p className="rounded-2xl bg-rose px-4 py-3 text-sm">{t.noTimes}</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {slots.map((slot) => (
                    <Choice key={slot} name="time" checked={slot === time} onChange={() => setTime(slot)} className="rounded-full px-2 py-2 text-center text-sm tabular-nums">
                      {formatTime(data.locale, slot)}
                    </Choice>
                  ))}
                </div>
              )}
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-sm font-bold">{t.artist}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <Choice name="artist" checked={artist === 'any'} onChange={() => setArtist('any')} className="rounded-2xl px-4 py-3 text-left">
                  <span className="block text-sm font-semibold">{t.artistAny}</span>
                  <span className="block text-xs opacity-70">{t.artistAnyHint}</span>
                </Choice>
                <Choice name="artist" checked={artist === 'named'} onChange={() => setArtist('named')} className="rounded-2xl px-4 py-3 text-left">
                  <span className="block text-sm font-semibold">{t.artistNamed}</span>
                  <span className="block text-xs opacity-70">{t.artistName}</span>
                </Choice>
              </div>
              {artist === 'named' && (
                <input
                  aria-label={t.artistName}
                  placeholder={t.artistName}
                  value={artistName}
                  maxLength={40}
                  autoComplete="off"
                  onChange={(event) => setArtistName(event.target.value)}
                  className="mt-3 h-11 w-full rounded-full bg-surface-2 px-5 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                />
              )}
            </fieldset>
          </div>
        )}

        {step === 2 && service && (
          <div className="space-y-5">
            <div className="rounded-3xl bg-baby p-2">
              <p className="px-4 pt-3 pb-2 text-xs font-semibold tracking-wide text-muted">{t.summary}</p>
              <dl className="divide-y divide-border rounded-2xl bg-surface">
                <SummaryRow label={t.service}>
                  {service.name} <span className="text-muted">· {service.price}</span>
                </SummaryRow>
                <SummaryRow label={t.day}>{dateLong}</SummaryRow>
                <SummaryRow label={t.time}>{timeText}</SummaryRow>
                <SummaryRow label={t.artist}>{named ?? t.artistAny}</SummaryRow>
              </dl>
            </div>
            {/* The salon's own rule ("Booking notes"): a favorite tech is booked by phone. */}
            {named && <p className="rounded-2xl bg-rose px-4 py-3 text-sm font-semibold">{t.favoriteHint}</p>}
            <div className="flex flex-col gap-2 sm:flex-row">
              {!named && (
                <a href={data.bookingUrl} target="_blank" rel="noopener noreferrer" onClick={copy} className={pill('ink', 'lg', 'flex-1')}>
                  <CalendarCheck aria-hidden />
                  {t.online}
                  <ExternalLink aria-hidden />
                </a>
              )}
              <a href={data.phone.href} className={pill(named ? 'ink' : 'soft', 'lg', named ? 'flex-1' : undefined)}>
                <Phone aria-hidden />
                {format(t.call, { phone: data.phone.display })}
              </a>
              <button type="button" onClick={copy} className={pill('soft', 'lg')}>
                {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                {copied ? t.copied : t.copy}
              </button>
            </div>
            <div className="rounded-2xl bg-surface-2 px-4 py-3 text-sm">
              <p className="font-semibold">{t.callWhen}</p>
              <ul className="mt-2 space-y-1 text-muted">
                {t.callReasons.map((reason) => (
                  <li key={reason} className="flex gap-2">
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-mint-strong" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-muted" aria-live="polite">
              {t.note}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4 sm:px-8">
        <button type="button" onClick={() => setStep((value) => value - 1)} className={pill('soft', 'md', step === 0 && 'invisible')}>
          <ArrowLeft aria-hidden />
          {t.back}
        </button>
        {step < 2 && (
          <button type="button" disabled={!ready} onClick={() => setStep((value) => value + 1)} className={pill('ink', 'md')}>
            {t.next}
            <ArrowRight aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

/** A radio styled as a chip/card (native input: arrow keys, form semantics, screen readers). */
function Choice({
  name,
  checked,
  disabled,
  onChange,
  className,
  children,
}: {
  name: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        'relative cursor-pointer transition duration-200 active:scale-[0.97]',
        'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand',
        checked ? 'bg-fg text-bg' : 'bg-surface-2 hover:bg-mint',
        disabled && 'pointer-events-none opacity-35',
        className,
      )}
    >
      <input type="radio" name={name} checked={checked} disabled={disabled} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-4 px-4 py-3.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}
