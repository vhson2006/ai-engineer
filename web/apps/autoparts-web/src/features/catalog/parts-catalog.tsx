'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@web/ui';
import { matchesQuery } from './search';

export interface CatalogRow {
  id: string;
  category: string;
  name: string;
  fits: string;
  /** Formatted on the server, in the page's language. */
  price: string;
  inStock: boolean;
}

export interface CatalogLabels {
  all: string;
  search: string;
  searchPlaceholder: string;
  part: string;
  fits: string;
  price: string;
  inStock: string;
  onOrder: string;
  empty: string;
  /** "{count} parts": the live region's text. */
  count: string;
}

/**
 * A sample of the catalogue, filtered in the browser by category and by text (name or vehicle).
 * Nothing is sent anywhere: the full list comes with the page (no API call, no form). The
 * strings come from the server as props (no dictionary in the client bundle).
 */
export function PartsCatalog({
  rows,
  categories,
  labels,
}: {
  rows: CatalogRow[];
  categories: { id: string; label: string }[];
  labels: CatalogLabels;
}) {
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const visible = useMemo(
    () => rows.filter((row) => (!category || row.category === category) && matchesQuery(`${row.name} ${row.fits}`, query)),
    [rows, category, query],
  );

  const chip = (active: boolean) =>
    cn(
      'inline-flex h-10 items-center rounded-button border px-4 text-sm font-semibold transition-colors',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
      active ? 'border-brand bg-brand text-brand-fg' : 'border-border bg-surface hover:border-brand',
    );

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label={labels.all} className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={category === null} onClick={() => setCategory(null)} className={chip(category === null)}>
            {labels.all}
          </button>
          {categories.map((item) => (
            <button key={item.id} type="button" aria-pressed={category === item.id} onClick={() => setCategory(item.id)} className={chip(category === item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <label className="relative block w-full lg:max-w-xs">
          <span className="sr-only">{labels.search}</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={labels.searchPlaceholder}
            className="h-11 w-full rounded-button border border-border bg-surface pr-3 pl-9 text-sm outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
          />
        </label>
      </div>

      <p aria-live="polite" className="mt-4 text-sm text-muted">
        {labels.count.replace('{count}', String(visible.length))}
      </p>

      <div className="mt-3 overflow-x-auto rounded-card border border-border bg-surface">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-border bg-surface-2 text-xs tracking-wide text-muted uppercase">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">
                {labels.part}
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                {labels.fits}
              </th>
              <th scope="col" className="px-5 py-3 text-right font-semibold">
                {labels.price}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-4">
                  <span className="font-semibold">{row.name}</span>
                  <span className={cn('mt-1 flex items-center gap-1.5 text-xs', row.inStock ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted')}>
                    <span aria-hidden className={cn('size-1.5 rounded-full', row.inStock ? 'bg-emerald-500' : 'bg-subtle')} />
                    {row.inStock ? labels.inStock : labels.onOrder}
                  </span>
                </td>
                <td className="px-5 py-4 text-muted">{row.fits}</td>
                <td className="px-5 py-4 text-right font-semibold whitespace-nowrap tabular-nums">{row.price}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-10 text-center text-muted">
                  {labels.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

