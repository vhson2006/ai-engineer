/**
 * Video studio project statuses (ADR 0039), mirroring libs/common studio.types.ts. A module with
 * no imports: client components use it (`@web/core/api` pulls server-only code).
 */
export const STUDIO_PROJECT_STATUSES = ['draft', 'suggesting', 'writing', 'written', 'voicing', 'voiced', 'rendering', 'rendered'] as const;
export type StudioProjectStatus = (typeof STUDIO_PROJECT_STATUSES)[number];
/** A step runs in another process: the page polls until it is done. */
export const STUDIO_BUSY: readonly StudioProjectStatus[] = ['suggesting', 'writing', 'voicing', 'rendering'];
