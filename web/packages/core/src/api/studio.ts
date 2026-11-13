import type { MediaImage } from './content';
import { apiFetch } from './fetch';
import type { StudioProjectStatus } from './studio-status';
import type { Paginated } from './types';

/*
 * Video studio (ADR 0039): /api/content/sites/{siteId}/studio. Shapes mirror nest-microservice
 * libs/common/src/contracts/content/studio.{templates,types,dto}.ts: change them together.
 * The composition props are the ones @web/video renders (StudioVideoProps).
 */

export type StudioLocale = 'vi' | 'en';
export type Localized = Record<StudioLocale, string>;

export interface StudioTemplate {
  id: string;
  version: number;
  name: Localized;
  description: Localized;
  aspect: '9:16';
  seconds: [number, number];
  excludeSites: string[];
  /** `optional`: the admin may leave the voice out (a silent video, no voice step). */
  narration: 'required' | 'optional';
  endCard?: boolean;
  instructions: string;
  images: { id: string; label: Localized; hint: Localized; required: boolean }[];
  avatars: { id: string; label: Localized }[];
  speakers: { id: string; label: Localized; avatar?: string }[];
  facts: {
    id: string;
    label: Localized;
    hint: Localized;
    kind: 'text' | 'article';
    required: boolean;
    maxLength: number;
    excludeSites?: string[];
  }[];
  scenes: {
    id: string;
    purpose: string;
    image?: string;
    avatar?: string;
    speaker: string;
    maxWords: number;
    onScreenMaxChars: number;
    layout?: StudioLayout;
    images?: string[];
    items?: string;
    extra?: string;
    requires?: string;
    seconds?: number;
  }[];
}

export type StudioLayout = 'image' | 'cover' | 'grid' | 'cards' | 'prices' | 'visit';

export interface StudioVoice {
  id: string;
  label: Localized;
}

export { STUDIO_BUSY, STUDIO_PROJECT_STATUSES, type StudioProjectStatus } from './studio-status';

export interface StudioInputs {
  images: Record<string, string>;
  avatars: Record<string, string>;
  voices: Record<string, string>;
  facts: Record<string, string>;
  /** With a voice: always for `required` narration; for `optional`, the admin's choice. */
  narration?: boolean;
}

export interface StudioScriptScene {
  id: string;
  voice: string;
  onScreen: string;
}

export interface StudioScript {
  hooks: string[];
  scenes: StudioScriptScene[];
  caption: string;
  hashtags: string[];
}

export type StudioWarningCode = 'too_many_words' | 'on_screen_too_long' | 'banned_phrase' | 'unknown_number' | 'missing_scene';

export interface StudioWarning {
  code: StudioWarningCode;
  scene?: string;
  detail: string;
}

export interface StudioVideo {
  renderId: string;
  /** Full quality (1080×1920), for social networks. */
  url: string;
  sizeBytes: number;
  /** The light MP4 (720 wide) and its poster for web pages and lists; null for older renders. */
  webUrl: string | null;
  webSizeBytes: number | null;
  posterUrl: string | null;
  durationMs: number;
  renderedAt: string;
}

export interface StudioCompositionProps {
  templateId: string;
  fps: number;
  width: number;
  height: number;
  brand: {
    name: string;
    tagline: string | null;
    phone: string | null;
    callToAction: string | null;
    footerNote: string | null;
    primaryColor: string;
    accentColor: string;
    logoUrl: string | null;
  };
  scenes: {
    id: string;
    imageUrl: string | null;
    avatarUrl: string | null;
    avatarMode: 'full' | 'corner' | null;
    voiceUrl: string | null;
    voice: string;
    onScreen: string;
    durationInFrames: number;
    layout?: StudioLayout;
    gallery?: { url: string; label: string | null }[];
    items?: { title: string | null; text: string | null; highlight?: boolean; group?: 'address' | 'hours' }[];
    website?: string | null;
    labels?: Record<string, string>;
  }[];
  endCardFrames: number;
}

