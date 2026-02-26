import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import FileUpload from '../../common/FileUpload';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const APPLY_OPTIONS = [
  { id: 'all', label: 'All pages' },
  { id: 'current', label: 'Current page' },
  { id: 'custom', label: 'Custom range' },
];

// Convert mm to PDF points (1mm ≈ 2.835pt)
const mmToPt = (mm) => mm * 2.835;

export default function PDFCrop() {
  const [file, setFile] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Crop margins in mm
  const [cropTop, setCropTop] = useState(0);
  const [cropRight, setCropRight] = useState(0);
  const [cropBottom, setCropBottom] = useState(0);
  const [cropLeft, setCropLeft] = useState(0);
  const [applyTo, setApplyTo] = useState('all');
  const [customRange, setCustomRange] = useState('');

  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [pageDims, setPageDims] = useState({ width: 0, height: 0 });

  const step = result ? 'done' : file ? 'configure' : 'upload';

  const handleFileSelected = async (files) => {
    const f = files[0];
    setFile(f);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const arrayBuffer = await f.arrayBuffer();
      setPdfBytes(new Uint8Array(arrayBuffer));
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
    } catch (e) {
      setError('Failed to load PDF: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Render current page preview
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;
    (async () => {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1 });
      const container = canvasRef.current.parentElement;
      const containerWidth = container?.clientWidth || 600;
      const scale = containerWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });
      canvasRef.current.width = scaledViewport.width;
      canvasRef.current.height = scaledViewport.height;
      if (cancelled) return;
      const ctx = canvasRef.current.getContext('2d');
      await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
      setPageDims({ width: scaledViewport.width, height: scaledViewport.height, pdfWidth: viewport.width, pdfHeight: viewport.height });
    })();
    return () => { cancelled = true; };
  }, [pdfDoc, currentPage]);

  // Draw crop overlay
  useEffect(() => {
    if (!overlayRef.current || !pageDims.pdfWidth) return;
    const canvas = overlayRef.current;
    canvas.width = pageDims.width;
    canvas.height = pageDims.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scale = pageDims.width / pageDims.pdfWidth;
    const topPx = mmToPt(cropTop) * scale;
    const rightPx = mmToPt(cropRight) * scale;
    const bottomPx = mmToPt(cropBottom) * scale;
    const leftPx = mmToPt(cropLeft) * scale;

    // Draw semi-transparent overlay on cropped areas
    ctx.fillStyle = 'rgba(255, 99, 99, 0.3)';
    // Top strip
    ctx.fillRect(0, 0, canvas.width, topPx);
    // Bottom strip
    ctx.fillRect(0, canvas.height - bottomPx, canvas.width, bottomPx);
    // Left strip
    ctx.fillRect(0, topPx, leftPx, canvas.height - topPx - bottomPx);
    // Right strip
    ctx.fillRect(canvas.width - rightPx, topPx, rightPx, canvas.height - topPx - bottomPx);

    // Draw crop border
    ctx.strokeStyle = '#FF6363';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(leftPx, topPx, canvas.width - leftPx - rightPx, canvas.height - topPx - bottomPx);
  }, [cropTop, cropRight, cropBottom, cropLeft, pageDims]);

  const parseRange = useCallback((rangeStr, total) => {
    const pages = new Set();
    rangeStr.split(',').forEach((part) => {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [a, b] = trimmed.split('-').map(Number);
        if (!isNaN(a) && !isNaN(b)) {
          for (let i = Math.max(1, a); i <= Math.min(total, b); i++) pages.add(i);
        }
      } else {
        const n = parseInt(trimmed, 10);
        if (!isNaN(n) && n >= 1 && n <= total) pages.add(n);
      }
    });
    return pages;
  }, []);

  const handleCrop = useCallback(async () => {
    if (!pdfBytes) return;
    setProcessing(true);
    setError(null);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfDocLib = await PDFDocument.load(pdfBytes);
      const pages = pdfDocLib.getPages();

      let targetPages;
      if (applyTo === 'all') {
        targetPages = new Set(pages.map((_, i) => i + 1));
      } else if (applyTo === 'current') {
        targetPages = new Set([currentPage]);
      } else {
        targetPages = parseRange(customRange, pages.length);
        if (targetPages.size === 0) {
          setError('Invalid page range. Use format like: 1-3, 5, 8-10');
          setProcessing(false);
          return;
        }
      }

      const topPt = mmToPt(cropTop);
      const rightPt = mmToPt(cropRight);
      const bottomPt = mmToPt(cropBottom);
      const leftPt = mmToPt(cropLeft);

      pages.forEach((page, idx) => {
        if (!targetPages.has(idx + 1)) return;
        const { width, height } = page.getSize();
        const newX = leftPt;
        const newY = bottomPt;
        const newW = width - leftPt - rightPt;
        const newH = height - topPt - bottomPt;
        if (newW <= 0 || newH <= 0) return;
        page.setCropBox(newX, newY, newW, newH);
        page.setMediaBox(newX, newY, newW, newH);
      });

      const savedBytes = await pdfDocLib.save();
      const blob = new Blob([savedBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const outputName = file.name.replace(/\.pdf$/i, '') + '_cropped.pdf';
      setResult({ downloadUrl: blobUrl, outputName });
    } catch (e) {
      setError('Failed to crop PDF: ' + e.message);
    } finally {
      setProcessing(false);
    }
  }, [pdfBytes, cropTop, cropRight, cropBottom, cropLeft, applyTo, currentPage, customRange, parseRange, file]);

  const reset = () => {
    if (result?.downloadUrl?.startsWith('blob:')) URL.revokeObjectURL(result.downloadUrl);
    setFile(null);
    setPdfDoc(null);
    setPdfBytes(null);
    setResult(null);
    setError(null);
    setCropTop(0);
    setCropRight(0);
    setCropBottom(0);
    setCropLeft(0);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FileUpload onFilesSelected={handleFileSelected} accept=".pdf,application/pdf" multiple={false} />
          </motion.div>
        )}

        {step === 'configure' && !processing && (
          <motion.div key="configure" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            {/* File info */}
            <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-lg">✂️</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-100 truncate">{file?.name}</p>
                <p className="text-xs text-surface-500">{(file?.size / 1024 / 1024).toFixed(2)} MB · {totalPages} page{totalPages !== 1 ? 's' : ''}</p>
              </div>
              <button type="button" onClick={reset} className="text-xs text-surface-400 hover:text-red-500 transition-colors">Change</button>
            </div>

            {/* Page preview with crop overlay */}
            <div className="relative rounded-xl overflow-hidden" style={{ background: '#525659' }}>
              {loading && (
                <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: 'rgba(30,30,30,0.8)' }}>
                  <svg className="w-8 h-8 animate-spin text-primary-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                </div>
              )}
              <canvas ref={canvasRef} className="w-full block" />
              <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />
            </div>

            {/* Page navigation */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 p-2 rounded-xl" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} className="h-8 px-3 rounded-lg text-xs font-medium text-surface-300 hover:text-surface-100 disabled:opacity-30 transition-all" style={{ background: 'rgba(255,255,255,0.06)' }}>← Prev</button>
                <span className="text-sm text-surface-300 font-medium tabular-nums">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="h-8 px-3 rounded-lg text-xs font-medium text-surface-300 hover:text-surface-100 disabled:opacity-30 transition-all" style={{ background: 'rgba(255,255,255,0.06)' }}>Next →</button>
              </div>
            )}

            {/* Crop margins */}
            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-3">Crop margins (mm)</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Top', cropTop, setCropTop],
                  ['Right', cropRight, setCropRight],
                  ['Bottom', cropBottom, setCropBottom],
                  ['Left', cropLeft, setCropLeft],
                ].map(([label, value, setter]) => (
                  <div key={label}>
                    <label className="block text-xs text-surface-400 mb-1">{label}</label>
                    <input type="number" min="0" max="200" value={value} onChange={(e) => setter(Math.max(0, parseFloat(e.target.value) || 0))} className="w-full px-3 py-2 rounded-xl text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Apply to */}
            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-2">Apply to</label>
              <div className="flex gap-2">
                {APPLY_OPTIONS.map((opt) => (
                  <button key={opt.id} type="button" onClick={() => setApplyTo(opt.id)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${applyTo === opt.id ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`} style={applyTo === opt.id ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {applyTo === 'custom' && (
                <input type="text" value={customRange} onChange={(e) => setCustomRange(e.target.value)} placeholder="e.g. 1-3, 5, 8-10" className="w-full mt-2 px-4 py-3 rounded-xl text-sm text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
              )}
            </div>

            <motion.button type="button" onClick={handleCrop} disabled={cropTop === 0 && cropRight === 0 && cropBottom === 0 && cropLeft === 0} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full min-h-[52px] rounded-2xl text-base font-bold text-white shadow-lg shadow-primary-500/20 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
              ✂️ Crop PDF
            </motion.button>
          </motion.div>
        )}

        {processing && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 py-12">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <svg className="w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            </motion.div>
            <p className="text-sm text-surface-400">Cropping PDF…</p>
          </motion.div>
        )}

        {step === 'done' && result && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="flex flex-col items-center gap-4 p-6 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(255,99,99,0.08), rgba(16,185,129,0.08))', border: '1px solid rgba(255,99,99,0.15)' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }} className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </motion.div>
              <p className="text-sm font-semibold text-surface-100">PDF cropped successfully!</p>
              <a href={result.downloadUrl} download={result.outputName} className="w-full flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-2xl text-sm font-semibold text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download Cropped PDF
              </a>
              <p className="text-xs text-surface-500 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                100% client-side — your PDF never left your browser
              </p>
            </div>
            <div className="text-center">
              <button type="button" onClick={reset} className="text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors">Crop another PDF →</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-500 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </motion.div>
      )}
    </motion.div>
  );
}
