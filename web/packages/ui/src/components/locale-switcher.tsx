'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { cn } from '../lib/cn';

export interface LocaleOption {
  /** URL segment and `lang` value, e.g. 'vi'. */
  code: string;
  /** Name in its own language, e.g. 'Tiếng Việt' (a visitor looks for their own language). */
  name: string;
}

export interface LocaleSwitcherProps {
  current: string;
  locales: readonly LocaleOption[];
  /** Accessible name and panel heading, in the current language (e.g. 'Language'). */
  label: string;
}

/**
 * Language menu for the header. Each option is a real link to the same page in that language
 * (works without JavaScript, crawlable, `hreflang`); with JavaScript it keeps the query string,
 * the hash and the scroll position. Links are never prefetched: the proxy saves the language of
 * a visited page, and a prefetch is not a visit.
 */
export function LocaleSwitcher({ current, locales, label }: LocaleSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  // Open = opened on this page: navigating closes it without an effect.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (value: boolean | ((current: boolean) => boolean)) =>
    setOpenedOn((previous) => {
      const next = typeof value === 'function' ? value(previous === pathname) : value;
      return next ? pathname : null;
    });
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Close on a click outside.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenedOn(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const hrefFor = (code: string) => {
    const segments = pathname.split('/');
    segments[1] = code; // pathname always starts with /<locale> under app/[lang]
    return segments.join('/') || `/${code}`;
  };

  const items = () => Array.from(rootRef.current?.querySelectorAll<HTMLAnchorElement>('[data-locale-option]') ?? []);

  const openAndFocus = (which: 'first' | 'last' | 'current') => {
    setOpen(true);
    requestAnimationFrame(() => {
      const all = items();
      const target =
        which === 'current' ? all.find((a) => a.dataset.localeOption === current) : which === 'first' ? all[0] : all.at(-1);
      target?.focus();
    });
  };

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openAndFocus('current');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      openAndFocus('last');
    }
  };

  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const all = items();
    const index = all.indexOf(document.activeElement as HTMLAnchorElement);
    const move = (to: number) => {
      event.preventDefault();
      all[(to + all.length) % all.length]?.focus();
    };
    if (event.key === 'ArrowDown') move(index + 1);
    else if (event.key === 'ArrowUp') move(index - 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(all.length - 1);
    else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === 'Tab') setOpen(false);
  };

  const onChoose = (event: MouseEvent<HTMLAnchorElement>, code: string) => {
    setOpen(false);
    if (code === current) {
      event.preventDefault();
      return;
    }
    // Ordinary click: keep the query string (?page=2), the hash and the scroll position.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    router.push(`${hrefFor(code)}${window.location.search}${window.location.hash}`, { scroll: false });
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${label}: ${locales.find((l) => l.code === current)?.name ?? current}`}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onButtonKeyDown}
        className={cn(
          'inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-sm font-medium text-muted shadow-sm transition-colors',
          'hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
          open && 'bg-surface-2 text-fg',
        )}
      >
        <GlobeIcon />
        <span className="font-mono text-xs font-semibold uppercase tracking-wider">{current}</span>
        <ChevronIcon className={cn('transition-transform duration-200', open && 'rotate-180')} />
      </button>

      <div
        id={panelId}
        role="group"
        aria-label={label}
        onKeyDown={onPanelKeyDown}
        className={cn(
          'absolute right-0 top-full z-50 mt-2 w-56 origin-top-right rounded-xl border border-border bg-surface p-1.5 shadow-xl shadow-black/5 ring-1 ring-black/5 dark:shadow-black/40 dark:ring-white/5',
          'transition duration-150 ease-out motion-reduce:transition-none',
          open ? 'visible scale-100 opacity-100' : 'invisible scale-95 opacity-0',
        )}
      >
        <p className="px-3 pb-1.5 pt-1 text-[0.7rem] font-semibold uppercase tracking-wider text-subtle">{label}</p>
        <ul className="space-y-0.5">
          {locales.map((locale) => {
            const active = locale.code === current;
            return (
              <li key={locale.code}>
                <Link
                  href={hrefFor(locale.code)}
                  hrefLang={locale.code}
                  lang={locale.code}
                  prefetch={false}
                  scroll={false}
                  data-locale-option={locale.code}
                  aria-current={active ? 'true' : undefined}
                  tabIndex={open ? 0 : -1}
                  onClick={(event) => onChoose(event, locale.code)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none transition-colors',
                    active
                      ? 'bg-brand-soft font-medium text-brand-soft-fg'
                      : 'text-fg hover:bg-surface-2 focus-visible:bg-surface-2',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'inline-flex h-6 w-8 shrink-0 items-center justify-center rounded-md font-mono text-[0.65rem] font-bold uppercase',
                      active ? 'bg-brand text-brand-fg' : 'bg-surface-2 text-muted',
                    )}
                  >
                    {locale.code}
                  </span>
                  <span className="flex-1">{locale.name}</span>
                  {active && <CheckIcon />}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden className="size-4.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={cn('size-4 opacity-70', className)}>
      <path fillRule="evenodd" d="M5.2 7.7a.75.75 0 0 1 1.06.04L10 11.6l3.74-3.86a.75.75 0 1 1 1.08 1.04l-4.28 4.42a.75.75 0 0 1-1.08 0L5.16 8.78a.75.75 0 0 1 .04-1.07Z" clipRule="evenodd" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="size-4 shrink-0">
      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
    </svg>
  );
}
