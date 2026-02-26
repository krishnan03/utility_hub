import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function GlassCard({ children, className = '', style = {}, ...props }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: 'rgba(44,44,46,0.8)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

function diffTexts(text1, text2) {
  const lines1 = text1.split('\n');
  const lines2 = text2.split('\n');
  const result = [];
  const maxLen = Math.max(lines1.length, lines2.length);

  for (let i = 0; i < maxLen; i++) {
    const l1 = lines1[i] || '';
    const l2 = lines2[i] || '';
    if (l1 === l2) {
      result.push({ type: 'equal', left: l1, right: l2 });
    } else if (!l1) {
      result.push({ type: 'add', left: '', right: l2 });
    } else if (!l2) {
      result.push({ type: 'remove', left: l1, right: '' });
    } else {
      result.push({ type: 'change', left: l1, right: l2 });
    }
  }
  return result;
}

async function extractPdfText(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str).join(' ');
    pages.push(text);
  }
  return { pdf, pages, numPages: pdf.numPages };
}

async function renderPdfPage(pdf, pageNum, canvas, scale = 1.2) {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
}

const DIFF_COLORS = {
  equal: '',
  add: 'bg-emerald-500/15 border-l-2 border-emerald-500',
  remove: 'bg-red-500/15 border-l-2 border-red-500',
  change: 'bg-amber-500/15 border-l-2 border-amber-500',
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PDFCompare() {
  const [originalFile, setOriginalFile] = useState(null);
  const [modifiedFile, setModifiedFile] = useState(null);
  const [originalName, setOriginalName] = useState('');
  const [modifiedName, setModifiedName] = useState('');
  const [originalData, setOriginalData] = useState(null);
  const [modifiedData, setModifiedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('text');
  const [currentPage, setCurrentPage] = useState(1);
  const [diff, setDiff] = useState(null);
  const [stats, setStats] = useState(null);
  const [dragOverOriginal, setDragOverOriginal] = useState(false);
  const [dragOverModified, setDragOverModified] = useState(false);

  const originalInputRef = useRef(null);
  const modifiedInputRef = useRef(null);
  const leftCanvasRef = useRef(null);
  const rightCanvasRef = useRef(null);

  // ─── File handling ───────────────────────────────────────────────────

  const handleFile = useCallback((file, side) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a valid PDF file.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum size is 50 MB.');
      return;
    }
    if (side === 'original') {
      setOriginalFile(file);
      setOriginalName(file.name);
    } else {
      setModifiedFile(file);
      setModifiedName(file.name);
    }
    setError(null);
    setDiff(null);
    setStats(null);
  }, []);

  const handleDrop = useCallback((e, side) => {
    e.preventDefault();
    if (side === 'original') setDragOverOriginal(false);
    else setDragOverModified(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f, side);
  }, [handleFile]);

  // ─── Compare ─────────────────────────────────────────────────────────

  const handleCompare = useCallback(async () => {
    if (!originalFile || !modifiedFile) {
      setError('Please upload both PDFs to compare.');
      return;
    }
    setLoading(true);
    setError(null);
    setDiff(null);
    setStats(null);
    setCurrentPage(1);

    try {
      const [origData, modData] = await Promise.all([
        extractPdfText(originalFile),
        extractPdfText(modifiedFile),
      ]);
      setOriginalData(origData);
      setModifiedData(modData);

      // Build per-page diffs
      const maxPages = Math.max(origData.numPages, modData.numPages);
      const pageDiffs = [];
      let totalAdd = 0, totalRemove = 0, totalChange = 0;

      for (let i = 0; i < maxPages; i++) {
        const t1 = origData.pages[i] || '';
        const t2 = modData.pages[i] || '';
        const d = diffTexts(t1, t2);
        pageDiffs.push(d);
        for (const line of d) {
          if (line.type === 'add') totalAdd++;
          else if (line.type === 'remove') totalRemove++;
          else if (line.type === 'change') totalChange++;
        }
      }

      setDiff(pageDiffs);
      setStats({ additions: totalAdd, deletions: totalRemove, changes: totalChange, pages: maxPages });
    } catch (e) {
      setError(`Comparison failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [originalFile, modifiedFile]);

  // ─── Visual compare — render canvases ────────────────────────────────

  const renderVisualPage = useCallback(async (pageNum) => {
    if (!originalData || !modifiedData) return;
    try {
      if (leftCanvasRef.current && pageNum <= originalData.numPages) {
        await renderPdfPage(originalData.pdf, pageNum, leftCanvasRef.current);
      }
      if (rightCanvasRef.current && pageNum <= modifiedData.numPages) {
        await renderPdfPage(modifiedData.pdf, pageNum, rightCanvasRef.current);
      }
    } catch { /* canvas render error — non-critical */ }
  }, [originalData, modifiedData]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    if (activeTab === 'visual') {
      setTimeout(() => renderVisualPage(page), 50);
    }
  }, [activeTab, renderVisualPage]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    if (tab === 'visual') {
      setTimeout(() => renderVisualPage(currentPage), 50);
    }
  }, [currentPage, renderVisualPage]);

  // ─── Reset ───────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setOriginalFile(null);
    setModifiedFile(null);
    setOriginalName('');
    setModifiedName('');
    setOriginalData(null);
    setModifiedData(null);
    setDiff(null);
    setStats(null);
    setError(null);
    setCurrentPage(1);
    if (originalInputRef.current) originalInputRef.current.value = '';
    if (modifiedInputRef.current) modifiedInputRef.current.value = '';
  }, []);

  const maxPages = stats?.pages || 0;
  const currentDiff = diff?.[currentPage - 1] || [];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">

      {/* ── Upload zones ──────────────────────────────────────────────── */}
      {!diff && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { side: 'original', label: 'Original PDF', file: originalFile, name: originalName, dragOver: dragOverOriginal, setDragOver: setDragOverOriginal, inputRef: originalInputRef },
            { side: 'modified', label: 'Modified PDF', file: modifiedFile, name: modifiedName, dragOver: dragOverModified, setDragOver: setDragOverModified, inputRef: modifiedInputRef },
          ].map(({ side, label, file: f, name, dragOver, setDragOver: setDO, inputRef }) => (
            <div key={side}>
              <label className="block text-sm font-semibold text-surface-300 mb-2">{label}</label>
              <motion.div
                onDragOver={(e) => { e.preventDefault(); setDO(true); }}
                onDragLeave={() => setDO(false)}
                onDrop={(e) => handleDrop(e, side)}
                onClick={() => inputRef.current?.click()}
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                className={`relative flex flex-col items-center justify-center min-h-[160px] rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 ${
                  dragOver
                    ? 'border-primary-500 bg-primary-500/10'
                    : f
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-surface-600 hover:border-surface-500 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <motion.span
                  className="text-4xl mb-2"
                  animate={dragOver ? { y: -6, scale: 1.1 } : { y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  aria-hidden="true"
                >
                  {f ? '✅' : '📄'}
                </motion.span>
                {f ? (
                  <p className="text-sm text-emerald-400 font-semibold truncate max-w-[200px]">{name}</p>
                ) : (
                  <>
                    <p className="text-surface-300 font-semibold text-sm">{dragOver ? 'Drop here' : 'Drag & drop PDF'}</p>
                    <p className="text-surface-500 text-xs">or click to browse · Max 50 MB</p>
                  </>
                )}
                {dragOver && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ background: 'radial-gradient(circle, rgba(255,99,99,0.08) 0%, transparent 70%)' }}
                  />
                )}
              </motion.div>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => { const fl = e.target.files?.[0]; if (fl) handleFile(fl, side); }}
                className="hidden"
                aria-label={`Upload ${label}`}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Compare button ────────────────────────────────────────────── */}
      {!diff && !loading && (
        <motion.button
          type="button"
          onClick={handleCompare}
          disabled={!originalFile || !modifiedFile}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full min-h-[48px] px-6 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
        >
          🔍 Compare PDFs
        </motion.button>
      )}

      {/* ── Loading ───────────────────────────────────────────────────── */}
      {loading && (
        <GlassCard className="p-6 flex items-center justify-center gap-3">
          <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="text-2xl">⏳</motion.span>
          <span className="text-surface-300 font-semibold">Extracting text and comparing…</span>
        </GlassCard>
      )}

      {/* ── Error ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            ⚠️ {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Results ───────────────────────────────────────────────────── */}
      {diff && stats && (
        <>
          {/* Stats bar */}
          <GlassCard className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">📊</span>
                <div>
                  <p className="text-sm font-semibold text-surface-200">{stats.pages} page{stats.pages !== 1 ? 's' : ''} compared</p>
                  <p className="text-xs text-surface-500">{originalName} vs {modifiedName}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono bg-emerald-500/15 text-emerald-400">+{stats.additions} added</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono bg-red-500/15 text-red-400">−{stats.deletions} removed</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono bg-amber-500/15 text-amber-400">~{stats.changes} changed</span>
              </div>
            </div>
          </GlassCard>

          {/* Tabs */}
          <div className="flex gap-2">
            {[
              { id: 'text', label: '📝 Text Diff' },
              { id: 'visual', label: '👁️ Visual Compare' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'text-surface-400 hover:text-surface-300 hover:bg-white/[0.04]'
                }`}
                style={activeTab === tab.id ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : {}}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Page selector */}
          {maxPages > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-surface-500 font-semibold">Page:</span>
              {Array.from({ length: maxPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePageChange(p)}
                  className={`min-w-[36px] min-h-[36px] px-2 py-1 rounded-lg text-xs font-mono transition-all ${
                    currentPage === p
                      ? 'text-white bg-primary-500'
                      : 'text-surface-400 hover:text-surface-300 bg-white/[0.04] hover:bg-white/[0.08]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Text Diff tab */}
          {activeTab === 'text' && (
            <GlassCard className="p-0 overflow-hidden">
              {/* Header row */}
              <div className="grid grid-cols-2 border-b border-white/[0.06]">
                <div className="px-4 py-2 text-xs font-bold text-surface-400 uppercase tracking-wider">Original</div>
                <div className="px-4 py-2 text-xs font-bold text-surface-400 uppercase tracking-wider border-l border-white/[0.06]">Modified</div>
              </div>
              {/* Diff lines */}
              <div className="max-h-[500px] overflow-y-auto">
                {currentDiff.length === 0 ? (
                  <div className="p-8 text-center text-surface-500 text-sm">No text found on this page.</div>
                ) : (
                  currentDiff.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-2 text-xs font-mono leading-relaxed">
                      <div className={`px-4 py-1.5 break-all ${DIFF_COLORS[line.type]} ${line.type === 'add' ? 'opacity-30' : ''}`}>
                        <span className="text-surface-600 mr-2 select-none">{idx + 1}</span>
                        {line.left}
                      </div>
                      <div className={`px-4 py-1.5 break-all border-l border-white/[0.06] ${DIFF_COLORS[line.type]} ${line.type === 'remove' ? 'opacity-30' : ''}`}>
                        <span className="text-surface-600 mr-2 select-none">{idx + 1}</span>
                        {line.right}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          )}

          {/* Visual Compare tab */}
          {activeTab === 'visual' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GlassCard className="p-4">
                <p className="text-xs font-semibold text-surface-400 mb-2">Original — Page {currentPage}</p>
                <canvas ref={leftCanvasRef} className="w-full rounded-lg bg-white" style={{ maxHeight: 600 }} />
                {currentPage > (originalData?.numPages || 0) && (
                  <p className="text-xs text-surface-600 mt-2 text-center italic">Page does not exist in original</p>
                )}
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs font-semibold text-surface-400 mb-2">Modified — Page {currentPage}</p>
                <canvas ref={rightCanvasRef} className="w-full rounded-lg bg-white" style={{ maxHeight: 600 }} />
                {currentPage > (modifiedData?.numPages || 0) && (
                  <p className="text-xs text-surface-600 mt-2 text-center italic">Page does not exist in modified</p>
                )}
              </GlassCard>
            </div>
          )}

          {/* Reset */}
          <button
            type="button"
            onClick={handleReset}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-sm text-surface-500 hover:text-surface-300 hover:bg-white/[0.04] transition-colors"
          >
            ← Compare different PDFs
          </button>
        </>
      )}

    </motion.div>
  );
}
