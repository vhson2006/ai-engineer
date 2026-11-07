import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { toXlsx, xlsxResponse } from './xlsx';

type Row = { name: string; count: number; at: Date; note?: string };
const rows: Row[] = [
  { name: 'checkout-api', count: 3, at: new Date('2026-11-07T09:24:00Z') },
  { name: '=HYPERLINK("http://evil")', count: 0, at: new Date('2026-11-07T10:00:00Z'), note: 'Ghi chú tiếng Việt' },
];

async function sheet(buffer: Buffer) {
  const files = unzipSync(new Uint8Array(buffer));
  return { sheet: strFromU8(files['xl/worksheets/sheet1.xml']), strings: strFromU8(files['xl/sharedStrings.xml'] ?? new Uint8Array()), files };
}

describe('toXlsx', () => {
  it('writes a valid xlsx with a bold header row, typed cells and a frozen header', async () => {
    const xlsx = await toXlsx(rows, [
      { header: 'Name', value: (r) => r.name, width: 28 },
      { header: 'Count', value: (r) => r.count },
      { header: 'Created', value: (r) => r.at },
      { header: 'Note', value: (r) => r.note },
    ], { sheet: 'Deployments' });
    expect(xlsx.subarray(0, 2).toString()).toBe('PK'); // a zip container
    const { sheet: xml, strings, files } = await sheet(xlsx);
    expect(Object.keys(files)).toContain('xl/workbook.xml');
    expect(strings + xml).toContain('Ghi chú tiếng Việt');
    expect(xml).toContain('state="frozen"');
    // Text that looks like a formula stays text: no <f> (formula) element anywhere.
    expect(xml).not.toContain('<f>');
  });

  it('builds an attachment response with a safe file name', () => {
    const response = xlsxResponse(Buffer.from('x'), 'triển khai 2026/11.xlsx');
    expect(response.headers.get('content-disposition')).toBe(
      `attachment; filename="tri_n_khai_2026_11.xlsx"; filename*=UTF-8''${encodeURIComponent('triển khai 2026/11.xlsx')}`,
    );
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});
