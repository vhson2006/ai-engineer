'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../lib/cn';

export interface NavLink {
  href: string;
  label: string;
  /** Active only on this exact path (the home page), not on its children. */
  exact?: boolean;
}

/** Highlights the current page. Labels and localized hrefs come from the server (no dictionary here). */
export function NavLinks({ links, label }: { links: NavLink[]; label: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="flex items-center gap-1">
      {links.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active ? 'bg-surface-2 text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg',
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
