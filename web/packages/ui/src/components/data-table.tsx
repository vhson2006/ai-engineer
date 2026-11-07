'use client';

import { createColumnHelper, tableFeatures, useTable, type ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * Tables of server data (TanStack Table v9, headless). The page fetches on the server and passes
 * `data`; paging, search and sort live in the URL (Pagination + nuqs), so the table itself only
 * renders rows. Columns are defined in a client module (cell renderers are functions):
 *
 *   'use client';
 *   const column = dataTableColumnHelper<Deployment>();
 *   export const columns = column.columns([
 *     column.accessor('name', { header: () => t.name }),
 *     column.display({ id: 'actions', cell: ({ row }) => <RowMenu row={row.original} /> }),
 *   ]);
 */
export const dataTableFeatures = tableFeatures({});
type Features = typeof dataTableFeatures;

export type DataTableColumn<TData extends object> = ColumnDef<Features, TData, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function dataTableColumnHelper<TData extends object>() {
  return createColumnHelper<Features, TData>();
}

export interface DataTableProps<TData extends object> {
  /** Stable (module scope or memoized): a new array every render rebuilds the rows. */
  columns: DataTableColumn<TData>[];
  data: TData[];
  getRowId?: (row: TData) => string;
  /** Shown instead of rows when `data` is empty. */
  empty: ReactNode;
  /** Extra classes per column id (alignment, width, nowrap…). */
  columnClassName?: Partial<Record<string, string>>;
  /** Accessible name of the table. */
  caption?: string;
  className?: string;
}

export function DataTable<TData extends object>({ columns, data, getRowId, empty, columnClassName = {}, caption, className }: DataTableProps<TData>) {
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
  });

  return (
    <div data-slot="data-table" className={cn('overflow-x-auto', className)}>
      <table className="w-full text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-surface-2 text-xs uppercase tracking-wider text-subtle">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th key={header.id} scope="col" className={cn('whitespace-nowrap px-5 py-3 font-medium', columnClassName[header.column.id])}>
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border">
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={table.getAllLeafColumns().length} className="px-5 py-14 text-center text-muted">
                {empty}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-surface-2/60">
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className={cn('px-5 py-3', columnClassName[cell.column.id])}>
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
