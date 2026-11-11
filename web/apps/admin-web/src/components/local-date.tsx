'use client';

import { format as fill } from '@web/core/i18n/format';
import { useSyncExternalStore } from 'react';

const noop = () => () => {};

/**
 * A date in the VIEWER's time zone (the server's is UTC, the admin's is not). Rendered on the
 * client only: the server sends an empty <time> (no hydration mismatch), filled right away.
 */
export function LocalDate({ iso, intlLocale, template }: { iso: string; intlLocale: string; template?: string }) {
  const onClient = useSyncExternalStore(noop, () => true, () => false);
  const text = onClient
    ? new Intl.DateTimeFormat(intlLocale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
    : '';
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {template ? (text ? fill(template, { date: text }) : '') : text}
    </time>
  );
}
