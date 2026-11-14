import { NextResponse } from 'next/server';
import { findProject } from '@/content/projects';

/**
 * GET /demo/<slug>: the live demo of a sample site, a redirect to its URL in THIS environment:
 * <SLUG>_URL (Kubernetes: the overlay's urls.env through ConfigMap public-urls; dev: .env.local).
 * Read at request time, so the address is written once, in urls.env, not baked into this build.
 * A site this environment doesn't run answers 404.
 */
export function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return params.then(({ slug }) => {
    const project = findProject(slug);
    const url = project && process.env[`${project.slug.toUpperCase()}_URL`];
    if (!url || !/^https?:\/\//.test(url)) return new NextResponse(null, { status: 404 });
    return NextResponse.redirect(url, 307);
  });
}
