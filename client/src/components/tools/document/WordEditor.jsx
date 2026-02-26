import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Placeholder } from '@tiptap/extension-placeholder';
import mammoth from 'mammoth';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';

const AUTOSAVE_KEY = 'toolpilot_word_editor';
const AUTOSAVE_DELAY = 2000;

/* ── Toolbar Button ─────────────────────────────────────────────────── */
function ToolbarButton({ onClick, isActive, icon, title, shortcut, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={shortcut ? `${title} (${shortcut})` : title}
      aria-label={title}
      aria-pressed={isActive || undefined}
      className={`min-w-[32px] min-h-[32px] flex items-center justify-center rounded-md text-sm transition-colors
        ${disabled ? 'opacity-30 cursor-not-allowed' : ''}
        ${isActive
          ? 'bg-white/15 text-white'
          : 'text-surface-400 hover:bg-white/10 hover:text-surface-200'
        }`}
    >
      {icon}
    </button>
  );
}

/* ── Toolbar Divider ────────────────────────────────────────────────── */
function Divider() {
  return <div className="w-px h-5 bg-surface-700 mx-1 shrink-0" />;
}

/* ── Color Picker Popover ───────────────────────────────────────────── */
const PRESET_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#cccccc', '#ffffff',
  '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6fa8dc',
  '#8e7cc3', '#c27ba0', '#cc0000', '#e69138', '#f1c232', '#6aa84f',
  '#45818e', '#3d85c6', '#674ea7', '#a64d79', '#990000', '#b45f06',
  '#bf9000', '#38761d', '#134f5c', '#0b5394', '#351c75', '#741b47',
];

function ColorPickerPopover({ currentColor, onSelect, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={label}
        aria-label={label}
        className="min-w-[32px] min-h-[32px] flex flex-col items-center justify-center rounded-md text-sm text-surface-400 hover:bg-white/10 hover:text-surface-200 transition-colors"
      >
        <span className="text-xs leading-none">A</span>
        <span
          className="w-4 h-1 rounded-sm mt-0.5"
          style={{ backgroundColor: currentColor || '#ffffff' }}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 z-50 bg-surface-800 border border-surface-700 rounded-lg p-2 shadow-xl"
          >
            <div className="grid grid-cols-8 gap-1 w-[200px]">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { onSelect(c); setOpen(false); }}
                  title={c}
                  className="w-5 h-5 rounded-sm border border-surface-600 hover:scale-125 transition-transform"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => { onSelect(null); setOpen(false); }}
              className="mt-2 text-xs text-surface-400 hover:text-white w-full text-left"
            >
              Remove color
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── SVG Icons (inline, no dependency) ──────────────────────────────── */
const icons = {
  new: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  open: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
  save: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>,
  pdf: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  html: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
  bold: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" /></svg>,
  italic: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" /></svg>,
  underline: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z" /></svg>,
  strike: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z" /></svg>,
  alignLeft: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z" /></svg>,
  alignCenter: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z" /></svg>,
  alignRight: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z" /></svg>,
  alignJustify: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z" /></svg>,
  bulletList: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z" /></svg>,
  orderedList: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z" /></svg>,
  table: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" /></svg>,
  image: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  blockquote: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" /></svg>,
  hr: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth={2} d="M3 12h18" /></svg>,
  code: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
  undo: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" /></svg>,
  redo: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" /></svg>,
};


