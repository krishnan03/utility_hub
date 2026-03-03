import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import FileUpload from '../../common/FileUpload';

export default function PDFRedact() {
  const [file, setFile] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [canvasDims, setCanvasDims] = useState({ width: 800, height: 600 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Redaction rectangles keyed by page: { 1: [{ x, y, w, h }], ... }
  const [redactions, setRedactions] = useState({});

  const pdfCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);

  const step = result ? 'done' : file ? 'configure' : 'upload';

  const handleFileSelected = async (files) => {
    const f = files[0];
    setFile(f);
    setLoading(true);
    setRedactions({});
    setResult(null);
    setError(null);
    try {
      const arrayBuffer = await f.arrayBuffer();
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
    } catch (e) {
      setError('Failed to load PDF: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Get position relative to overlay canvas
  const getPos = useCallback((e) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  // Redraw overlay with all redaction rects for current page
  const redrawOverlay = useCallback((pageRects, previewRect) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw committed redactions
    (pageRects || []).forEach((r) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      // Subtle border
      ctx.strokeStyle = 'rgba(255, 99, 99, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    });

    // Draw in-progress preview rect
    if (previewRect) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(previewRect.x, previewRect.y, previewRect.w, previewRect.h);
      ctx.strokeStyle = '#FF6363';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(previewRect.x, previewRect.y, previewRect.w, previewRect.h);
      ctx.setLineDash([]);
    }
  }, []);

  // Render PDF page
  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current) return;
    let cancelled = false;
    (async () => {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1 });
      const container = pdfCanvasRef.current.parentElement;
      const containerWidth = container?.clientWidth || 800;
      const scale = containerWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      pdfCanvasRef.current.width = scaledViewport.width;
      pdfCanvasRef.current.height = scaledViewport.height;
      if (cancelled) return;

      const ctx = pdfCanvasRef.current.getContext('2d');
      await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
      setCanvasDims({ width: scaledViewport.width, height: scaledViewport.height });

      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.width = scaledViewport.width;
        overlayCanvasRef.current.height = scaledViewport.height;
        redrawOverlay(redactions[currentPage] || []);
      }
    })();
    return () => { cancelled = true; };
  }, [pdfDoc, currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redraw overlay when redactions change
  useEffect(() => {
    redrawOverlay(redactions[currentPage] || []);
  }, [redactions, currentPage, redrawOverlay]);

  // Pointer handlers for drawing redaction rects
  const handlePointerDown = useCallback((e) => {
    const pos = getPos(e);
    setIsDrawing(true);
    setDrawStart(pos);
  }, [getPos]);

  const handlePointerMove = useCallback((e) => {
    if (!isDrawing || !drawStart) return;
    const pos = getPos(e);
    const previewRect = {
      x: Math.min(drawStart.x, pos.x),
      y: Math.min(drawStart.y, pos.y),
      w: Math.abs(pos.x - drawStart.x),
      h: Math.abs(pos.y - drawStart.y),
    };
    redrawOverlay(redactions[currentPage] || [], previewRect);
  }, [isDrawing, drawStart, getPos, redactions, currentPage, redrawOverlay]);

  const handlePointerUp = useCallback((e) => {
    if (!isDrawing || !drawStart) return;
    setIsDrawing(false);
    const pos = getPos(e);
    const w = Math.abs(pos.x - drawStart.x);
    const h = Math.abs(pos.y - drawStart.y);

    // Ignore tiny accidental clicks
    if (w < 5 || h < 5) {
      setDrawStart(null);
      return;
    }

    const newRect = {
      x: Math.min(drawStart.x, pos.x),
      y: Math.min(drawStart.y, pos.y),
      w,
      h,
    };
    setRedactions((prev) => ({
      ...prev,
      [currentPage]: [...(prev[currentPage] || []), newRect],
    }));
    setDrawStart(null);
  }, [isDrawing, drawStart, getPos, currentPage]);

  const undoLast = useCallback(() => {
    setRedactions((prev) => {
      const pageRects = prev[currentPage] || [];
      if (pageRects.length === 0) return prev;
      return { ...prev, [currentPage]: pageRects.slice(0, -1) };
    });
  }, [currentPage]);

  const clearPage = useCallback(() => {
    setRedactions((prev) => ({ ...prev, [currentPage]: [] }));
  }, [currentPage]);

  // Save: flatten each page to canvas with black rects, embed as JPEG in new pdf-lib doc
  const handleSave = useCallback(async () => {
    if (!pdfDoc || !file) return;
    setSaving(true);
    setError(null);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const newPdf = await PDFDocument.create();

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 }); // 2x for quality

        const offscreen = document.createElement('canvas');
        offscreen.width = viewport.width;
        offscreen.height = viewport.height;
        const ctx = offscreen.getContext('2d');

        // Render PDF page
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Draw black redaction rects on top
        const pageRects = redactions[pageNum] || [];
        if (pageRects.length > 0) {
          const scaleX = viewport.width / canvasDims.width;
          const scaleY = viewport.height / canvasDims.height;

          ctx.fillStyle = '#000000';
          pageRects.forEach((r) => {
            ctx.fillRect(r.x * scaleX, r.y * scaleY, r.w * scaleX, r.h * scaleY);
          });
        }

        // Embed as JPEG
        const jpegDataUrl = offscreen.toDataURL('image/jpeg', 0.92);
        const jpegBytes = Uint8Array.from(atob(jpegDataUrl.split(',')[1]), (c) => c.charCodeAt(0));
        const jpegImage = await newPdf.embedJpg(jpegBytes);

        const origViewport = page.getViewport({ scale: 1 });
        const newPage = newPdf.addPage([origViewport.width, origViewport.height]);
        newPage.drawImage(jpegImage, {
          x: 0,
          y: 0,
          width: origViewport.width,
          height: origViewport.height,
        });
      }

      const savedBytes = await newPdf.save();
      const blob = new Blob([savedBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const outputName = file.name.replace(/\.pdf$/i, '') + '_redacted.pdf';
      setResult({ downloadUrl: blobUrl, outputName });
    } catch (e) {
      setError('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  }, [pdfDoc, file, totalPages, redactions, canvasDims]);

  const reset = () => {
    if (result?.downloadUrl?.startsWith('blob:')) URL.revokeObjectURL(result.downloadUrl);
    if (pdfDoc) pdfDoc.destroy().catch(() => {});
    setFile(null);
    setPdfDoc(null);
    setTotalPages(0);
    setCurrentPage(1);
    setRedactions({});
    setResult(null);
    setError(null);
  };

  const totalRedactions = Object.values(redactions).flat().length;
  const pageRedactions = (redactions[currentPage] || []).length;

  // Step 1: Upload
  if (!file) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-surface-100 mb-1">PDF Redact</h2>
          <p className="text-sm text-surface-500">Black out sensitive content in your PDFs — 100% in your browser</p>
        </div>
        <FileUpload onFilesSelected={handleFileSelected} accept=".pdf,application/pdf" multiple={false} />
      </motion.div>
    );
  }

  // Step 3: Result
  if (result) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
        <div className="flex flex-col items-center gap-4 p-6 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(255,99,99,0.08), rgba(16,185,129,0.08))', border: '1px solid rgba(255,99,99,0.15)' }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }} className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </motion.div>
          <p className="text-sm font-semibold text-surface-100">PDF redacted successfully!</p>
          <p className="text-xs text-surface-400">{totalRedactions} area{totalRedactions !== 1 ? 's' : ''} redacted</p>
          <a href={result.downloadUrl} download={result.outputName} className="w-full flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-2xl text-sm font-semibold text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download Redacted PDF
          </a>
          <p className="text-xs text-surface-500 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            100% client-side — your PDF never left your browser
          </p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => setResult(null)} className="flex-1 py-3 rounded-2xl text-sm font-medium text-surface-300 hover:text-surface-100 transition-colors" style={{ background: 'rgba(255,255,255,0.06)' }}>Continue Editing</button>
          <button type="button" onClick={reset} className="flex-1 py-3 rounded-2xl text-sm font-medium text-surface-300 hover:text-surface-100 transition-colors" style={{ background: 'rgba(255,255,255,0.06)' }}>Redact Another PDF</button>
        </div>
      </motion.div>
    );
  }

  // Step 2: Configure — Editor
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      {/* File info bar */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">📄</span>
          <span className="text-sm font-medium text-surface-200 truncate">{file.name}</span>
          <span className="text-xs text-surface-500 shrink-0">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
          {totalPages > 0 && <span className="text-xs text-surface-500 shrink-0">· {totalPages} page{totalPages !== 1 ? 's' : ''}</span>}
        </div>
        <button type="button" onClick={reset} className="text-xs text-surface-500 hover:text-red-400 transition-colors shrink-0 ml-2">✕ Close</button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg text-sm font-bold flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
            ■
          </div>
          <span className="text-xs text-surface-400">Draw rectangles to redact</span>
        </div>

        <div className="w-px h-6 bg-white/10" />

        <button type="button" onClick={undoLast} disabled={pageRedactions === 0} className="h-8 px-3 rounded-lg text-xs font-medium text-surface-300 hover:text-surface-100 disabled:opacity-30 transition-all" style={{ background: 'rgba(255,255,255,0.06)' }} title="Undo last">
          ↩ Undo
        </button>
        <button type="button" onClick={clearPage} disabled={pageRedactions === 0} className="h-8 px-3 rounded-lg text-xs font-medium text-surface-300 hover:text-red-400 disabled:opacity-30 transition-all" style={{ background: 'rgba(255,255,255,0.06)' }}>
          🗑 Clear Page
        </button>

        <div className="ml-auto">
          <button type="button" onClick={handleSave} disabled={saving || totalRedactions === 0} className="h-9 px-4 rounded-lg text-sm font-bold text-white disabled:opacity-50 transition-all" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Saving…
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Save Redacted PDF {totalRedactions > 0 ? `(${totalRedactions})` : ''}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Hint */}
      <div className="flex items-start gap-3 p-3 rounded-xl text-xs" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
        <span className="text-primary-400 text-base shrink-0">💡</span>
        <div className="text-surface-400">
          <p><span className="text-surface-200 font-medium">Redact tool:</span> Click and drag to draw black rectangles over sensitive content.</p>
          <p className="mt-0.5">Redacted areas are permanently flattened into the PDF — the original text cannot be recovered.</p>
        </div>
      </div>

      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 p-2 rounded-xl" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} className="h-8 px-3 rounded-lg text-xs font-medium text-surface-300 hover:text-surface-100 disabled:opacity-30 transition-all" style={{ background: 'rgba(255,255,255,0.06)' }}>← Prev</button>
          <span className="text-sm text-surface-300 font-medium tabular-nums">Page {currentPage} of {totalPages}</span>
          <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="h-8 px-3 rounded-lg text-xs font-medium text-surface-300 hover:text-surface-100 disabled:opacity-30 transition-all" style={{ background: 'rgba(255,255,255,0.06)' }}>Next →</button>
        </div>
      )}

      {/* Canvas area */}
      <div className="relative rounded-xl overflow-hidden" style={{ background: '#525659' }}>
        {loading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: 'rgba(30,30,30,0.8)' }}>
            <svg className="w-8 h-8 animate-spin text-primary-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          </div>
        )}
        <canvas ref={pdfCanvasRef} className="w-full block" />
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
      </div>

      {/* Annotation count */}
      {totalRedactions > 0 && (
        <p className="text-xs text-surface-500 text-center">
          {totalRedactions} redaction{totalRedactions !== 1 ? 's' : ''} total
          {totalPages > 1 ? ` (${pageRedactions} on this page)` : ''}
          {' '}· Click &quot;Save Redacted PDF&quot; to download
        </p>
      )}

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-xl text-sm text-red-400 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </motion.div>
      )}
    </motion.div>
  );
}
