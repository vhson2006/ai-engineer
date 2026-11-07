/**
 * Only same-site relative paths are allowed as a post-login destination, so /auth/login can't be
 * abused as an open redirect (e.g. ?returnTo=https://evil.example or //evil.example).
 */
export function safeReturnTo(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback;
  }
  return value;
}
