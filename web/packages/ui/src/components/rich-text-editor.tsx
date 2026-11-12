'use client';

import { Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  BoldIcon,
  CodeIcon,
  CodeXmlIcon,
  LayoutTemplateIcon,
  SquareDashedIcon,
  Trash2Icon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  PilcrowIcon,
  QuoteIcon,
  Redo2Icon,
  StrikethroughIcon,
  TriangleAlertIcon,
  UnderlineIcon,
  Undo2Icon,
  WandSparklesIcon,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { formatHtml, hasLayoutBlocks } from '../lib/html-source';
import {
  LAYOUT_BLOCKS,
  currentLayoutBlock,
  editorHtml,
  layoutBlockHtml,
  layoutExtensions,
  lostInVisualEditor,
  removeLayoutBlock,
  setImagePicker,
  unwrapLayoutBlock,
  type PickedImage,
  type RichTextLayoutLabels,
} from '../lib/rich-text-layout';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
import { fieldClass } from './input';

/**
 * Rich text (Tiptap, MIT). Emits HTML through `onChange`. The HTML is user input: when it is
 * DISPLAYED, it must be sanitized on the server first (allow-list of tags/attributes), never
 * rendered raw with dangerouslySetInnerHTML.
 *
 * With `layout`, the visual editor keeps the article layout blocks of ADR 0033 (section, div,
 * figure, img, `tpl-*` classes), shows them as labelled frames, and can insert, unwrap or delete
 * them. With `source`, a second mode edits the HTML itself. HTML the visual editor can't keep
 * (checked with its schema) opens in the source mode, and switching it to the visual one asks first.
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
  /** Turns on the HTML source mode (its labels from the dictionaries). */
  source?: { labels: RichTextEditorSourceLabels };
  /**
   * Turns on the layout blocks of article bodies (ADR 0033) in the visual editor. `pickImage`:
   * the app's media library (ADR 0034), for the "choose an image" button of image cards.
   */
  layout?: { labels: RichTextLayoutLabels; pickImage?: () => Promise<PickedImage | null> };
}

export interface RichTextEditorSourceLabels {
  /** The two modes. */
  visual: string;
  html: string;
  /** Re-indent the HTML. */
  format: string;
  /** Accessible name of the HTML text area. */
  source: string;
  /** Shown above the HTML: what the server keeps. */
  hint: string;
  /** Before switching to the visual editor HTML it can't keep (followed by what it would drop). */
  layoutWarning: string;
  switchAnyway: string;
  stay: string;
}

type Mode = 'visual' | 'source';

export function RichTextEditor({ value = '', onChange, placeholder, labels, disabled, className, id, source, layout, ...aria }: RichTextEditorProps) {
  // Without `layout`, blocks are known to be lost: open in the source mode right away. With it, the
  // editor's schema decides once the editor exists (onCreate below).
  const opensInSource = Boolean(source && !layout && hasLayoutBlocks(value));
  const [mode, setMode] = useState<Mode>(opensInSource ? 'source' : 'visual');
  // The HTML text area's content: formatted for reading, emitted as typed.
  const [html, setHtml] = useState(() => (opensInSource ? formatHtml(value) : ''));
  // What the visual editor would drop, while asking before switching to it.
  const [lost, setLost] = useState<string[]>([]);
  // The last value this editor sent: a different `value` comes from outside (e.g. reset after save).
  const [emitted, setEmitted] = useState(value);
  const [seen, setSeen] = useState(value);
  const hintId = useId();
  const emit = (next: string) => {
    setEmitted(next);
    onChange?.(next);
  };

  // A new value from outside while editing HTML: show it (adjusting state during render, not in
  // an effect). The visual editor is synced by the effect below.
  if (value !== seen) {
    setSeen(value);
    if (mode === 'source' && value !== emitted) {
      setEmitted(value);
      setHtml(formatHtml(value));
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true } }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
      ...(layout ? layoutExtensions(layout.labels) : []),
    ],
    content: value,
    editable: !disabled,
    // Rendered on the client only: no server HTML to hydrate (avoids mismatches).
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn('rich-text min-h-36 px-3 py-2.5 outline-none', layout && 'rich-text-layout'),
        role: 'textbox',
        'aria-multiline': 'true',
        ...(id ? { id } : {}),
        ...(aria['aria-label'] ? { 'aria-label': aria['aria-label'] } : {}),
        ...(aria['aria-labelledby'] ? { 'aria-labelledby': aria['aria-labelledby'] } : {}),
        ...(aria['aria-invalid'] ? { 'aria-invalid': 'true' } : {}),
      },
    },
    // HTML the visual editor can't keep opens in the source mode, untouched.
    onCreate: ({ editor: created }) => {
      if (source && mode === 'visual' && lostInVisualEditor(value, created.schema).length > 0) {
        setHtml(formatHtml(value));
        setMode('source');
      }
    },
    onUpdate: ({ editor: current }) => emit(editorHtml(current)),
  });

  // The image cards call the CURRENT picker (the editor itself is created once).
  const pickImage = layout?.pickImage;
  useEffect(() => {
    if (editor && layout) setImagePicker(editor, pickImage);
  }, [editor, layout, pickImage]);

  // A new value from outside in the visual editor (e.g. the form reset to what the server stored).
  useEffect(() => {
    if (!editor || mode !== 'visual') return;
    if (value !== editorHtml(editor)) editor.commands.setContent(value, { emitUpdate: false });
  }, [value, mode, editor]);

  const toSource = () => {
    if (!editor) return;
    setHtml(formatHtml(editorHtml(editor)));
    setMode('source');
  };
  const toVisual = (force = false) => {
    if (!editor) return;
    const dropped = force ? [] : lostInVisualEditor(html, editor.schema);
    if (dropped.length > 0) {
      setLost(dropped);
      return;
    }
    editor.commands.setContent(html, { emitUpdate: false });
    const next = editorHtml(editor);
    if (next !== emitted) emit(next);
    setLost([]);
    setMode('visual');
    editor.commands.focus();
  };
  const reformat = () => {
    const next = formatHtml(html);
    setHtml(next);
    if (next !== emitted) emit(next);
  };

  const modes =
    source && editor ? (
      <ModeSwitch
        mode={mode}
        labels={source.labels}
        disabled={disabled}
        onVisual={() => toVisual()}
        onSource={toSource}
        onFormat={mode === 'source' ? reformat : undefined}
      />
    ) : null;

  return (
    <div
      data-slot="rich-text-editor"
      aria-invalid={aria['aria-invalid']}
      className={cn(fieldClass, 'p-0 focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/20', className)}
    >
      {editor ? (
        <Toolbar editor={editor} labels={labels} layout={layout?.labels} disabled={disabled || mode === 'source'} extra={modes} />
      ) : (
        <div className="h-10 border-b border-border" />
      )}
      {source && lost.length > 0 && (
        <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-border bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <TriangleAlertIcon aria-hidden className="size-4 shrink-0" />
          <p className="min-w-0 flex-1">
            {source.labels.layoutWarning} <code className="font-mono text-xs">{lost.map(describeLost).join(' ')}</code>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setLost([])}
              className="rounded-md bg-surface px-3 py-1.5 font-medium text-fg shadow-sm hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand"
            >
              {source.labels.stay}
            </button>
            <button
              type="button"
              onClick={() => toVisual(true)}
              className="rounded-md px-3 py-1.5 font-medium underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-brand"
            >
              {source.labels.switchAnyway}
            </button>
          </div>
        </div>
      )}
      {source && mode === 'source' ? (
        <>
          <p id={hintId} className="border-b border-border px-3 py-2 text-xs text-subtle">
            {source.labels.hint}
          </p>
          <textarea
            id={id}
            value={html}
            onChange={(event) => {
              setHtml(event.target.value);
              emit(event.target.value);
            }}
            readOnly={disabled}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label={source.labels.source}
            aria-describedby={hintId}
            aria-invalid={aria['aria-invalid']}
            className="block min-h-72 w-full resize-y bg-transparent px-3 py-2.5 font-mono text-[13px] leading-6 outline-none"
          />
        </>
      ) : null}
      <div className={cn(mode === 'source' && 'hidden')}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

