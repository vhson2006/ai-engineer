import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Protects what portfolio-web stores in Redis, so that someone who can READ Redis (an operator,
 * RedisInsight, a backup, another compromised client) can't use it:
 *
 *  - values are encrypted with AES-256-GCM (confidentiality + integrity), bound to their key
 *    as additional authenticated data, so a value can't be moved to another session's key;
 *  - keys use a SHA-256 of the session id, never the id itself: the id is the cookie value,
 *    so a readable key name would let anyone log in as that user.
 *
 * SESSION_ENCRYPTION_KEY: 32 random bytes, base64url. Changing it signs everybody out.
 */
const VERSION = 'v1';

let cachedKey: Buffer | undefined;

function encryptionKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.SESSION_ENCRYPTION_KEY;
  const key = raw ? Buffer.from(raw, 'base64url') : undefined;
  if (!key || key.length !== 32) {
    throw new Error(
      'SESSION_ENCRYPTION_KEY must be 32 random bytes in base64url. Generate one with: ' +
        `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`,
    );
  }
  cachedKey = key;
  return key;
}

/** Redis key name for a secret id (session id, login transaction id). */
export function hashedKey(prefix: string, secretId: string): string {
  return `${prefix}${createHash('sha256').update(secretId).digest('base64url')}`;
}

export function seal(value: unknown, redisKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from(redisKey));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), ciphertext.toString('base64url'), tag.toString('base64url')].join('.');
}

/** Returns null for anything that wasn't sealed by us with this key for this redis key. */
export function unseal<T>(sealed: string, redisKey: string): T | null {
  try {
    const [version, iv, ciphertext, tag] = sealed.split('.');
    if (version !== VERSION || !iv || !ciphertext || !tag) return null;
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'));
    decipher.setAAD(Buffer.from(redisKey));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64url')),
      decipher.final(),
    ]);
    return JSON.parse(plaintext.toString('utf8')) as T;
  } catch {
    return null; // tampered, wrong key, or an old unencrypted value
  }
}
