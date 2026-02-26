import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LS_KEY = 'markdown-editor-content';
const DEFAULT_CONTENT = '# Hello World\n\nType your **markdown** here.\n\n- Item 1\n- Item 2\n\n> A blockquote\n\n`inline code`';

function parseMarkdown(md) {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre class="md-code-block"><code${lang ? ` class="language-${lang}"` : ''}>${code.trim()}</code></pre>`
  );
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');
  // HR
  html = html.replace(/^---$/gm, '<hr class="md-hr"/>');
  // Checkboxes
  html = html.replace(/^- \[x\] (.+)$/gm, '<li class="md-checkbox checked"><input type="checkbox" checked disabled/> $1</li>');
  html = html.replace(/^- \[ \] (.+)$/gm, '<li class="md-checkbox"><input type="checkbox" disabled/> $1</li>');
  // Headers
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  // Blockquote
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" class="md-img"/>');
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  // Ordered list items
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="md-ol-item">$1</li>');
  html = html.replace(/(<li class="md-ol-item">.*<\/li>\n?)+/g, (m) => `<ol>${m}</ol>`);
  // Unordered list items (not checkboxes)
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  // Checkbox list wrapping
  html = html.replace(/(<li class="md-checkbox[^"]*">.*<\/li>\n?)+/g, (m) => `<ul class="md-checklist">${m}</ul>`);
  // Tables
  html = html.replace(/^(\|.+\|)\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/gm, (_, header, body) => {
    const ths = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
    const rows = body.trim().split('\n').map(row => {
      const tds = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${tds}</tr>`;
    }).join('');
    return `<table class="md-table"><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
  });
  // Paragraphs
  html = html.replace(/\n{2,}/g, '</p><p>');
  html = `<p>${html}</p>`;
  html = html.replace(/<p><\/p>/g, '');
  return html;
}

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
const modKey = isMac ? '⌘' : 'Ctrl';

const TOOLBAR = [
  { label: 'H1', insert: '# ', wrap: false, icon: 'H1' },
  { label: 'H2', insert: '## ', wrap: false, icon: 'H2' },
  { label: 'H3', insert: '### ', wrap: false, icon: 'H3' },
  { label: 'Bold', insert: '**', wrap: true, icon: 'B', shortcut: `${modKey}+B` },
  { label: 'Italic', insert: '*', wrap: true, icon: 'I', shortcut: `${modKey}+I` },
  { label: 'Strikethrough', insert: '~~', wrap: true, icon: 'S̶' },
  { label: 'Code', insert: '`', wrap: true, icon: '<>' },
  { label: 'Code Block', insert: '```\n', insertAfter: '\n```', wrap: true, icon: '{ }' },
  { sep: true },
  { label: 'Link', insert: '[text](url)', wrap: false, icon: '🔗', shortcut: `${modKey}+K` },
  { label: 'Image', insert: '![alt](url)', wrap: false, icon: '🖼' },
  { label: 'Table', insert: '| Header | Header |\n| ------ | ------ |\n| Cell   | Cell   |', wrap: false, icon: '▦' },
  { sep: true },
  { label: 'Bullet List', insert: '- ', wrap: false, icon: '•' },
  { label: 'Ordered List', insert: '1. ', wrap: false, icon: '1.' },
  { label: 'Checkbox', insert: '- [ ] ', wrap: false, icon: '☐' },
  { label: 'Quote', insert: '> ', wrap: false, icon: '❝' },
  { label: 'Horizontal Rule', insert: '\n---\n', wrap: false, icon: '—' },
];

