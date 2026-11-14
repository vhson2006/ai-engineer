import { notFound } from 'next/navigation';

/** Any other path under a language (/vi/does-not-exist) renders [lang]/not-found.tsx. */
export default function CatchAll() {
  notFound();
}
