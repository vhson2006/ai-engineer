'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVerticalIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * A vertical list reordered by drag and drop (dnd-kit): mouse, touch AND keyboard (focus the
 * handle, Space to lift, arrows to move, Space to drop, Escape to cancel). Screen readers hear the
 * `labels` announcements, in the page language. Controlled: `onReorder` gets the new array.
 */
export interface SortableListLabels {
  /** Accessible name of each drag handle, e.g. "Drag to reorder {name}". */
  handle: (name: string) => string;
  /** How to use it with a keyboard (read once by screen readers). */
  instructions: string;
  pickedUp: (name: string, position: number) => string;
  movedTo: (name: string, position: number) => string;
  dropped: (name: string, position: number) => string;
  cancelled: (name: string) => string;
}

export interface SortableListProps<T extends { id: string }> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T) => ReactNode;
  /** The item's name in announcements and the handle label. */
  getName: (item: T) => string;
  labels: SortableListLabels;
  className?: string;
}

export function SortableList<T extends { id: string }>({ items, onReorder, renderItem, getName, labels, className }: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const nameOf = (id: string | number) => {
    const item = items.find((i) => i.id === id);
    return item ? getName(item) : String(id);
  };
  const positionOf = (id: string | number | undefined) => items.findIndex((i) => i.id === id) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => labels.pickedUp(nameOf(active.id), positionOf(active.id)),
    onDragOver: ({ active, over }) => (over ? labels.movedTo(nameOf(active.id), positionOf(over.id)) : undefined),
    onDragEnd: ({ active, over }) => (over ? labels.dropped(nameOf(active.id), positionOf(over.id)) : undefined),
    onDragCancel: ({ active }) => labels.cancelled(nameOf(active.id)),
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    onReorder(arrayMove(items, from, to));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{ announcements, screenReaderInstructions: { draggable: labels.instructions } }}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <ul data-slot="sortable-list" className={cn('grid gap-2', className)}>
          {items.map((item) => (
            <SortableRow key={item.id} id={item.id} handleLabel={labels.handle(getName(item))}>
              {renderItem(item)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ id, handleLabel, children }: { id: string; handleLabel: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 shadow-sm',
        isDragging && 'relative z-10 shadow-lg ring-2 ring-brand/30',
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={handleLabel}
        className="cursor-grab touch-none rounded-md p-1 text-subtle hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-brand active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}
