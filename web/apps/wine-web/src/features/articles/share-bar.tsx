'use client';

import { Check, Link2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@web/ui';

const button =
  'inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold transition-colors hover:border-brand hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

/**
 * Share an article: Facebook's share dialog (a plain link, no SDK or script: CSP stays strict) and
 * "copy link". The preview people see comes from the page's Open Graph tags.
 */
export function ShareBar({ url, labels }: { url: string; labels: { share: string; facebook: string; copy: string; copied: string } }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the address bar still has the link.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-bold tracking-[0.2em] text-gold-text uppercase">{labels.share}</span>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={button}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-4 fill-current">
          <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.6V21h2.9Z" />
        </svg>
        {labels.facebook}
      </a>
      <button type="button" onClick={copy} className={cn(button)} aria-live="polite">
        {copied ? <Check aria-hidden className="size-4" /> : <Link2 aria-hidden className="size-4" />}
        {copied ? labels.copied : labels.copy}
      </button>
    </div>
  );
}
