'use client';

import { Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  BoldIcon,
  CodeIcon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  Redo2Icon,
  StrikethroughIcon,
  UnderlineIcon,
  Undo2Icon,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { fieldClass } from './input';

/**
 * Rich text (Tiptap, MIT). Emits HTML through `onChange`. The HTML is user input: when it is
 * DISPLAYED, it must be sanitized on the server first (allow-list of tags/attributes), never
 * rendered raw with dangerouslySetInnerHTML.
 */
export interface RichTextEditorLabels {
  toolbar: string;
  bold: string;
  italic: string;
  underline: string;
  strike: string;
  code: string;
  heading2: string;
  heading3: string;
  bulletList: string;
  orderedList: string;
  quote: string;
  undo: string;
  redo: string;
}

export interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  labels: RichTextEditorLabels;
  /** Accessible name of the editing area (or pass `aria-labelledby`). */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-invalid'?: boolean;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function RichTextEditor({ value = '', onChange, placeholder, labels, disabled, className, id, ...aria }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true } }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: value,
    editable: !disabled,
    // Rendered on the client only: no server HTML to hydrate (avoids mismatches).
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'rich-text min-h-36 px-3 py-2.5 outline-none',
        role: 'textbox',
        'aria-multiline': 'true',
        ...(id ? { id } : {}),
        ...(aria['aria-label'] ? { 'aria-label': aria['aria-label'] } : {}),
        ...(aria['aria-labelledby'] ? { 'aria-labelledby': aria['aria-labelledby'] } : {}),
        ...(aria['aria-invalid'] ? { 'aria-invalid': 'true' } : {}),
      },
    },
    onUpdate: ({ editor: current }) => onChange?.(current.isEmpty ? '' : current.getHTML()),
  });

  return (
    <div
      data-slot="rich-text-editor"
      aria-invalid={aria['aria-invalid']}
      className={cn(fieldClass, 'p-0 focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/20', className)}
    >
      {editor ? <Toolbar editor={editor} labels={labels} disabled={disabled} /> : <div className="h-10 border-b border-border" />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor, labels, disabled }: { editor: Editor; labels: RichTextEditorLabels; disabled?: boolean }) {
  // Re-render the toolbar only when these values change (not on every keystroke).
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      code: e.isActive('code'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();
  const groups: { icon: LucideIcon; label: string; active?: boolean; enabled?: boolean; run: () => void }[][] = [
    [
      { icon: BoldIcon, label: labels.bold, active: state.bold, run: () => chain().toggleBold().run() },
      { icon: ItalicIcon, label: labels.italic, active: state.italic, run: () => chain().toggleItalic().run() },
      { icon: UnderlineIcon, label: labels.underline, active: state.underline, run: () => chain().toggleUnderline().run() },
      { icon: StrikethroughIcon, label: labels.strike, active: state.strike, run: () => chain().toggleStrike().run() },
      { icon: CodeIcon, label: labels.code, active: state.code, run: () => chain().toggleCode().run() },
    ],
    [
      { icon: Heading2Icon, label: labels.heading2, active: state.h2, run: () => chain().toggleHeading({ level: 2 }).run() },
      { icon: Heading3Icon, label: labels.heading3, active: state.h3, run: () => chain().toggleHeading({ level: 3 }).run() },
      { icon: ListIcon, label: labels.bulletList, active: state.bulletList, run: () => chain().toggleBulletList().run() },
      { icon: ListOrderedIcon, label: labels.orderedList, active: state.orderedList, run: () => chain().toggleOrderedList().run() },
      { icon: QuoteIcon, label: labels.quote, active: state.quote, run: () => chain().toggleBlockquote().run() },
    ],
    [
      { icon: Undo2Icon, label: labels.undo, enabled: state.canUndo, run: () => chain().undo().run() },
      { icon: Redo2Icon, label: labels.redo, enabled: state.canRedo, run: () => chain().redo().run() },
    ],
  ];

  return (
    <div role="toolbar" aria-label={labels.toolbar} className="flex flex-wrap items-center gap-0.5 border-b border-border px-1.5 py-1">
      {groups.map((group, index) => (
        <div key={index} className="flex items-center gap-0.5 border-r border-border pr-1 last:border-r-0">
          {group.map(({ icon: Icon, label, active, enabled = true, run }) => (
            <button
              key={label}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={active === undefined ? undefined : active}
              disabled={disabled || !enabled}
              onMouseDown={(event) => event.preventDefault()} // keep the selection in the editor
              onClick={run}
              className={cn(
                'inline-flex size-8 items-center justify-center rounded-md text-muted transition-colors',
                'hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-40',
                active && 'bg-brand-soft text-brand-soft-fg hover:bg-brand-soft',
              )}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
