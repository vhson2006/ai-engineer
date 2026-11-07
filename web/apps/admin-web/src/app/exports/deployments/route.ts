import type { NextRequest } from 'next/server';
import { limitAction } from '@web/core/actions/limit';
import { listDeployments, MAX_PAGE_SIZE, type Deployment } from '@web/core/api';
import { getSessionUser } from '@web/core/auth/session';
import { toXlsx, xlsxResponse } from '@web/core/export';
import { LOCALE_COOKIE } from '@web/core/i18n/routing';
import { LIMITS } from '@web/core/security/rate-limit';
import { deploymentExportColumns, MAX_EXPORT_ROWS } from '@/features/deployments/export';
import { DEFAULT_LOCALE, isLocale } from '@/i18n/locales';
import { loadMessages } from '@/i18n/dictionaries';

/**
 * GET /exports/deployments?search=…  → deployments-YYYY-MM-DD.xlsx (the list as filtered on screen).
 * Read-only (a GET never changes state); admins only (sessions exist only with the admin role);
 * rate limited per user; generated on the server, the browser only downloads it. Not localized
 * by URL (proxy bypass): the language comes from the saved choice.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const locale = request.cookies.get(LOCALE_COOKIE)?.value ?? '';
  const t = await loadMessages(isLocale(locale) ? locale : DEFAULT_LOCALE);
  const text = (status: number, message: string) =>
    new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });

  const limited = await limitAction(LIMITS.export);
  if (limited) return text(429, t.deployments.export.tooMany);
  const user = await getSessionUser().catch(() => null);
  if (!user) return text(401, t.deployments.export.signIn);

  const search = request.nextUrl.searchParams.get('search')?.trim().slice(0, 100) || undefined;
  const rows: Deployment[] = [];
  for (let page = 1; rows.length < MAX_EXPORT_ROWS; page++) {
    const result = await listDeployments({ page, search, limit: MAX_PAGE_SIZE });
    if (!result.ok) {
      console.warn(`[export] deployments page ${page} failed: ${result.status} ${result.code} request=${result.requestId}`);
      return text(502, `${t.deployments.export.failed} (${t.common.requestId}: ${result.requestId})`);
    }
    rows.push(...result.data.data);
    if (page >= result.data.meta.totalPages || result.data.data.length === 0) break;
  }

  const xlsx = await toXlsx(rows.slice(0, MAX_EXPORT_ROWS), deploymentExportColumns(t), { sheet: t.deployments.export.sheet });
  return xlsxResponse(xlsx, `deployments-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
