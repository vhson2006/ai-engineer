'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@web/ui';
import { BookingDialog, type BookingData } from './booking-dialog';

/** Where the dialog starts: a service group (menu card, specialty) or one service (gallery, quick bar). */
export type BookingPreset = { group?: string; service?: string };
type Booking = { open: (preset?: BookingPreset) => void; data: BookingData };
const BookingContext = createContext<Booking | null>(null);

/**
 * One booking dialog for the whole page: <BookButton>, the gallery and the quick bar open it.
 * Data and labels are translated and formatted on the server.
 */
export function BookingProvider({ data, children }: { data: BookingData; children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; preset?: BookingPreset; session: number }>({ open: false, session: 0 });
  const open = useCallback((preset?: BookingPreset) => setState((prev) => ({ open: true, preset, session: prev.session + 1 })), []);
  const value = useMemo(() => ({ open, data }), [open, data]);
  return (
    <BookingContext value={value}>
      {children}
      <BookingDialog
        key={state.session}
        data={data}
        open={state.open}
        preset={state.preset}
        onOpenChange={(next) => setState((prev) => ({ ...prev, open: next }))}
      />
    </BookingContext>
  );
}

export function useBooking(): Booking {
  const booking = useContext(BookingContext);
  if (!booking) throw new Error('useBooking() outside <BookingProvider>');
  return booking;
}

/** A button that opens the booking dialog (styled by the caller). */
export function BookButton({ group, service, className, children }: BookingPreset & { className?: string; children: ReactNode }) {
  const { open } = useBooking();
  return (
    <button type="button" onClick={() => open({ group, service })} className={cn('cursor-pointer', className)}>
      {children}
    </button>
  );
}
