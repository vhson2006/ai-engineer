'use client';

import { Popover as PopoverPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

/** Shared surface of floating panels (popover, menu, select list, combobox). */
export const floatingPanelClass = cn(
  'z-50 rounded-xl border border-border bg-surface text-fg shadow-xl shadow-black/5 outline-none ring-1 ring-black/5 dark:shadow-black/40 dark:ring-white/5',
  'data-[state=open]:animate-zoom-in data-[state=closed]:animate-zoom-out motion-reduce:animate-none',
);

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export function PopoverContent({ className, align = 'center', sideOffset = 6, ...props }: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(floatingPanelClass, 'w-72 origin-(--radix-popover-content-transform-origin) p-4', className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
