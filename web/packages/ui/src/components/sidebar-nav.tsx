'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';
import { MenuIcon, XIcon } from 'lucide-react';
import { cn } from '../lib/cn';

export interface SidebarItem {
  href: string;
  label: string;
  /** A small visual before the label (an icon or initials). */
  icon?: ReactNode;
  /** Active only on this exact path, not on its children. */
  exact?: boolean;
  /** Sub-pages, shown under the item. */
  children?: { href: string; label: string }[];
}

export interface SidebarGroup {
  /** Visible heading of the group; omit for the first, unnamed group. */
  label?: string;
  items: SidebarItem[];
}

const isActive = (pathname: string, href: string, exact?: boolean) =>
  exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

/**
 * Vertical navigation (an admin side menu). Labels and localized hrefs come from the server; the
 * groups shown are decided there too (who may see what). Display only: pages check access again.
 */
export function SidebarNav({ groups, label, className }: { groups: SidebarGroup[]; label: string; className?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className={cn('flex flex-col gap-6', className)}>
      {groups.map((group, g) => (
        <div key={group.label ?? g}>
          {group.label && (
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-subtle">{group.label}</p>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              const inside = item.children?.some((child) => isActive(pathname, child.href)) ?? false;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active && !inside ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active || inside ? 'bg-surface-2 text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg',
                    )}
                  >
                    {item.icon && <span className="flex size-5 shrink-0 items-center justify-center">{item.icon}</span>}
                    <span className="truncate">{item.label}</span>
                  </Link>
                  {item.children && (active || inside) && (
                    <ul className="mt-0.5 ml-5 flex flex-col gap-0.5 border-l border-border pl-3">
                      {item.children.map((child) => {
                        const current = isActive(pathname, child.href);
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              aria-current={current ? 'page' : undefined}
                              className={cn(
                                'block rounded-md px-2 py-1.5 text-sm transition-colors',
                                current ? 'font-medium text-brand' : 'text-muted hover:text-fg',
                              )}
                            >
                              {child.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * The same menu on small screens: a button that opens it as a panel under the header. Closes on
 * navigation and with Escape (native <details>: works before hydration too).
 */
export function SidebarDrawer({ openLabel, closeLabel, children }: { openLabel: string; closeLabel: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && ref.current?.open) ref.current.open = false;
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <details ref={ref} className="group lg:hidden">
      <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg [&::-webkit-details-marker]:hidden">
        <MenuIcon aria-hidden className="size-5 group-open:hidden" />
        <XIcon aria-hidden className="hidden size-5 group-open:block" />
        <span className="sr-only group-open:hidden">{openLabel}</span>
        <span className="sr-only hidden group-open:inline">{closeLabel}</span>
      </summary>
      <div className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-border bg-bg p-4 shadow-lg">
        {children}
      </div>
    </details>
  );
}
