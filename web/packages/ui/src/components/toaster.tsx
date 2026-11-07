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