export interface StudioProjectSummary {
  id: string;
  siteId: string;
  templateId: string;
  templateVersion: number;
  title: string;
  language: string;
  status: StudioProjectStatus;
  brief: string | null;
  video: StudioVideo | null;
  /** script_provider_unavailable, voice_provider_refused, render_render_failed… */
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudioProject extends StudioProjectSummary {
  inputs: StudioInputs;
  script: StudioScript | null;
  warnings: StudioWarning[];
  voice: { lines: { id: string; url: string; durationMs: number }[] } | null;
  preview: StudioCompositionProps | null;
}

export interface StudioAvatar {
  id: string;
  siteId: string;
  name: string;
  voice: string;
  consentNote: string;
  image: MediaImage;
  createdAt: string;
  updatedAt: string;
}

export interface StudioBrandKit {
  siteId: string;
  brandName: string;
  tagline: string | null;
  phone: string | null;
  callToAction: string | null;
  tone: string | null;
  footerNote: string | null;
  bannedPhrases: string[];
  primaryColor: string;
  accentColor: string;
  logo: MediaImage | null;
  updatedAt: string | null;
}

export interface StudioBrandKitInput {
  brandName: string;
  tagline: string | null;
  phone: string | null;
  callToAction: string | null;
  tone: string | null;
  footerNote: string | null;
  bannedPhrases: string[];
  primaryColor: string;
  accentColor: string;
  logoMediaId: string | null;
}

const studio = (siteId: string) => `/api/content/sites/${encodeURIComponent(siteId)}/studio`;
const project = (siteId: string, id: string, suffix = '') => `${studio(siteId)}/projects/${encodeURIComponent(id)}${suffix}`;
const avatar = (siteId: string, id: string) => `${studio(siteId)}/avatars/${encodeURIComponent(id)}`;

/** The templates this site may use, and the voices. */
export function getStudioCatalog(siteId: string) {
  return apiFetch<{ templates: StudioTemplate[]; voices: StudioVoice[] }>(`${studio(siteId)}/templates`);
}

export function getStudioBrandKit(siteId: string) {
  return apiFetch<StudioBrandKit>(`${studio(siteId)}/brand`);
}

export function saveStudioBrandKit(siteId: string, input: StudioBrandKitInput) {
  return apiFetch<StudioBrandKit>(`${studio(siteId)}/brand`, { method: 'PUT', body: input });
}

export function listStudioAvatars(siteId: string) {
  return apiFetch<StudioAvatar[]>(`${studio(siteId)}/avatars`);
}

/** Not retried: wrap in `once()`. */
export function createStudioAvatar(siteId: string, input: { name: string; mediaId: string; voice: string; consentNote: string }) {
  return apiFetch<StudioAvatar>(`${studio(siteId)}/avatars`, { method: 'POST', body: input });
}

export function updateStudioAvatar(
  siteId: string,
  id: string,
  input: { name?: string; mediaId?: string; voice?: string; consentNote?: string },
) {
  return apiFetch<StudioAvatar>(avatar(siteId, id), { method: 'PATCH', body: input });
}

export function deleteStudioAvatar(siteId: string, id: string) {
  return apiFetch<void>(avatar(siteId, id), { method: 'DELETE' });
}

/** Projects, latest first; `rendered`: only the finished videos (the media library's Video section). */
export function listStudioProjects(siteId: string, query: { page?: number; limit?: number; rendered?: boolean } = {}) {
  return apiFetch<Paginated<StudioProjectSummary>>(`${studio(siteId)}/projects`, {
    query: { page: query.page, limit: query.limit, rendered: query.rendered === undefined ? undefined : String(query.rendered) },
  });
}

/** Not retried: wrap in `once()`. */
export function createStudioProject(
  siteId: string,
  input: { templateId: string; title: string; language: string; brief?: string | null; inputs: StudioInputs },
) {
  return apiFetch<StudioProject>(`${studio(siteId)}/projects`, { method: 'POST', body: input });
}

export function getStudioProject(siteId: string, id: string) {
  return apiFetch<StudioProject>(project(siteId, id));
}

export function updateStudioProject(
  siteId: string,
  id: string,
  input: { title?: string; brief?: string | null; inputs?: StudioInputs; script?: StudioScript },
) {
  return apiFetch<StudioProject>(project(siteId, id), { method: 'PATCH', body: input });
}

export function deleteStudioProject(siteId: string, id: string) {
  return apiFetch<void>(project(siteId, id), { method: 'DELETE' });
}

/** 202: the AI writes the script (poll the project). */
export function requestStudioScript(siteId: string, id: string) {
  return apiFetch<StudioProject>(project(siteId, id, '/script'), { method: 'POST' });
}

/** 202: every line spoken with its voice (poll the project). */
export function requestStudioVoice(siteId: string, id: string) {
  return apiFetch<StudioProject>(project(siteId, id, '/voice'), { method: 'POST' });
}

/** 202: the MP4 is rendered (poll the project); counted in the site's monthly quota. */
export function requestStudioRender(siteId: string, id: string) {
  return apiFetch<StudioProject>(project(siteId, id, '/render'), { method: 'POST' });
}
