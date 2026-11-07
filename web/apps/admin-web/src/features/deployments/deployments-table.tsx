'use client';

import type { Deployment, DeploymentStatus } from '@web/core/api';
import { Badge } from '@web/ui/badge';
import { DataTable, dataTableColumnHelper } from '@web/ui/data-table';
import { useMemo } from 'react';

const STATUS_TONE: Record<DeploymentStatus, 'warning' | 'info' | 'success' | 'danger'> = {
  pending: 'warning',
  running: 'info',
  succeeded: 'success',
  failed: 'danger',
};

export interface DeploymentsTableLabels {
  columns: { name: string; environment: string; status: string; owner: string; created: string };
  status: Record<DeploymentStatus, string>;
  empty: string;
  caption: string;
}

const column = dataTableColumnHelper<Deployment>();

/** Deployments of every owner (admins see all). Data comes from the server page. */
export function DeploymentsTable({ data, labels, intlLocale }: { data: Deployment[]; labels: DeploymentsTableLabels; intlLocale: string }) {
  // Stable while the language doesn't change (TanStack Table: unstable columns rebuild every row).
  const columns = useMemo(() => {
    const date = new Intl.DateTimeFormat(intlLocale, { dateStyle: 'medium', timeStyle: 'short' });
    return column.columns([
      column.accessor('name', {
        header: () => labels.columns.name,
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="font-mono text-xs text-subtle">{row.original.version}</p>
          </div>
        ),
      }),
      column.accessor('environment', {
        header: () => labels.columns.environment,
        cell: ({ getValue }) => <Badge tone="neutral">{getValue()}</Badge>,
      }),
      column.accessor('status', {
        header: () => labels.columns.status,
        cell: ({ getValue }) => {
          const status = getValue();
          return (
            <Badge tone={STATUS_TONE[status]}>
              <span aria-hidden className="size-1.5 rounded-full bg-current" />
              {labels.status[status]}
            </Badge>
          );
        },
      }),
      column.accessor('createdBy', {
        header: () => labels.columns.owner,
        cell: ({ getValue }) => {
          const owner = getValue();
          return (
            <span className="font-mono text-xs text-muted" title={owner ?? undefined}>
              {owner ? `${owner.slice(0, 8)}…` : '—'}
            </span>
          );
        },
      }),
      column.accessor('createdAt', {
        header: () => labels.columns.created,
        cell: ({ getValue }) => <span className="whitespace-nowrap text-muted">{date.format(new Date(getValue()))}</span>,
      }),
    ]);
  }, [labels, intlLocale]);

  return (
    <DataTable
      columns={columns}
      data={data}
      getRowId={(row) => row.id}
      empty={labels.empty}
      caption={labels.caption}
      columnClassName={{ createdAt: 'text-right', createdBy: 'hidden md:table-cell' }}
    />
  );
}
