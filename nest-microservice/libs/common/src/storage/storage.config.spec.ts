import { contentDisposition } from './s3-object-storage';
import { storageConfigFromEnv } from './storage.config';

const base = {
  STORAGE_ACCESS_KEY_ID: 'k',
  STORAGE_SECRET_ACCESS_KEY: 's',
  STORAGE_PUBLIC_BUCKET: 'pub',
  STORAGE_PRIVATE_BUCKET: 'priv',
};
const config = (env: Record<string, string>) =>
  storageConfigFromEnv((k) => ({ ...base, ...env })[k]);

describe('[storage config] (unit)', () => {
  it('DigitalOcean Spaces: regional endpoint, us-east-1 signing, Spaces CDN by default', () => {
    expect(config({ STORAGE_PROVIDER: 'spaces', STORAGE_REGION: 'sgp1' })).toMatchObject({
      endpoint: 'https://sgp1.digitaloceanspaces.com',
      signingRegion: 'us-east-1',
      forcePathStyle: false,
      publicBaseUrl: 'https://pub.sgp1.cdn.digitaloceanspaces.com',
    });
  });

  it('AWS S3: no endpoint, bucket URL by default, custom CDN when given', () => {
    expect(config({ STORAGE_PROVIDER: 's3', STORAGE_REGION: 'ap-southeast-1' })).toMatchObject({
      endpoint: undefined,
      signingRegion: 'ap-southeast-1',
      publicBaseUrl: 'https://pub.s3.ap-southeast-1.amazonaws.com',
    });
    expect(
      config({
        STORAGE_PROVIDER: 's3',
        STORAGE_REGION: 'x',
        STORAGE_PUBLIC_BASE_URL: 'https://cdn.example.com/',
      }).publicBaseUrl,
    ).toBe('https://cdn.example.com');
  });

  it('Cloudflare R2: account endpoint, region auto, public URL required', () => {
    expect(
      config({
        STORAGE_PROVIDER: 'r2',
        STORAGE_REGION: 'auto',
        STORAGE_R2_ACCOUNT_ID: 'abc',
        STORAGE_PUBLIC_BASE_URL: 'https://files.example.com',
      }),
    ).toMatchObject({ endpoint: 'https://abc.r2.cloudflarestorage.com', signingRegion: 'auto' });
    expect(() =>
      config({ STORAGE_PROVIDER: 'r2', STORAGE_REGION: 'auto', STORAGE_R2_ACCOUNT_ID: 'abc' }),
    ).toThrow('STORAGE_PUBLIC_BASE_URL is required');
  });

  it('per-object public ACL only when asked (Spaces)', () => {
    expect(
      config({ STORAGE_PROVIDER: 'spaces', STORAGE_REGION: 'sgp1' }).publicObjectAcl,
    ).toBeUndefined();
    expect(
      config({
        STORAGE_PROVIDER: 'spaces',
        STORAGE_REGION: 'sgp1',
        STORAGE_PUBLIC_OBJECT_ACL: 'public-read',
      }).publicObjectAcl,
    ).toBe('public-read');
  });

  it('custom (local S3): path-style addressing', () => {
    expect(
      config({
        STORAGE_PROVIDER: 'custom',
        STORAGE_REGION: 'us-east-1',
        STORAGE_ENDPOINT: 'http://localhost:8333',
        STORAGE_PUBLIC_BASE_URL: 'http://localhost:8333/pub',
      }),
    ).toMatchObject({ forcePathStyle: true, endpoint: 'http://localhost:8333' });
  });

  it('Content-Disposition: ASCII fallback + exact UTF-8 name (RFC 6266 / 8187)', () => {
    expect(contentDisposition('báo cáo "Q3".pdf')).toBe(
      `attachment; filename="b_o c_o _Q3_.pdf"; filename*=UTF-8''b%C3%A1o%20c%C3%A1o%20%22Q3%22.pdf`,
    );
    expect(contentDisposition('a.png', true)).toMatch(/^inline; /);
  });
});
