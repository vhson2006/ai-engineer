import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { ensureBrowser, RenderInternals, renderMedia, selectComposition } from '@remotion/renderer';
import type { StudioVideoProps } from '@web/video';

/** A file of a render, in its temporary folder. */
export interface RenderedFile {
  file: string;
  sizeBytes: number;
}

export interface RenderOutput {
  /** Full quality (1080×1920, crf 20): for social networks. */
  video: RenderedFile;
  /** 720 wide, crf 26, faststart: for web pages. */
  web: RenderedFile;
  /** A JPEG of an early frame, 720 wide: the web video's poster. */
  poster: RenderedFile;
  durationMs: number;
  cleanup: () => Promise<void>;
}

/** The web version and the poster are 720 wide (the height follows, even for H.264). */
const WEB_SCALE = 'scale=720:-2';

/**
 * Remotion (ADR 0039): the compositions of @web/video are bundled ONCE at start (the same code the
 * admin previews), then each render opens them in headless Chrome and encodes an H.264 MP4 into a
 * temporary folder, deleted afterwards. The web MP4 and the poster are cut from that MP4 with the
 * ffmpeg Remotion ships (no second render: one render, one count for the Remotion license).
 */
export class Renderer {
  private serveUrl?: string;

  constructor(
    private readonly concurrency: number,
    private readonly ignoreCertificateErrors = false,
  ) {}

  /** Downloads the headless browser if needed and bundles the compositions. */
  async start(): Promise<void> {
    await ensureBrowser();
    const entryPoint = fileURLToPath(import.meta.resolve('@web/video/entry'));
    this.serveUrl = await bundle({ entryPoint });
  }

  async render(composition: string, props: StudioVideoProps, onProgress: (progress: number) => void): Promise<RenderOutput> {
    if (!this.serveUrl) throw new Error('renderer not started');
    const dir = await mkdtemp(join(tmpdir(), 'render-'));
    const file = join(dir, 'video.mp4');
    const web = join(dir, 'web.mp4');
    const poster = join(dir, 'poster.jpg');
    try {
      const chromiumOptions = { ignoreCertificateErrors: this.ignoreCertificateErrors };
      const selected = await selectComposition({ serveUrl: this.serveUrl, id: composition, inputProps: props, chromiumOptions });
      await renderMedia({
        serveUrl: this.serveUrl,
        composition: selected,
        inputProps: props,
        codec: 'h264',
        // Social networks re-encode anyway; this keeps files small and sharp text.
        crf: 20,
        audioCodec: 'aac',
        outputLocation: file,
        concurrency: this.concurrency,
        chromiumOptions,
        onProgress: ({ progress }) => onProgress(progress),
      });
      const durationMs = Math.round((selected.durationInFrames / selected.fps) * 1000);
      // prettier-ignore
      await ffmpeg(['-y', '-i', file, '-vf', WEB_SCALE, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26',
        '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', web]);
      // The first scene's text is in place after ~1 s; never past the middle of a short clip.
      const at = (Math.min(1200, durationMs / 2) / 1000).toFixed(2);
      await ffmpeg(['-y', '-ss', at, '-i', file, '-frames:v', '1', '-vf', WEB_SCALE, '-q:v', '4', poster]);
      return {
        video: await sized(file),
        web: await sized(web),
        poster: await sized(poster),
        durationMs,
        cleanup: () => rm(dir, { recursive: true, force: true }),
      };
    } catch (error) {
      await rm(dir, { recursive: true, force: true });
      throw error;
    }
  }
}

async function sized(file: string): Promise<RenderedFile> {
  return { file, sizeBytes: (await stat(file)).size };
}

/**
 * The ffmpeg binary of @remotion/compositor-* (pinned with Remotion). RenderInternals is not a
 * public API: check this call on every Remotion upgrade.
 */
async function ffmpeg(args: string[]): Promise<void> {
  await RenderInternals.callFf({
    bin: 'ffmpeg',
    args: ['-loglevel', 'error', ...args],
    indent: false,
    logLevel: 'error',
    binariesDirectory: null,
    cancelSignal: undefined,
  });
}
