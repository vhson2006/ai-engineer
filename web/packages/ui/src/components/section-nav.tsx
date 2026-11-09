'use client';

import { MenuIcon, XIcon } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { scrollToElement } from './smooth-scroll';

/**
 * Navigation of a single-page site (sections of one page): a desktop link row and a mobile
 * drawer, both highlighting the section in view (scrollspy). Pair with <SmoothScroll /> in the
 * layout. Labels and the localized page path come from the server (no dictionary here).
 */
export interface SectionLink {
  /** The section's element id (also the React key for page links). */
  id: string;
  label: string;
  /** A link to another page instead of a section of this one (e.g. '/vi/about'). */
  href?: string;
}

/** The id of the section currently in view (the one crossing the upper third of the screen). */
export function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join('|');

  useEffect(() => {
    const sections = key
      .split('|')
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (sections.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // First section in page order that crosses the band; none (e.g. the hero) → no highlight.
        setActive(sections.find((section) => visible.has(section.id))?.id ?? null);
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [key]);

  return active;
}

/** Desktop row of section links. `pagePath` = the localized page (e.g. '/vi'). */
export function SectionNav({
  links,
  label,
  pagePath,
  className,
}: {
  links: SectionLink[];
  label: string;
  pagePath: string;
  className?: string;
}) {
  const active = useActiveSection(links.map((link) => link.id));
  return (
    <nav aria-label={label} className={className}>
      <ul className="flex items-center gap-1 whitespace-nowrap">
        {links.map((link) => {
          const current = active === link.id;
          return (
            <li key={link.id}>
              <a
                href={link.href ?? `${pagePath}#${link.id}`}
                aria-current={current ? 'location' : undefined}
                className={cn(
                  'relative inline-flex rounded-full px-3 py-2 text-sm font-medium transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-brand',
                  current ? 'text-brand' : 'text-muted hover:bg-surface-2 hover:text-fg',
                )}
              >
                {link.label}
                <span
                  aria-hidden
                  className={cn(
                    'absolute inset-x-3 -bottom-0.5 h-0.5 origin-center rounded-full bg-brand transition-transform duration-300',
                    current ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Mobile drawer: a menu button that opens a panel sliding in from the right (Radix Dialog: focus
 * trap, Escape, scroll lock, screen-reader announcements). Choosing a section closes the drawer
 * first, then scrolls smoothly to it. `footer` holds the language choice and calls to action.
 */
export function MobileNav({
  links,
  pagePath,
  labels,
  header,
  footer,
  className,
}: {
  links: SectionLink[];
  pagePath: string;
  labels: { open: string; close: string; title: string };
  /** Shown at the top of the panel (the site's logo). */
  header?: ReactNode;
  footer?: ReactNode;
  /** Visibility of the menu button, e.g. 'xl:hidden'. */
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const pending = useRef<string | null>(null);
  const active = useActiveSection(links.map((link) => link.id));

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        aria-label={labels.open}
        className={cn(
          'inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface text-fg shadow-sm transition-colors',
          'hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
          className,
        )}
      >
        <MenuIcon aria-hidden className="size-5" />
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out motion-reduce:animate-none" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            // After choosing a section: scroll there instead of returning focus to the button.
            const id = pending.current;
            pending.current = null;
            const target = id ? document.getElementById(id) : null;
            if (target) {
              event.preventDefault();
              scrollToElement(target);
            }
          }}
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex w-[min(22rem,88vw)] flex-col bg-surface shadow-2xl outline-none',
            'data-[state=open]:animate-slide-in-right data-[state=closed]:animate-slide-out-right motion-reduce:animate-none',
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <DialogPrimitive.Title className="sr-only">{labels.title}</DialogPrimitive.Title>
            <div className="min-w-0">{header}</div>
            <DialogPrimitive.Close
              aria-label={labels.close}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-brand"
            >
              <XIcon aria-hidden className="size-5" />
            </DialogPrimitive.Close>
          </div>

          <nav aria-label={labels.title} className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {links.map((link, index) => {
                const current = active === link.id;
                return (
                  <li key={link.id}>
                    <a
                      href={link.href ?? `${pagePath}#${link.id}`}
                      aria-current={current ? 'location' : undefined}
                      onClick={(event) => {
                        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                        if (link.href || !document.getElementById(link.id)) {
                          setOpen(false); // another page: close the drawer, navigate normally
                          return;
                        }
                        event.preventDefault();
                        pending.current = link.id;
                        setOpen(false);
                      }}
                      style={{ animationDelay: `${60 + index * 35}ms` }}
                      className={cn(
                        'flex items-center gap-4 rounded-2xl px-4 py-3.5 text-lg font-semibold transition-colors',
                        'animate-fade-in [animation-fill-mode:both] motion-reduce:animate-none',
                        'focus-visible:outline-2 focus-visible:outline-brand',
                        current ? 'bg-surface-2 text-brand' : 'text-fg hover:bg-surface-2',
                      )}
                    >
                      <span aria-hidden className="w-6 font-mono text-xs font-medium text-subtle">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="flex-1">{link.label}</span>
                      <span aria-hidden className={cn('size-2 rounded-full bg-brand transition-opacity', current ? 'opacity-100' : 'opacity-0')} />
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          {footer && <div className="space-y-3 border-t border-border bg-surface-2/60 px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
