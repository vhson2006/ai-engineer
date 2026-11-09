'use client';

import { Info } from 'lucide-react';
import { cn } from '@web/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@web/ui/tabs';

export interface MenuTable {
  id: string;
  title: string;
  /** Price column headers (one per price). */
  columns: string[];
  rows: { id: string; name: string; prices: (string | null)[] }[];
}

export interface MenuTab {
  id: string;
  name: string;
  note?: string;
  tables: MenuTable[];
}

/** The salon's price list, one tab per menu page. Translated and formatted on the server. */
export function MenuTabs({ tabs, labels }: { tabs: MenuTab[]; labels: { tabs: string; service: string; notOffered: string } }) {
  return (
    <Tabs defaultValue={tabs[0]?.id}>
      <TabsList
        aria-label={labels.tabs}
        className="mx-auto flex h-auto w-fit max-w-full flex-wrap justify-center gap-1.5 rounded-3xl bg-surface p-2 shadow-sm ring-1 ring-border"
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-brand data-[state=active]:text-brand-fg"
          >
            {tab.name}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="mt-10">
          <div className="space-y-8">
            {tab.tables.map((table) => (
              <PriceTable key={table.id} table={table} labels={labels} />
            ))}
          </div>
          {tab.note && (
            <p className="mt-6 flex gap-3 rounded-2xl bg-gold-soft px-5 py-4 text-sm leading-relaxed text-fg">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-gold" />
              {tab.note}
            </p>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

function PriceTable({ table, labels }: { table: MenuTable; labels: { service: string; notOffered: string } }) {
  const multi = table.columns.length > 1;
  // Long single-column lists flow into two columns on wide screens, like the printed menu.
  const twoUp = !multi && table.rows.length > 8;
  const half = Math.ceil(table.rows.length / 2);
  const groups = twoUp ? [table.rows.slice(0, half), table.rows.slice(half)] : [table.rows];

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-surface">
      <h3 className="bg-brand px-6 py-3 text-center font-display text-2xl font-semibold text-brand-fg">{table.title}</h3>
      <div className={cn('grid gap-x-12 px-5 py-4 sm:px-8 sm:py-6', twoUp && 'lg:grid-cols-2')}>
        {groups.map((rows, index) => (
          <table key={index} className="w-full">
            <thead className={cn(!multi && 'sr-only')}>
              <tr className="text-sm">
                <th scope="col" className="sr-only">
                  {labels.service}
                </th>
                {table.columns.map((column) => (
                  <th key={column} scope="col" className="w-20 pb-2 text-right font-display text-base font-semibold text-brand-strong sm:w-28">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row" className="py-2.5 text-left font-normal">
                    <span className="flex items-end gap-2">
                      <span>{row.name}</span>
                      <span aria-hidden className="mb-1.5 min-w-4 flex-1 border-b border-dotted border-subtle/60" />
                    </span>
                  </th>
                  {row.prices.map((price, column) => (
                    <td key={column} className="py-2.5 pl-2 text-right font-display text-lg font-semibold whitespace-nowrap text-brand-strong tabular-nums">
                      {price ?? (
                        <span className="text-subtle">
                          <span aria-hidden>–</span>
                          <span className="sr-only">{labels.notOffered}</span>
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
    </div>
  );
}