/** 'tag:section' → '<section>', 'class:tpl-note' → '.tpl-note'. */
function describeLost(key: string): string {
  return key.startsWith('tag:') ? `<${key.slice(4)}>` : `.${key.replace(/^class:/, '')}`;
}

/** "Visual | HTML" at the end of the toolbar, plus "Format" while in HTML. */
function ModeSwitch({
  mode,
  labels,
  disabled,
  onVisual,
  onSource,
  onFormat,
}: {
  mode: Mode;
  labels: RichTextEditorSourceLabels;
  disabled?: boolean;
  onVisual: () => void;
  onSource: () => void;
  onFormat?: () => void;
}) {
  const item = (active: boolean) =>
    cn(
      'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
      'focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-40',
      active ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
    );
  return (
    <div className="ml-auto flex items-center gap-1">
      {onFormat && (
        <button type="button" title={labels.format} aria-label={labels.format} disabled={disabled} onClick={onFormat} className={cn(item(false), 'px-2')}>
          <WandSparklesIcon aria-hidden className="size-3.5" />
        </button>
      )}
      <div className="flex rounded-lg bg-surface-2 p-0.5">
        <button type="button" aria-pressed={mode === 'visual'} disabled={disabled} onClick={onVisual} className={item(mode === 'visual')}>
          <PilcrowIcon aria-hidden className="size-3.5" />
          {labels.visual}
        </button>
        <button type="button" aria-pressed={mode === 'source'} disabled={disabled} onClick={onSource} className={item(mode === 'source')}>
          <CodeXmlIcon aria-hidden className="size-3.5" />
          {labels.html}
        </button>
      </div>
    </div>
  );
}

function Toolbar({
  editor,
  labels,
  layout,
  disabled,
  extra,
}: {
  editor: Editor;
  labels: RichTextEditorLabels;
  layout?: RichTextLayoutLabels;
  disabled?: boolean;
  extra?: ReactNode;
}) {
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
      block: layout ? (currentLayoutBlock(e)?.name ?? null) : null,
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
    ...(layout
      ? [
          [
            {
              icon: SquareDashedIcon,
              label: layout.unwrap,
              enabled: state.block === 'layoutSection' || state.block === 'layoutDiv',
              run: () => unwrapLayoutBlock(editor),
            },
            { icon: Trash2Icon, label: layout.remove, enabled: state.block !== null, run: () => removeLayoutBlock(editor) },
          ],
        ]
      : []),
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
      {layout && <InsertBlockMenu editor={editor} labels={layout} disabled={disabled} />}
      {extra}
    </div>
  );
}

/** "Insert block": the layout blocks of ADR 0033, with placeholder text, at the cursor. */
function InsertBlockMenu({ editor, labels, disabled }: { editor: Editor; labels: RichTextLayoutLabels; disabled?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          'ml-1 inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted transition-colors',
          'hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-40',
        )}
      >
        <LayoutTemplateIcon aria-hidden className="size-4" />
        {labels.insert}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
        {LAYOUT_BLOCKS.map((block) => (
          <DropdownMenuItem key={block} onSelect={() => editor.chain().focus().insertContent(layoutBlockHtml(block, labels)).run()}>
            {labels.blocks[block]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
