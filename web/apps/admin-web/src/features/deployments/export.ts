import type { Deployment } from '@web/core/api';
import type { ExportColumn } from '@web/core/export';
import type { Messages } from '@/i18n/dictionaries';

/** A cap on one export: 50 API pages of 100 rows. */
export const MAX_EXPORT_ROWS = 5000;

/** The columns of the deployments Excel export, in the user's language. */
export function deploymentExportColumns(t: Messages): ExportColumn<Deployment>[] {
  const d = t.deployments;
  return [
    { header: d.columns.name, value: (row) => row.name, width: 28 },
    { header: d.export.version, value: (row) => row.version, width: 14 },
    { header: d.columns.environment, value: (row) => row.environment, width: 14 },
    { header: d.columns.status, value: (row) => t.overview.status[row.status] ?? row.status, width: 14 },
    { header: d.columns.owner, value: (row) => row.createdBy, width: 38 },
    { header: d.columns.created, value: (row) => new Date(row.createdAt), width: 20 },
    { header: d.export.description, value: (row) => row.description, width: 50 },
    { header: d.export.id, value: (row) => row.id, width: 38 },
  ];
}
