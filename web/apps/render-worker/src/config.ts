import { z } from 'zod';

/**
 * render-worker's environment (ADR 0039), validated at start: a missing or wrong value stops the
 * process with the list of problems (never their values: some are secrets).
 */
const schema = z.object({
  NATS_URL: z.string().url(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  /** /health for probes (never published). */
  RENDER_WORKER_PORT: z.coerce.number().int().min(0).max(65535).default(3005),
  /** Browser tabs per render (Remotion `concurrency`): CPU cores / 2 is a good start. */
  RENDER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(1),
  /** One render may take minutes: JetStream waits this long without an ack (kept alive while rendering). */
  RENDER_ACK_WAIT_MS: z.coerce
    .number()
    .int()
    .min(60_000)
    .default(5 * 60_000),
  /** Local staging only: the storage's certificate is signed by a local CA the browser doesn't know. */
  RENDER_IGNORE_CERT_ERRORS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  /** The public bucket the clips go to (same as content-service's media library). */
  STORAGE_ENDPOINT: z.string().url().optional(),
  STORAGE_REGION: z.string().min(1),
  STORAGE_ACCESS_KEY_ID: z.string().min(1),
  STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
  STORAGE_PUBLIC_BUCKET: z.string().min(1),
  STORAGE_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  /** e.g. public-read on DigitalOcean Spaces; empty where the bucket itself is public. */
  STORAGE_PUBLIC_OBJECT_ACL: z.string().optional(),
  /** Where the assets of a video may come from (the CDN): every other URL is refused (no SSRF). */
  STORAGE_PUBLIC_BASE_URL: z.string().url(),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid render-worker environment:\n- ${problems.join('\n- ')}`);
  }
  return parsed.data;
}
