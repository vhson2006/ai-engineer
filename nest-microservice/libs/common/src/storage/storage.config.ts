import Joi from 'joi';

/**
 * Which S3-compatible provider holds the files, from env. Same code for all of them; only the
 * endpoint, signing region and public URL differ.
 *
 *   STORAGE_PROVIDER          s3 | spaces | r2 | custom
 *   STORAGE_REGION            s3: ap-southeast-1 · spaces: sgp1 (datacenter slug) · r2: auto · custom: any
 *   STORAGE_ENDPOINT          custom only (e.g. http://localhost:8333); derived for spaces / r2
 *   STORAGE_R2_ACCOUNT_ID     r2 only
 *   STORAGE_ACCESS_KEY_ID / STORAGE_SECRET_ACCESS_KEY   a key limited to the two buckets
 *   STORAGE_PUBLIC_BUCKET / STORAGE_PRIVATE_BUCKET
 *   STORAGE_PUBLIC_BASE_URL   where public objects are served (CDN / custom domain). Default:
 *                             the provider's bucket URL (s3, spaces). Required for r2 and custom.
 *   STORAGE_FORCE_PATH_STYLE  true for local S3 servers (custom); default false
 *   STORAGE_PUBLIC_OBJECT_ACL public-read for providers that make objects public per object
 *                             (DigitalOcean Spaces + its CDN). Leave unset for S3 / R2, whose
 *                             public bucket is public as a whole (bucket policy / public domain).
 */
export const STORAGE_PROVIDERS = ['s3', 'spaces', 'r2', 'custom'] as const;
export type StorageProvider = (typeof STORAGE_PROVIDERS)[number];

export interface StorageConfig {
  provider: StorageProvider;
  /** Region used to SIGN requests (not always the datacenter: Spaces signs with us-east-1). */
  signingRegion: string;
  endpoint?: string;
  forcePathStyle: boolean;
  accessKeyId: string;
  secretAccessKey: string;
  publicBucket: string;
  privateBucket: string;
  publicBaseUrl: string;
  /** ACL sent (and signed) on uploads to the public bucket, e.g. 'public-read' for Spaces. */
  publicObjectAcl?: 'public-read';
  uploadUrlTtlSeconds: number;
  downloadUrlTtlSeconds: number;
}

/** Merge into a service's Joi validationSchema (ConfigModule.forRoot). */
export const STORAGE_ENV_SCHEMA = {
  STORAGE_PROVIDER: Joi.string()
    .valid(...STORAGE_PROVIDERS)
    .required(),
  STORAGE_REGION: Joi.string().required(),
  STORAGE_ENDPOINT: Joi.string().uri().when('STORAGE_PROVIDER', {
    is: 'custom',
    then: Joi.required(),
  }),
  STORAGE_R2_ACCOUNT_ID: Joi.string().when('STORAGE_PROVIDER', { is: 'r2', then: Joi.required() }),
  STORAGE_ACCESS_KEY_ID: Joi.string().required(),
  STORAGE_SECRET_ACCESS_KEY: Joi.string().required(),
  STORAGE_PUBLIC_BUCKET: Joi.string().required(),
  STORAGE_PRIVATE_BUCKET: Joi.string().required(),
  STORAGE_PUBLIC_BASE_URL: Joi.string()
    .uri()
    .when('STORAGE_PROVIDER', { is: Joi.valid('r2', 'custom'), then: Joi.required() }),
  STORAGE_FORCE_PATH_STYLE: Joi.boolean().default(false),
  STORAGE_PUBLIC_OBJECT_ACL: Joi.string().valid('public-read'),
  STORAGE_UPLOAD_URL_TTL_SECONDS: Joi.number().integer().min(60).max(3600).default(900),
  STORAGE_DOWNLOAD_URL_TTL_SECONDS: Joi.number().integer().min(30).max(3600).default(300),
};

type EnvReader = (key: string) => string | undefined;

export function storageConfigFromEnv(env: EnvReader): StorageConfig {
  const required = (key: string): string => {
    const value = env(key);
    if (!value) throw new Error(`Missing environment variable ${key}`);
    return value;
  };
  const provider = required('STORAGE_PROVIDER') as StorageProvider;
  const region = required('STORAGE_REGION');
  const publicBucket = required('STORAGE_PUBLIC_BUCKET');
  const trimSlash = (url: string) => url.replace(/\/+$/, '');

  let endpoint: string | undefined;
  let signingRegion = region;
  let defaultPublicBaseUrl: string | undefined;
  switch (provider) {
    case 's3':
      defaultPublicBaseUrl = `https://${publicBucket}.s3.${region}.amazonaws.com`;
      break;
    case 'spaces':
      endpoint = `https://${region}.digitaloceanspaces.com`;
      signingRegion = 'us-east-1'; // Spaces ignores it, but SigV4 needs a region
      defaultPublicBaseUrl = `https://${publicBucket}.${region}.cdn.digitaloceanspaces.com`;
      break;
    case 'r2':
      endpoint = `https://${required('STORAGE_R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`;
      signingRegion = 'auto';
      break;
    case 'custom':
      endpoint = required('STORAGE_ENDPOINT');
      break;
    default:
      throw new Error(`Unknown STORAGE_PROVIDER "${String(provider)}"`);
  }

  const publicBaseUrl = env('STORAGE_PUBLIC_BASE_URL') ?? defaultPublicBaseUrl;
  if (!publicBaseUrl) throw new Error(`STORAGE_PUBLIC_BASE_URL is required for ${provider}`);

  return {
    provider,
    signingRegion,
    endpoint,
    forcePathStyle: env('STORAGE_FORCE_PATH_STYLE') === 'true' || provider === 'custom',
    accessKeyId: required('STORAGE_ACCESS_KEY_ID'),
    secretAccessKey: required('STORAGE_SECRET_ACCESS_KEY'),
    publicBucket,
    privateBucket: required('STORAGE_PRIVATE_BUCKET'),
    publicBaseUrl: trimSlash(publicBaseUrl),
    publicObjectAcl: env('STORAGE_PUBLIC_OBJECT_ACL') === 'public-read' ? 'public-read' : undefined,
    uploadUrlTtlSeconds: Number(env('STORAGE_UPLOAD_URL_TTL_SECONDS') ?? 900),
    downloadUrlTtlSeconds: Number(env('STORAGE_DOWNLOAD_URL_TTL_SECONDS') ?? 300),
  };
}
