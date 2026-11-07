/**
 * Dependency-free on purpose: tracing.ts imports it, and tracing must start before pino, express
 * or pg are first required (otherwise they can't be instrumented).
 */

/** Probe / scrape routes: never access-logged, measured or traced (called every few seconds). */
export const UNMEASURED_PATHS: ReadonlySet<string> = new Set(['/health', '/metrics']);

/** Path without the query string: queries can carry search terms or other user input. */
export function pathOf(url: string | undefined): string {
  return (url ?? '').split('?')[0] || '/';
}