const PREVIEW_STYLES = `
  .md-preview h1 { font-size: 1.75rem; font-weight: 700; margin: 1.2rem 0 0.6rem; color: #f5f5f7; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.4rem; }
  .md-preview h2 { font-size: 1.35rem; font-weight: 700; margin: 1rem 0 0.5rem; color: #f5f5f7; }
  .md-preview h3 { font-size: 1.1rem; font-weight: 600; margin: 0.8rem 0 0.4rem; color: #e5e5e7; }
  .md-preview h4 { font-size: 1rem; font-weight: 600; margin: 0.6rem 0 0.3rem; color: #e5e5e7; }
  .md-preview p { margin: 0.5rem 0; color: #c5c5c7; line-height: 1.7; }
  .md-preview a { color: #FF6363; text-decoration: underline; text-underline-offset: 2px; }
  .md-preview a:hover { color: #FF9F43; }
  .md-preview strong { color: #f5f5f7; font-weight: 600; }
  .md-preview em { color: #d5d5d7; }
  .md-preview del { color: #888; text-decoration: line-through; }
  .md-preview blockquote { border-left: 3px solid #FF6363; padding: 0.5rem 1rem; margin: 0.75rem 0; background: rgba(255,99,99,0.06); border-radius: 0 8px 8px 0; color: #bbb; }
  .md-preview ul, .md-preview ol { padding-left: 1.5rem; margin: 0.5rem 0; color: #c5c5c7; }
  .md-preview li { margin: 0.25rem 0; }
  .md-preview .md-checklist { list-style: none; padding-left: 0.25rem; }
  .md-preview .md-checkbox { display: flex; align-items: center; gap: 0.5rem; }
  .md-preview .md-checkbox input { accent-color: #FF6363; }
  .md-preview .md-code-block { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1rem; overflow-x: auto; margin: 0.75rem 0; }
  .md-preview .md-code-block code { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.8rem; color: #e5e5e7; }
  .md-preview .md-inline-code { background: rgba(255,255,255,0.08); padding: 0.15rem 0.4rem; border-radius: 4px; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.85em; color: #FF9F43; }
  .md-preview .md-hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 1.5rem 0; }
  .md-preview .md-table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; font-size: 0.85rem; }
  .md-preview .md-table th { background: rgba(255,255,255,0.06); padding: 0.5rem 0.75rem; text-align: left; font-weight: 600; color: #f5f5f7; border: 1px solid rgba(255,255,255,0.1); }
  .md-preview .md-table td { padding: 0.5rem 0.75rem; border: 1px solid rgba(255,255,255,0.08); color: #c5c5c7; }
  .md-preview .md-table tr:hover td { background: rgba(255,255,255,0.03); }
  .md-preview .md-img { max-width: 100%; border-radius: 8px; margin: 0.5rem 0; }
`;

