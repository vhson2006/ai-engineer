'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** While a step runs in another process (AI, voice, render), refreshes the page every few seconds. */
export function BusyPoller({ busy, intervalMs = 3000 }: { busy: boolean; intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => router.refresh(), intervalMs);
    return () => window.clearInterval(timer);
  }, [busy, intervalMs, router]);
  return null;
}
