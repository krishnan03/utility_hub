import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; padding: 20px; color: #333; }
    h1 { color: #1a1a2e; border-bottom: 2px solid #e94560; padding-bottom: 10px; }
    p { line-height: 1.8; }
    .highlight { background: #fff3cd; padding: 2px 6px; border-radius: 3px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #f8f9fa; }
  </style>
</head>
<body>
  <h1>Sample Document</h1>
  <p>This is a <span class="highlight">live preview</span> of your HTML content. Edit the code on the left to see changes in real time.</p>
  <table>
    <tr><th>Feature</th><th>Status</th></tr>
    <tr><td>Live Preview</td><td>✅ Active</td></tr>
    <tr><td>CSS Support</td><td>✅ Full</td></tr>
    <tr><td>Print to PDF</td><td>✅ Ready</td></tr>
  </table>
  <p>Click <strong>"Download as PDF"</strong> to save this as a PDF using your browser's built-in renderer.</p>
</body>
</html>`;

export default function HTMLToPDF() {
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [previewHtml, setPreviewHtml] = useState(DEFAULT_HTML);
  const [showPreview, setShowPreview] = useState(true);
  const iframeRef = useRef(null);
  const debounceRef = useRef(null);
  const fileInputRef = useRef(null);

  // Debounced preview update
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPreviewHtml(html);
    }, 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [html]);

  const handlePrintPdf = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch {
      // Fallback: open in new window for printing
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        win.print();
      }
    }
  }, [html]);

  const handleDownloadHtml = useCallback(() => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.html';
    a.click();
    URL.revokeObjectURL(url);
  }, [html]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === 'string') setHtml(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const handleClear = () => setHtml('');

  const lineCount = html.split('\n').length;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 rounded-xl text-xs font-medium text-surface-300 transition-all min-h-[40px] hover:border-primary-500/30"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          📂 Upload .html
        </button>
        <input ref={fileInputRef} type="file" accept=".html,.htm,text/html" onChange={handleFileUpload} className="hidden" />

        <button
          type="button"
          onClick={() => setHtml(DEFAULT_HTML)}
          className="px-3 py-2 rounded-xl text-xs font-medium text-surface-300 transition-all min-h-[40px] hover:border-primary-500/30"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          📝 Load Example
        </button>

        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-2 rounded-xl text-xs font-medium text-surface-300 transition-all min-h-[40px] hover:border-red-500/30"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          🗑️ Clear
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`px-3 py-2 rounded-xl text-xs font-medium transition-all min-h-[40px] ${
            showPreview ? 'text-primary-400 bg-primary-500/10 border border-primary-500/30' : 'text-surface-300'
          }`}
          style={!showPreview ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' } : undefined}
        >
          {showPreview ? '👁️ Preview On' : '👁️ Preview Off'}
        </button>
      </div>

      {/* Editor + Preview */}
      <div className={`grid gap-4 ${showPreview ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* HTML Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider">HTML Code</label>
            <span className="text-[10px] text-surface-500 font-mono">{lineCount} lines</span>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              spellCheck={false}
              className="w-full h-80 lg:h-[420px] p-4 bg-transparent text-sm text-surface-200 font-mono leading-relaxed resize-none focus:outline-none placeholder-surface-600"
              placeholder="Paste or type your HTML here..."
            />
          </div>
        </div>

        {/* Live Preview */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-2"
            >
              <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Live Preview</label>
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <iframe
                  ref={iframeRef}
                  title="HTML Preview"
                  srcDoc={previewHtml}
                  sandbox="allow-same-origin"
                  className="w-full h-80 lg:h-[420px] bg-white rounded-2xl"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <motion.button
          type="button"
          onClick={handlePrintPdf}
          disabled={!html.trim()}
          whileHover={{ scale: html.trim() ? 1.01 : 1 }}
          whileTap={{ scale: html.trim() ? 0.99 : 1 }}
          className="flex-1 flex items-center justify-center gap-2 min-h-[52px] px-6 py-3 rounded-2xl text-base font-bold text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" /></svg>
          Download as PDF
        </motion.button>

        <motion.button
          type="button"
          onClick={handleDownloadHtml}
          disabled={!html.trim()}
          whileHover={{ scale: html.trim() ? 1.01 : 1 }}
          whileTap={{ scale: html.trim() ? 0.99 : 1 }}
          className="flex items-center justify-center gap-2 min-h-[52px] px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          .HTML
        </motion.button>
      </div>

      {/* Tip */}
      <div className="p-3 rounded-xl text-xs text-surface-400 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
        💡 "Download as PDF" opens your browser's print dialog — select "Save as PDF" as the destination. This uses your browser's native rendering engine for pixel-perfect results.
      </div>
    </motion.div>
  );
}
