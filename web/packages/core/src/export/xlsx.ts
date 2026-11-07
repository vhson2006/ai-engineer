import 'server-only';
import writeExcelFile, { type SheetData } from 'write-excel-file/node';

/**
 * Excel export, generated on the server (the browser only downloads the file):
 *
 *   const xlsx = await toXlsx(rows, [
 *     { header: t.name, value: (row) => row.name, width: 28 },
 *     { header: t.created, value: (row) => new Date(row.createdAt), width: 20 },
 *   ], { sheet: 'Deployments' });
 *   return xlsxResponse(xlsx, 'deployments.xlsx');
 *
 * Values are written as typed cells (string, number, date, boolean), never as formulas: a cell
 * text starting with "=" stays text (no formula injection).
 */
export type ExportValue = string | number | boolean | Date | null | undefined;

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => ExportValue;
  /** Column width in characters (default 18). */
  width?: number;
  /** Excel number/date format, e.g. 'yyyy-mm-dd hh:mm' (default for dates) or '#,##0'. */
  format?: string;
}

export async function toXlsx<T>(rows: readonly T[], columns: readonly ExportColumn<T>[], options: { sheet?: string } = {}): Promise<Buffer> {
  const header = columns.map((column) => ({ value: column.header, fontWeight: 'bold' as const }));
  const body = rows.map((row) =>
    columns.map((column) => {
      const value = column.value(row);
      if (value === null || value === undefined || value === '') return null;
      if (value instanceof Date) return { value, format: column.format ?? 'yyyy-mm-dd hh:mm' };
      return column.format ? { value, format: column.format } : { value };
    }),
  );
  const data = [header, ...body] as SheetData;
  return writeExcelFile(data, {
    sheet: options.sheet?.slice(0, 31), // Excel's sheet name limit
    columns: columns.map((column) => ({ width: column.width ?? 18 })),
    stickyRowsCount: 1,
  }).toBuffer();
}

/** A download response: attachment + safe file name (RFC 6266), never cached by shared caches. */
export function xlsxResponse(xlsx: Buffer, fileName: string): Response {
  const safe = fileName.replace(/[^\w.-]+/g, '_');
  return new Response(new Uint8Array(xlsx), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
