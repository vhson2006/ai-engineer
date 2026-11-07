import { describe, expect, it } from 'vitest';
import { acceptFor, checkFile, contentTypeOf, fileDownloadPath } from './index';

describe('files helpers', () => {
  it('contentTypeOf: browser type when allowed, else the extension', () => {
    expect(contentTypeOf('deployment-attachment', { name: 'a.pdf', type: 'application/pdf' })).toBe('application/pdf');
    expect(contentTypeOf('deployment-attachment', { name: 'a.CSV', type: 'application/vnd.ms-excel' })).toBe('text/csv');
    expect(contentTypeOf('deployment-attachment', { name: 'a.zip', type: 'application/x-zip-compressed' })).toBe('application/zip');
    expect(contentTypeOf('deployment-attachment', { name: 'server.log', type: '' })).toBe('text/plain');
    expect(contentTypeOf('deployment-attachment', { name: 'x', type: '' })).toBe('application/octet-stream');
  });

  it('checkFile: size and type per purpose', () => {
    expect(checkFile('public-image', { name: 'a.png', type: 'image/png', size: 1000 })).toBeNull();
    expect(checkFile('public-image', { name: 'a.pdf', type: 'application/pdf', size: 1000 })).toMatch(/isn't accepted/);
    expect(checkFile('public-image', { name: 'a.png', type: 'image/png', size: 6 * 1024 * 1024 })).toMatch(/too large \(6\.0 MB\).*5\.0 MB/);
    expect(checkFile('deployment-attachment', { name: 'x.svg', type: 'image/svg+xml', size: 10 })).not.toBeNull();
  });

  it('acceptFor lists media types and extensions', () => {
    expect(acceptFor('public-image')).toContain('image/png');
    expect(acceptFor('public-image')).toContain('.jpeg');
    expect(acceptFor('public-image')).not.toContain('.pdf');
  });

  it('fileDownloadPath', () => {
    expect(fileDownloadPath('abc')).toBe('/files/abc/download');
    expect(fileDownloadPath('abc', { inline: true })).toBe('/files/abc/download?disposition=inline');
    expect(fileDownloadPath('../x')).toBe('/files/..%2Fx/download');
  });
});
