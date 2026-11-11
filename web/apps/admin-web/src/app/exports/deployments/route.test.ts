import { strFromU8, unzipSync } from 'fflate';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ listDeployments: vi.fn(), MAX_PAGE_SIZE: 100 }));
vi.mock('@web/core/api', () => api);
const limit = vi.hoisted(() => ({ limitAction: vi.fn() }));
vi.mock('@web/core/actions/limit', () => limit);
const session = vi.hoisted(() => ({ getSessionUser: vi.fn() }));
vi.mock('@web/core/auth/session', () => session);

const { GET } = await import('./route');

const deployment = (n: number) => ({
  id: `id-${n}`, name: `app-${n}`, version: '1.0.0', environment: 'staging', status: 'running',
  description: null, createdBy: 'user-1', createdAt: '2026-11-07T09:00:00Z', updatedAt: '2026-11-07T09:00:00Z',
});
const page = (items: unknown[], pageNo: number, totalPages: number) => ({
  ok: true, data: { data: items, meta: { page: pageNo, limit: 100, total: totalPages * 100, totalPages } },
});
const request = (query = '', locale = 'vi') =>
  new NextRequest(new URL(`http://admin.test/exports/deployments${query}`), { headers: { cookie: `NEXT_LOCALE=${locale}` } });

beforeEach(() => {
  vi.resetAllMocks();
  limit.limitAction.mockResolvedValue(null);
  session.getSessionUser.mockResolvedValue({ id: 'user-1', name: 'Alice', username: 'alice', roles: [] });
});

describe('GET /exports/deployments', () => {
  it('exports every page of the filtered list as xlsx, headers in the user language', async () => {
    api.listDeployments
      .mockResolvedValueOnce(page([deployment(1), deployment(2)], 1, 2))
      .mockResolvedValueOnce(page([deployment(3)], 2, 2));

    const response = await GET(request('?search=%20app%20'));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('spreadsheetml');
    expect(response.headers.get('content-disposition')).toMatch(/^attachment; filename="deployments-\d{4}-\d{2}-\d{2}\.xlsx"/);
    expect(api.listDeployments).toHaveBeenNthCalledWith(1, { page: 1, search: 'app', limit: 100 });
    expect(api.listDeployments).toHaveBeenNthCalledWith(2, { page: 2, search: 'app', limit: 100 });
    const files = unzipSync(new Uint8Array(await response.arrayBuffer()));
    const text = strFromU8(files['xl/worksheets/sheet1.xml']) + strFromU8(files['xl/sharedStrings.xml'] ?? new Uint8Array());
    expect(text).toContain('Phiên bản'); // Vietnamese header
    expect(text).toContain('đang chạy'); // translated status
    expect(text).toContain('app-3');
  });

  it('stops at the row cap', async () => {
    api.listDeployments.mockImplementation(async ({ page: p }: { page: number }) =>
      page(Array.from({ length: 100 }, (_, i) => deployment(p * 100 + i)), p, 999),
    );
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(api.listDeployments).toHaveBeenCalledTimes(50);
  });

  it('refuses when rate limited or signed out, without calling the API', async () => {
    limit.limitAction.mockResolvedValueOnce({ ok: false, code: 'rate_limited', message: 'x', retryAfterS: 60 });
    expect((await GET(request())).status).toBe(429);
    session.getSessionUser.mockResolvedValueOnce(null);
    expect((await GET(request('', 'en'))).status).toBe(401);
    expect(api.listDeployments).not.toHaveBeenCalled();
  });

  it('answers 502 with the request id when the API fails', async () => {
    api.listDeployments.mockResolvedValueOnce({ ok: false, status: 503, code: 'unavailable', message: 'x', requestId: 'req-7' });
    const response = await GET(request('', 'en'));
    expect(response.status).toBe(502);
    expect(await response.text()).toContain('req-7');
  });
});
