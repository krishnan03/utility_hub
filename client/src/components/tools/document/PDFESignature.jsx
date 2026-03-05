import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import FileUpload from '../../common/FileUpload';
import ProgressBar from '../../common/ProgressBar';

export default function PDFESignature() {
  // ── File & PDF state ─────────────────────────────────────────────────
  const [file, setFile] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageDims, setPageDims] = useState({ width: 800, height: 600 });
  const [loading, setLoading] = useState(false);

  // ── Signature creation state ─────────────────────────────────────────
  const [sigType, setSigType] = useState('draw'); // 'draw' | 'type'
  const [sigText, setSigText] = useState('');
  const [sigDataUrl, setSigDataUrl] = useState(null);
  const [showSigModal, setShowSigModal] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const sigCanvasRef = useRef(null);
  const lastPos = useRef(null);

  // ── Signature placement state ────────────────────────────────────────
  const [sigPlaced, setSigPlaced] = useState(false);
  const [sigPos, setSigPos] = useState({ x: 0, y: 0 });
  const [sigSize, setSigSize] = useState({ width: 200, height: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStart = useRef(null);

  // ── PDF canvas ref ───────────────────────────────────────────────────
  const pdfCanvasRef = useRef(null);
  const containerRef = useRef(null);

  // ── Result state ─────────────────────────────────────────────────────
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // ── PDF Loading ──────────────────────────────────────────────────────
  const handleFileSelected = async (files) => {
    const f = files[0];
    setFile(f);
    setLoading(true);
    setResult(null);
    setError(null);
    setSigPlaced(false);
    setSigDataUrl(null);

    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
      const arrayBuffer = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
    } catch (err) {
      setError('Failed to load PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Render PDF page ──────────────────────────────────────────────────
  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current) return;
    const render = async () => {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1 });
      const container = containerRef.current;
      const containerWidth = container?.clientWidth || 800;
      const scale = containerWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      const canvas = pdfCanvasRef.current;
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      setPageDims({ width: scaledViewport.width, height: scaledViewport.height });

      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
    };
    render();
  }, [pdfDoc, currentPage]);

  // ── Signature drawing helpers ──────────────────────────────────────
  const getCanvasPos = (e) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    lastPos.current = getCanvasPos(e);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing || !sigCanvasRef.current) return;
    const ctx = sigCanvasRef.current.getContext('2d');
    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => setIsDrawing(false);

  const clearSigCanvas = () => {
    if (!sigCanvasRef.current) return;
    const ctx = sigCanvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, sigCanvasRef.current.width, sigCanvasRef.current.height);
  };

  useEffect(() => {
    if (showSigModal && sigType === 'draw' && sigCanvasRef.current) {
      const ctx = sigCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, sigCanvasRef.current.width, sigCanvasRef.current.height);
    }
  }, [showSigModal, sigType]);

  const confirmSignature = () => {
    if (sigType === 'draw' && sigCanvasRef.current) {
      setSigDataUrl(sigCanvasRef.current.toDataURL('image/png'));
    } else if (sigType === 'type' && sigText.trim()) {
      // Render typed text to a canvas to get a data URL
      const offscreen = document.createElement('canvas');
      offscreen.width = 400;
      offscreen.height = 120;
      const ctx = offscreen.getContext('2d');
      ctx.font = 'italic bold 36px Georgia, serif';
      ctx.fillStyle = '#1e40af';
      ctx.textBaseline = 'middle';
      ctx.fillText(sigText, 10, 60);
      setSigDataUrl(offscreen.toDataURL('image/png'));
    } else {
      return;
    }
    setShowSigModal(false);
    // Place signature at center of current view
    setSigPos({ x: pageDims.width / 2 - 100, y: pageDims.height - 140 });
    setSigSize({ width: 200, height: 80 });
    setSigPlaced(true);
  };

  // ── Drag & Resize handlers for signature on PDF ───────────────────
  const handleSigMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStart.current = { x: clientX - sigPos.x, y: clientY - sigPos.y };
  };

  const handleResizeMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStart.current = { x: clientX, y: clientY, w: sigSize.width, h: sigSize.height };
  };

  const handleMouseMove = useCallback((e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if (isDragging && dragStart.current) {
      const newX = Math.max(0, Math.min(clientX - dragStart.current.x, pageDims.width - sigSize.width));
      const newY = Math.max(0, Math.min(clientY - dragStart.current.y, pageDims.height - sigSize.height));
      setSigPos({ x: newX, y: newY });
    } else if (isResizing && dragStart.current) {
      const dx = clientX - dragStart.current.x;
      const dy = clientY - dragStart.current.y;
      const newW = Math.max(60, dragStart.current.w + dx);
      const newH = Math.max(30, dragStart.current.h + dy);
      setSigSize({ width: newW, height: newH });
    }
  }, [isDragging, isResizing, pageDims, sigSize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    dragStart.current = null;
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // ── Submit to server ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!file || !sigDataUrl) return;
    setProcessing(true);
    setError(null);

    try {
      // Convert signature data URL to a Blob for upload
      const sigResponse = await fetch(sigDataUrl);
      const sigBlob = await sigResponse.blob();

      // Calculate PDF-space coordinates from canvas-space
      // PDF.js renders at a scale; we need to map back to PDF points
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1 });
      const scaleX = viewport.width / pageDims.width;
      const scaleY = viewport.height / pageDims.height;

      // PDF coordinate system has origin at bottom-left, canvas at top-left
      const pdfX = sigPos.x * scaleX;
      const pdfY = (pageDims.height - sigPos.y - sigSize.height) * scaleY;
      const pdfW = sigSize.width * scaleX;
      const pdfH = sigSize.height * scaleY;

      const fd = new FormData();
      fd.append('file', file);
      fd.append('signature', sigBlob, 'signature.png');
      fd.append('type', 'image');
      fd.append('page', String(currentPage - 1)); // 0-indexed
      fd.append('x', String(pdfX));
      fd.append('y', String(pdfY));
      fd.append('width', String(pdfW));
      fd.append('height', String(pdfH));

      const res = await fetch('/api/signature/sign', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Signing failed');
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    if (pdfDoc) pdfDoc.destroy().catch(() => {});
    setFile(null);
    setPdfDoc(null);
    setTotalPages(0);
    setCurrentPage(1);
    setResult(null);
    setError(null);
    setSigDataUrl(null);
    setSigPlaced(false);
    setSigText('');
    clearSigCanvas();
  };

  // ── Step 1: Upload ────────────────────────────────────────────────
  if (!file) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-surface-100 mb-1">E-Sign PDF</h2>
          <p className="text-sm text-surface-500">Draw or type your signature, then drag it exactly where you want on the PDF</p>
        </div>
        <FileUpload onFilesSelected={handleFileSelected} accept=".pdf,application/pdf" multiple={false} />
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[['✏️', 'Draw signature'], ['⌨️', 'Type signature'], ['📍', 'Drag to place']].map(([icon, label]) => (
            <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-xl">{icon}</span>
              <span className="text-xs text-surface-500">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  // ── Step 3: Result ───────────────────────────────────────────────────
  if (result) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
        <div className="flex flex-col items-center gap-4 p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(255,99,99,0.08), rgba(16,185,129,0.08))', border: '1px solid rgba(255,99,99,0.15)' }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }} className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </motion.div>
          <p className="text-sm font-semibold text-surface-100">PDF signed successfully!</p>
          <a href={result.downloadUrl} download={result.metadata?.outputName || 'signed.pdf'} className="w-full flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-2xl text-sm font-semibold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download Signed PDF
          </a>
          <p className="text-xs text-surface-400 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Your data is auto-deleted in 24h
          </p>
        </div>
        <div className="text-center">
          <button type="button" onClick={reset} className="text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors">Sign another PDF →</button>
        </div>
      </motion.div>
    );
  }

  // ── Step 2: Configure — Visual placement ──────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      {/* File info bar */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">✒️</span>
          <span className="text-sm font-medium text-surface-200 truncate">{file.name}</span>
          <span className="text-xs text-surface-500 shrink-0">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
          {totalPages > 0 && <span className="text-xs text-surface-500 shrink-0">· {totalPages} page{totalPages !== 1 ? 's' : ''}</span>}
        </div>
        <button onClick={reset} className="text-xs text-surface-500 hover:text-red-400 transition-colors shrink-0 ml-2">✕ Close</button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {!sigPlaced ? (
          <button
            onClick={() => setShowSigModal(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-bold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
          >
            ✏️ Create Signature
          </button>
        ) : (
          <>
            <button
              onClick={() => setShowSigModal(true)}
              className="h-9 px-3 rounded-lg text-xs font-medium text-surface-300 hover:text-surface-100 transition-all"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              ✏️ Change Signature
            </button>
            <button
              onClick={() => { setSigPlaced(false); setSigDataUrl(null); }}
              className="h-9 px-3 rounded-lg text-xs font-medium text-surface-300 hover:text-red-400 transition-all"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              🗑 Remove
            </button>
            <div className="ml-auto">
              <button
                onClick={handleSubmit}
                disabled={processing}
                className="btn-primary h-9 px-4 text-sm disabled:opacity-50"
              >
                {processing ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Signing...
                  </span>
                ) : '✒️ Sign PDF'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Placement hint */}
      {sigPlaced && (
        <div className="flex items-start gap-3 p-3 rounded-xl text-xs" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
          <span className="text-primary-400 text-base shrink-0">💡</span>
          <p className="text-surface-400">Drag the signature to position it. Use the corner handle to resize. When it looks right, click "Sign PDF".</p>
        </div>
      )}

      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 p-2 rounded-xl" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="h-8 px-3 rounded-lg text-xs font-medium text-surface-300 hover:text-surface-100 disabled:opacity-30 transition-all" style={{ background: 'rgba(255,255,255,0.06)' }}>← Prev</button>
          <span className="text-sm text-surface-300 font-medium tabular-nums">Page {currentPage} of {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="h-8 px-3 rounded-lg text-xs font-medium text-surface-300 hover:text-surface-100 disabled:opacity-30 transition-all" style={{ background: 'rgba(255,255,255,0.06)' }}>Next →</button>
        </div>
      )}

      {/* PDF preview with draggable signature overlay */}
      <div ref={containerRef} className="relative rounded-xl overflow-hidden" style={{ background: '#525659' }}>
        {loading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: 'rgba(30,30,30,0.8)' }}>
            <div className="flex flex-col items-center gap-3">
              <svg className="w-8 h-8 animate-spin text-primary-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm text-surface-300">Rendering PDF...</span>
            </div>
          </div>
        )}

        <canvas ref={pdfCanvasRef} className="w-full" style={{ display: 'block' }} />

        {/* Draggable + resizable signature overlay */}
        {sigPlaced && sigDataUrl && (
          <div
            className="absolute select-none"
            style={{
              left: sigPos.x,
              top: sigPos.y,
              width: sigSize.width,
              height: sigSize.height,
              cursor: isDragging ? 'grabbing' : 'grab',
              zIndex: 20,
            }}
            onMouseDown={handleSigMouseDown}
            onTouchStart={handleSigMouseDown}
          >
            {/* Signature image */}
            <img
              src={sigDataUrl}
              alt="Your signature"
              className="w-full h-full object-contain pointer-events-none"
              draggable={false}
            />
            {/* Selection border */}
            <div className="absolute inset-0 border-2 border-dashed border-blue-400 rounded pointer-events-none" />
            {/* Resize handle — bottom-right corner */}
            <div
              className="absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-sm bg-blue-500 cursor-nwse-resize z-30 hover:bg-blue-400 transition-colors"
              onMouseDown={handleResizeMouseDown}
              onTouchStart={handleResizeMouseDown}
            />
          </div>
        )}

        {/* Click hint when no signature placed */}
        {!sigPlaced && !loading && pdfDoc && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="px-4 py-2 rounded-xl text-sm text-surface-300 font-medium" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
              Click "Create Signature" to get started
            </div>
          </div>
        )}
      </div>

      {/* Signature creation modal */}
      <AnimatePresence>
        {showSigModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowSigModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="w-full max-w-md rounded-2xl p-5 space-y-4"
              style={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold text-surface-100">Create Your Signature</h3>

              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-2">
                {[['draw', '✏️ Draw'], ['type', '⌨️ Type']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setSigType(val)}
                    className="py-2.5 rounded-xl text-sm font-bold transition-all duration-200"
                    style={sigType === val
                      ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)', color: '#fff' }
                      : { background: 'rgba(255,255,255,0.06)', color: '#8e8e93' }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              {sigType === 'draw' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-surface-300">Draw your signature</label>
                    <button onClick={clearSigCanvas} className="text-xs text-surface-400 hover:text-red-500 transition-colors">Clear</button>
                  </div>
                  <canvas
                    ref={sigCanvasRef}
                    width={400}
                    height={120}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                    className="w-full rounded-xl cursor-crosshair touch-none"
                    style={{ height: 120, border: '2px dashed rgba(255,255,255,0.15)', background: '#2c2c2e' }}
                  />
                </div>
              )}

              {sigType === 'type' && (
                <div>
                  <label className="block text-sm font-semibold text-surface-300 mb-1">Type your name</label>
                  <input
                    type="text"
                    value={sigText}
                    onChange={(e) => setSigText(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-4 py-3 rounded-xl text-lg font-bold italic text-blue-400 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'Georgia, serif' }}
                    autoFocus
                  />
                  {sigText && (
                    <div className="mt-3 p-3 rounded-xl text-center" style={{ background: '#2c2c2e', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <span className="text-2xl font-bold italic text-blue-400" style={{ fontFamily: 'Georgia, serif' }}>{sigText}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowSigModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-surface-300 transition-all" style={{ background: 'rgba(255,255,255,0.06)' }}>Cancel</button>
                <button onClick={confirmSignature} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>Place on PDF</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing */}
      {processing && <ProgressBar label="Signing PDF..." indeterminate />}

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
