import { NextResponse, type NextRequest } from 'next/server';
import { getDownloadLink } from '@web/core/api';
import { appUrl } from '@web/core/auth/oidc';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /files/<id>/download[?disposition=inline]   e.g. <a href={`/files/${file.id}/download`}>
 *
 * A plain link the browser can follow (it can't attach the Bearer token itself). Server side, with
 * the user's session, we ask the API for a short-lived link, then send the browser there with a
 * 302: the bytes come straight from object storage (S3 / Spaces / R2), never through Next.js or
 * KrakenD. The redirect is done HERE because KrakenD CE would follow a redirect from the API and
 * stream the file itself.
 *
 * GET only, no side effects: nothing to protect against CSRF. The link itself is the secret, so
 * it's never cached (the global Referrer-Policy already sends only our origin cross-site).
 */
export async function GET(request: NextRequest, ctx: RouteContext<'/files/[id]/download'>) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return problem(404, 'File not found');

  const disposition =
    request.nextUrl.searchParams.get('disposition') === 'inline' ? 'inline' : 'attachment';
  const result = await getDownloadLink(id, disposition);

  if (result.ok) {
    const response = NextResponse.redirect(result.data.url, 302);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
  if (result.status === 401) {
    return NextResponse.redirect(appUrl(`/login?returnTo=/files/${id}/download`));
  }
  return problem(
    result.status === 403 || result.status === 404 ? 404 : result.status,
    result.status === 404 || result.status === 403
      ? 'File not found'
      : `${result.message} (request id ${result.requestId})`,
  );
}

function problem(status: number, message: string) {
  return new NextResponse(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