/* ── Table Menu Popover ─────────────────────────────────────────────── */
function TableMenu({ editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const inTable = editor?.isActive('table');

  const items = inTable
    ? [
        { label: 'Add column before', action: () => editor.chain().focus().addColumnBefore().run() },
        { label: 'Add column after', action: () => editor.chain().focus().addColumnAfter().run() },
        { label: 'Delete column', action: () => editor.chain().focus().deleteColumn().run() },
        { label: 'Add row before', action: () => editor.chain().focus().addRowBefore().run() },
        { label: 'Add row after', action: () => editor.chain().focus().addRowAfter().run() },
        { label: 'Delete row', action: () => editor.chain().focus().deleteRow().run() },
        { label: 'Merge cells', action: () => editor.chain().focus().mergeCells().run() },
        { label: 'Split cell', action: () => editor.chain().focus().splitCell().run() },
        { label: 'Delete table', action: () => editor.chain().focus().deleteTable().run(), danger: true },
      ]
    : [
        { label: 'Insert 3×3 table', action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
        { label: 'Insert 4×4 table', action: () => editor.chain().focus().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run() },
        { label: 'Insert 5×5 table', action: () => editor.chain().focus().insertTable({ rows: 5, cols: 5, withHeaderRow: true }).run() },
      ];

  return (
    <div className="relative" ref={ref}>
      <ToolbarButton
        onClick={() => setOpen(!open)}
        isActive={inTable}
        icon={icons.table}
        title="Table"
      />
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 z-50 bg-surface-800 border border-surface-700 rounded-lg py-1 shadow-xl min-w-[180px]"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => { item.action(); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 transition-colors ${
                  item.danger ? 'text-red-400' : 'text-surface-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Export Helpers ──────────────────────────────────────────────────── */
function exportAsDocx(html, fileName) {
  const fullHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:w="urn:schemas-microsoft-com:office:word"
    xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8"><title>${fileName}</title>
  <style>
    body { font-family: Calibri, sans-serif; font-size: 11pt; line-height: 1.6; color: #1a1a1a; }
    h1 { font-size: 24pt; font-weight: bold; }
    h2 { font-size: 18pt; font-weight: bold; }
    h3 { font-size: 14pt; font-weight: bold; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #999; padding: 6px 8px; }
    th { background: #f0f0f0; font-weight: bold; }
    blockquote { border-left: 3px solid #ccc; padding-left: 12px; color: #555; }
    img { max-width: 100%; }
  </style>
  </head><body>${html}</body></html>`;
  const blob = new Blob(['\ufeff' + fullHtml], { type: 'application/msword;charset=utf-8' });
  saveAs(blob, `${fileName}.doc`);
}

function exportAsHtml(html, fileName) {
  const fullHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${fileName}</title>
<style>
  body { font-family: Calibri, 'Segoe UI', sans-serif; font-size: 11pt; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; }
  h1 { font-size: 24pt; } h2 { font-size: 18pt; } h3 { font-size: 14pt; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  td, th { border: 1px solid #ddd; padding: 8px; } th { background: #f5f5f5; font-weight: bold; }
  blockquote { border-left: 3px solid #ddd; padding-left: 16px; color: #666; }
  img { max-width: 100%; height: auto; }
  code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
  pre { background: #f4f4f4; padding: 16px; border-radius: 6px; overflow-x: auto; }
</style></head><body>${html}</body></html>`;
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  saveAs(blob, `${fileName}.html`);
}

function exportAsPdf(html, fileName) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(`<!DOCTYPE html><html><head><title>${fileName}</title>
  <style>
    body { font-family: Calibri, 'Segoe UI', sans-serif; font-size: 11pt; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; }
    h1 { font-size: 24pt; } h2 { font-size: 18pt; } h3 { font-size: 14pt; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    td, th { border: 1px solid #ddd; padding: 8px; } th { background: #f5f5f5; }
    blockquote { border-left: 3px solid #ddd; padding-left: 16px; color: #666; }
    img { max-width: 100%; height: auto; }
    @media print { body { margin: 0; } }
  </style></head><body>${html}</body></html>`);
  printWindow.document.close();
  printWindow.onload = () => { printWindow.print(); };
}


/* ── Main Component ─────────────────────────────────────────────────── */
export default function WordEditor() {
  const [docTitle, setDocTitle] = useState('Untitled Document');
  const [lastSaved, setLastSaved] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importStatus, setImportStatus] = useState(null); // { type: 'success'|'error', message }
  const fileInputRef = useRef(null);
  const autosaveTimer = useRef(null);
  const titleInputRef = useRef(null);

  /* ── TipTap Editor Setup ──────────────────────────────────────────── */
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({ placeholder: 'Start writing your document…' }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[600px]',
      },
    },
    onUpdate: () => {
      scheduleAutosave();
    },
  });

  /* ── Stats ────────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    if (!editor) return { words: 0, chars: 0, pages: 0 };
    const text = editor.state.doc.textContent;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const pages = Math.max(1, Math.ceil(words / 250));
    return { words, chars, pages };
  }, [editor, editor?.state.doc.content.size]);

  /* ── Autosave ─────────────────────────────────────────────────────── */
  const saveToLocalStorage = useCallback(() => {
    if (!editor) return;
    try {
      const data = {
        title: docTitle,
        content: editor.getJSON(),
        savedAt: Date.now(),
      };
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
      setLastSaved(new Date());
    } catch { /* quota exceeded — silently fail */ }
  }, [editor, docTitle]);

  const scheduleAutosave = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(saveToLocalStorage, AUTOSAVE_DELAY);
  }, [saveToLocalStorage]);

  // Restore from localStorage on mount
  useEffect(() => {
    if (!editor) return;
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.content) {
        editor.commands.setContent(data.content);
        if (data.title) setDocTitle(data.title);
        if (data.savedAt) setLastSaved(new Date(data.savedAt));
      }
    } catch { /* corrupted data — start fresh */ }
  }, [editor]);

  // Ctrl+S save shortcut
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveToLocalStorage();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saveToLocalStorage]);

  // Cleanup timer
  useEffect(() => {
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, []);

  /* ── DOCX Import ──────────────────────────────────────────────────── */
  const importDocx = useCallback(async (file) => {
    if (!editor) return;
    if (!file.name.match(/\.docx?$/i)) {
      setImportStatus({ type: 'error', message: 'Please upload a .docx file' });
      return;
    }
    try {
      setImportStatus({ type: 'loading', message: 'Importing document…' });
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer }, {
        convertImage: mammoth.images.imgElement((image) =>
          image.read('base64').then((data) => ({
            src: `data:${image.contentType};base64,${data}`,
          }))
        ),
      });
      editor.commands.setContent(result.value);
      const name = file.name.replace(/\.docx?$/i, '');
      setDocTitle(name);
      setImportStatus({ type: 'success', message: `Imported "${file.name}" successfully` });
      scheduleAutosave();
    } catch (err) {
      setImportStatus({ type: 'error', message: `Import failed: ${err.message}` });
    }
    setTimeout(() => setImportStatus(null), 4000);
  }, [editor, scheduleAutosave]);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) importDocx(file);
    e.target.value = '';
  }, [importDocx]);

  /* ── Drag & Drop ──────────────────────────────────────────────────── */
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) importDocx(file);
  }, [importDocx]);

  /* ── Image Upload ─────────────────────────────────────────────────── */
  const insertImage = useCallback(() => {
    if (!editor) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        editor.chain().focus().setImage({ src: reader.result }).run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [editor]);

  /* ── New Document ─────────────────────────────────────────────────── */
  const newDocument = useCallback(() => {
    if (!editor) return;
    editor.commands.clearContent();
    setDocTitle('Untitled Document');
    localStorage.removeItem(AUTOSAVE_KEY);
    setLastSaved(null);
  }, [editor]);

  /* ── Export Handlers ──────────────────────────────────────────────── */
  const handleExportDocx = useCallback(() => {
    if (!editor) return;
    exportAsDocx(editor.getHTML(), docTitle);
  }, [editor, docTitle]);

  const handleExportHtml = useCallback(() => {
    if (!editor) return;
    exportAsHtml(editor.getHTML(), docTitle);
  }, [editor, docTitle]);

  const handleExportPdf = useCallback(() => {
    if (!editor) return;
    exportAsPdf(editor.getHTML(), docTitle);
  }, [editor, docTitle]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-surface-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          <span className="text-sm">Loading editor…</span>
        </div>
      </div>
    );
  }


  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div
      className="word-editor-wrapper -m-6 flex flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.doc"
        className="hidden"
        onChange={handleFileInput}
        aria-label="Import Word document"
      />

      {/* ── Title Bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-surface-700/50 bg-surface-800/50">
        <span className="text-xl" aria-hidden="true">📝</span>
        <input
          ref={titleInputRef}
          type="text"
          value={docTitle}
          onChange={(e) => { setDocTitle(e.target.value); scheduleAutosave(); }}
          className="bg-transparent text-surface-100 font-semibold text-lg focus:outline-none focus:bg-surface-700/40 rounded px-2 py-0.5 flex-1 min-w-0 transition-colors"
          aria-label="Document title"
          spellCheck={false}
        />
        {lastSaved && (
          <span className="text-xs text-surface-500 shrink-0">
            Saved {lastSaved.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* ── Toolbar Row 1: File Actions ───────────────────────────────── */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-surface-700/50 bg-surface-800/30 flex-wrap">
        <ToolbarButton onClick={newDocument} icon={icons.new} title="New Document" shortcut="Ctrl+Alt+N" />
        <ToolbarButton onClick={() => fileInputRef.current?.click()} icon={icons.open} title="Open .docx" />
        <Divider />
        <ToolbarButton onClick={handleExportDocx} icon={icons.save} title="Save as .doc" shortcut="Ctrl+S" />
        <ToolbarButton onClick={handleExportPdf} icon={icons.pdf} title="Save as PDF" />
        <ToolbarButton onClick={handleExportHtml} icon={icons.html} title="Save as HTML" />
        <Divider />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} icon={icons.undo} title="Undo" shortcut="Ctrl+Z" />
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} icon={icons.redo} title="Redo" shortcut="Ctrl+Y" />
      </div>

      {/* ── Toolbar Row 2: Text Formatting ────────────────────────────── */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-surface-700/50 bg-surface-800/30 flex-wrap">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} icon={icons.bold} title="Bold" shortcut="Ctrl+B" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} icon={icons.italic} title="Italic" shortcut="Ctrl+I" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} icon={icons.underline} title="Underline" shortcut="Ctrl+U" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} icon={icons.strike} title="Strikethrough" />
        <Divider />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} icon={<span className="text-xs font-bold">H1</span>} title="Heading 1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} icon={<span className="text-xs font-bold">H2</span>} title="Heading 2" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} icon={<span className="text-xs font-bold">H3</span>} title="Heading 3" />
        <Divider />
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} icon={icons.alignLeft} title="Align Left" />
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} icon={icons.alignCenter} title="Align Center" />
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} icon={icons.alignRight} title="Align Right" />
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} icon={icons.alignJustify} title="Justify" />
      </div>

      {/* ── Toolbar Row 3: Insert & Colors ────────────────────────────── */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-surface-700/50 bg-surface-800/30 flex-wrap">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} icon={icons.bulletList} title="Bullet List" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} icon={icons.orderedList} title="Ordered List" />
        <Divider />
        <TableMenu editor={editor} />
        <ToolbarButton onClick={insertImage} icon={icons.image} title="Insert Image" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} icon={icons.blockquote} title="Blockquote" />
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={icons.hr} title="Horizontal Rule" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} icon={icons.code} title="Code Block" />
        <Divider />
        <ColorPickerPopover
          currentColor={editor.getAttributes('textStyle').color || '#ffffff'}
          onSelect={(color) => {
            if (color) editor.chain().focus().setColor(color).run();
            else editor.chain().focus().unsetColor().run();
          }}
          label="Text Color"
        />
        <ColorPickerPopover
          currentColor={editor.getAttributes('highlight').color || null}
          onSelect={(color) => {
            if (color) editor.chain().focus().toggleHighlight({ color }).run();
            else editor.chain().focus().unsetHighlight().run();
          }}
          label="Highlight Color"
        />
      </div>

      {/* ── Import Status Toast ───────────────────────────────────────── */}
      <AnimatePresence>
        {importStatus && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`mx-4 mt-2 px-4 py-2 rounded-lg text-sm font-medium ${
              importStatus.type === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
              importStatus.type === 'error' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
              'bg-primary-500/20 text-primary-300 border border-primary-500/30'
            }`}
          >
            {importStatus.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Drag Overlay ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-primary-500/10 border-2 border-dashed border-primary-400 rounded-xl flex items-center justify-center backdrop-blur-sm"
          >
            <div className="text-center">
              <span className="text-5xl block mb-3">📄</span>
              <p className="text-primary-300 font-semibold text-lg">Drop .docx file to import</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Editor Area ───────────────────────────────────────────────── */}
      <div className="word-editor-content flex-1 overflow-auto bg-surface-700/30 py-8 px-4">
        <EditorContent editor={editor} />
      </div>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-surface-700/50 bg-surface-800/50 text-xs text-surface-500">
        <div className="flex items-center gap-4">
          <span>{stats.words.toLocaleString()} words</span>
          <span>{stats.chars.toLocaleString()} characters</span>
          <span>~{stats.pages} {stats.pages === 1 ? 'page' : 'pages'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-surface-600">100% client-side · Your data never leaves your browser</span>
          {lastSaved && (
            <span className="text-green-500/70 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              Auto-saved
            </span>
          )}
        </div>
      </div>

      {/* ── Editor Styles ─────────────────────────────────────────────── */}
      <style>{`
        .word-editor-wrapper {
          position: relative;
          min-height: 700px;
        }
        .word-editor-content .tiptap {
          min-height: 600px;
          padding: 48px;
          max-width: 816px;
          margin: 0 auto;
          background: #ffffff;
          color: #1a1a1a;
          font-family: 'Calibri', 'Segoe UI', sans-serif;
          font-size: 11pt;
          line-height: 1.6;
          box-shadow: 0 1px 8px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05);
          border-radius: 4px;
        }
        .word-editor-content .tiptap:focus {
          outline: none;
        }
        .word-editor-content .tiptap h1 { font-size: 24pt; font-weight: bold; margin: 24px 0 12px; color: #111; }
        .word-editor-content .tiptap h2 { font-size: 18pt; font-weight: bold; margin: 20px 0 10px; color: #222; }
        .word-editor-content .tiptap h3 { font-size: 14pt; font-weight: bold; margin: 16px 0 8px; color: #333; }
        .word-editor-content .tiptap h4 { font-size: 12pt; font-weight: bold; margin: 14px 0 6px; color: #333; }
        .word-editor-content .tiptap h5 { font-size: 11pt; font-weight: bold; margin: 12px 0 4px; color: #444; }
        .word-editor-content .tiptap h6 { font-size: 10pt; font-weight: bold; margin: 10px 0 4px; color: #555; }
        .word-editor-content .tiptap p { margin: 0 0 8px; }
        .word-editor-content .tiptap ul,
        .word-editor-content .tiptap ol { padding-left: 24px; margin: 8px 0; }
        .word-editor-content .tiptap li { margin: 2px 0; }
        .word-editor-content .tiptap table { border-collapse: collapse; width: 100%; margin: 16px 0; }
        .word-editor-content .tiptap td,
        .word-editor-content .tiptap th { border: 1px solid #d0d0d0; padding: 8px 12px; min-width: 80px; vertical-align: top; }
        .word-editor-content .tiptap th { background: #f5f5f5; font-weight: 600; }
        .word-editor-content .tiptap td.selectedCell,
        .word-editor-content .tiptap th.selectedCell { background: #d4e4fc; }
        .word-editor-content .tiptap blockquote {
          border-left: 3px solid #c0c0c0;
          padding-left: 16px;
          margin: 12px 0;
          color: #555;
          font-style: italic;
        }
        .word-editor-content .tiptap hr {
          border: none;
          border-top: 1px solid #d0d0d0;
          margin: 20px 0;
        }
        .word-editor-content .tiptap img {
          max-width: 100%;
          height: auto;
          border-radius: 2px;
          margin: 8px 0;
        }
        .word-editor-content .tiptap code {
          background: #f0f0f0;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 0.9em;
          color: #c7254e;
        }
        .word-editor-content .tiptap pre {
          background: #2d2d2d;
          color: #f8f8f2;
          padding: 16px;
          border-radius: 6px;
          overflow-x: auto;
          margin: 12px 0;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 0.9em;
          line-height: 1.5;
        }
        .word-editor-content .tiptap pre code {
          background: none;
          padding: 0;
          color: inherit;
          font-size: inherit;
        }
        .word-editor-content .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #aaa;
          pointer-events: none;
          height: 0;
          font-style: italic;
        }
        .word-editor-content .tiptap .tableWrapper {
          overflow-x: auto;
          margin: 16px 0;
        }
        .word-editor-content .tiptap .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: 0;
          width: 4px;
          background: #6fa8dc;
          cursor: col-resize;
        }
        /* Selection styling */
        .word-editor-content .tiptap ::selection {
          background: #b4d5fe;
        }
        /* Text alignment */
        .word-editor-content .tiptap [style*="text-align: center"] { text-align: center; }
        .word-editor-content .tiptap [style*="text-align: right"] { text-align: right; }
        .word-editor-content .tiptap [style*="text-align: justify"] { text-align: justify; }
      `}</style>
    </div>
  );
}
