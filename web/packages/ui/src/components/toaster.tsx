'use client';

import { Toaster as Sonner, toast, type ToasterProps } from 'sonner';

/**
 * Put once in the root layout. Then, from client code: toast.success(...), toast.error(...)
 * (e.g. with an ActionResult: result.ok ? toast.success(t.saved) : toast.error(result.message)).
 */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-right"
      theme="system"
      richColors
      closeButton
      toastOptions={{ classNames: { toast: 'font-sans rounded-xl! border-border! shadow-lg!' } }}
      {...props}
    />
  );
}

export { toast };

/**
 * A failed action (an ActionFailure): its message (or `message` to replace it), and the request
 * id support finds the logs by, under the app's translated label.
 */
export function toastFailure(
  failure: { message: string; requestId?: string },
  requestIdLabel: string,
  message: string = failure.message,
): void {
  toast.error(message, { description: failure.requestId ? `${requestIdLabel}: ${failure.requestId}` : undefined });
}