function buildHtmlDocument(html) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Markdown Export</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; line-height: 1.7; }
  h1 { font-size: 2rem; border-bottom: 2px solid #eee; padding-bottom: 0.5rem; }
  h2 { font-size: 1.5rem; margin-top: 1.5rem; }
  h3 { font-size: 1.2rem; }
  a { color: #0066cc; }
  blockquote { border-left: 3px solid #ccc; padding-left: 1rem; color: #555; margin: 1rem 0; }
  pre { background: #f5f5f5; padding: 1rem; border-radius: 6px; overflow-x: auto; }
  code { font-family: 'SF Mono', monospace; font-size: 0.9em; }
  p code { background: #f0f0f0; padding: 0.1rem 0.3rem; border-radius: 3px; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
  th, td { border: 1px solid #ddd; padding: 0.5rem 0.75rem; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  hr { border: none; border-top: 1px solid #eee; margin: 2rem 0; }
  img { max-width: 100%; }
  del { color: #999; }
</style>
</head>
<body>${html}</body>
</html>`;
}

export default function MarkdownEditor() {
  const [markdown, setMarkdown] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      return saved || DEFAULT_CONTENT;
    } catch { return DEFAULT_CONTENT; }
  });
  const [view, setView] = useState('split');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(null);
  const textareaRef = useRef(null);
  const saveTimerRef = useRef(null);

  // Auto-save to localStorage (debounced 500ms)
  useEffect(() => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, markdown); } catch {}
    }, 500);
    return () => clearTimeout(saveTimerRef.current);
  }, [markdown]);

  // Stats
  const charCount = markdown.length;
  const wordCount = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  const lineCount = markdown.split('\n').length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const html = parseMarkdown(markdown);

  const insertToolbar = useCallback((item) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = markdown.slice(start, end);
    let newText;
    let cursorPos;
    if (item.wrap) {
      const after = item.insertAfter || item.insert;
      newText = markdown.slice(0, start) + item.insert + selected + after + markdown.slice(end);
      cursorPos = start + item.insert.length + selected.length;
    } else {
      newText = markdown.slice(0, start) + item.insert + markdown.slice(start);
      cursorPos = start + item.insert.length;
    }
    setMarkdown(newText);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursorPos, cursorPos);
    });
  }, [markdown]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;
      if (e.key === 'b') { e.preventDefault(); insertToolbar({ insert: '**', wrap: true }); }
      else if (e.key === 'i') { e.preventDefault(); insertToolbar({ insert: '*', wrap: true }); }
      else if (e.key === 'k') { e.preventDefault(); insertToolbar({ insert: '[text](url)', wrap: false }); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [insertToolbar]);

  // Fullscreen escape
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e) => { if (e.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen]);

  const showFeedback = (msg) => {
    setCopyFeedback(msg);
    setTimeout(() => setCopyFeedback(null), 1500);
  };

  const copyHTML = () => { navigator.clipboard.writeText(html); showFeedback('HTML copied!'); };
  const copyMarkdown = () => { navigator.clipboard.writeText(markdown); showFeedback('Markdown copied!'); };

  const downloadMD = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'document.md';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadHTML = () => {
    const fullHtml = buildHtmlDocument(html);
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'document.html';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 flex flex-col p-6 overflow-auto'
    : '';
  const containerStyle = isFullscreen
    ? { background: '#1a1a1c' }
    : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={containerClass}
      style={containerStyle}
    >
      <style>{PREVIEW_STYLES}</style>

      {/* Copy feedback toast */}
      <AnimatePresence>
        {copyFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-6 right-6 z-[60] px-4 py-2 rounded-xl text-sm font-medium text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
          >
            {copyFeedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1 flex-wrap">
          {TOOLBAR.map((t, i) =>
            t.sep ? (
              <div key={`sep-${i}`} className="w-px h-5 mx-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
            ) : (
              <motion.button
                key={t.label}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => insertToolbar(t)}
                title={t.shortcut ? `${t.label} (${t.shortcut})` : t.label}
                className="min-w-[36px] h-8 px-2 py-1 text-xs hover:bg-white/10 text-surface-300 hover:text-white rounded-lg font-mono transition-colors flex items-center justify-center"
              >
                {t.icon}
              </motion.button>
            )
          )}
        </div>
        <div className="ml-auto flex gap-1 items-center">
          {['split', 'edit', 'preview'].map((v) => (
            <motion.button
              key={v}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors capitalize ${
                view === v ? 'text-white' : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'
              }`}
              style={view === v ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : {}}
            >
              {v}
            </motion.button>
          ))}
          <div className="w-px h-5 mx-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsFullscreen((f) => !f)}
            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
            className="min-w-[36px] h-8 px-2 py-1 text-sm hover:bg-white/10 text-surface-300 hover:text-white rounded-lg transition-colors flex items-center justify-center"
          >
            {isFullscreen ? '⊗' : '⛶'}
          </motion.button>
        </div>
      </div>

      {/* Editor + Preview */}
      <div className={`grid gap-4 ${view === 'split' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} ${isFullscreen ? 'flex-1 min-h-0' : ''}`}>
        {view !== 'preview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl p-4"
            style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <textarea
              ref={textareaRef}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm resize-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                height: isFullscreen ? '100%' : '20rem',
                minHeight: '12rem',
              }}
              placeholder="Write markdown here..."
              spellCheck={false}
            />
          </motion.div>
        )}
        {view !== 'edit' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl p-4 overflow-hidden"
            style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div
              className="md-preview max-w-none overflow-y-auto text-sm"
              style={{ height: isFullscreen ? '100%' : '20rem' }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </motion.div>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-4 mt-4 px-1">
        {[
          { label: 'Characters', value: charCount.toLocaleString() },
          { label: 'Words', value: wordCount.toLocaleString() },
          { label: 'Lines', value: lineCount.toLocaleString() },
          { label: 'Reading time', value: `~${readingTime} min` },
        ].map((s) => (
          <span key={s.label} className="text-xs text-surface-500">
            <span className="text-surface-400 font-medium">{s.value}</span>{' '}{s.label.toLowerCase()}
          </span>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mt-4">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={copyMarkdown}
          className="px-4 py-2 text-white rounded-xl font-medium transition-colors text-sm"
          style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
        >
          Copy Markdown
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={copyHTML}
          className="px-4 py-2 text-white rounded-xl font-medium transition-colors text-sm"
          style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
        >
          Copy HTML
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={downloadMD}
          className="px-4 py-2 hover:bg-white/10 text-surface-300 rounded-xl font-medium transition-colors text-sm"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        >
          Download .md
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={downloadHTML}
          className="px-4 py-2 hover:bg-white/10 text-surface-300 rounded-xl font-medium transition-colors text-sm"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        >
          Download HTML
        </motion.button>
      </div>
    </motion.div>
  );
}
