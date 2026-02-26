import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import FileUpload from '../../common/FileUpload';
import ProgressBar from '../../common/ProgressBar';

// Set worker source — use bundled worker via Vite ?url import
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const TOOLS = [
  { id: 'select',    label: 'Select',    icon: '↖' },
  { id: 'text',      label: 'Text',      icon: 'T' },
  { id: 'draw',      label: 'Draw',      icon: '✏️' },
  { id: 'highlight', label: 'Highlight', icon: '🖊' },
  { id: 'rect',      label: 'Rectangle', icon: '⬜' },
  { id: 'image',     label: 'Image',     icon: '🖼️' },
  { id: 'eraser',    label: 'Eraser',    icon: '⌫' },
];

const COLORS = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#ec4899'];
const FONT_SIZES = [12, 14, 16, 18, 24, 32];
const STROKE_WIDTHS = [1, 2, 4, 6];

// Load PDF from ArrayBuffer
const loadPdf = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf;
};

// Render a page to canvas
const renderPage = async (pdf, pageNum, canvas) => {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1 });

  // Scale to fit container width
  const container = canvas.parentElement;
  const containerWidth = container?.clientWidth || 800;
  const scale = containerWidth / viewport.width;
  const scaledViewport = page.getViewport({ scale });

  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;

  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;

  return { width: scaledViewport.width, height: scaledViewport.height };
};

export default function PDFEditor() {
  const [file, setFile] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [canvasDims, setCanvasDims] = useState({ width: 800, height: 600 });
  const [loading, setLoading] = useState(false);

  // Tool state
  const [activeTool, setActiveTool] = useState('text');
  const [color, setColor] = useState('#000000');
  const [fontSize, setFontSize] = useState(16);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [opacity, setOpacity] = useState(1);

  // Annotations keyed by page number: { 1: [...], 2: [...] }
  const [annotations, setAnnotations] = useState({});

  // Canvas refs — two-layer system
  const pdfCanvasRef = useRef(null);    // Renders the PDF page (read-only)
  const annotCanvasRef = useRef(null);  // Annotation overlay (interactive)

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [startPoint, setStartPoint] = useState(null);

  // Text input state
  const [textInput, setTextInput] = useState({ visible: false, x: 0, y: 0, value: '' });
  const textInputRef = useRef(null);

  // Image tool
  const imageInputRef = useRef(null);
  const imgCacheRef = useRef({});

  // Save state
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Selected annotation for resize/rotate
  const [selectedAnnIdx, setSelectedAnnIdx] = useState(null);

  // ── PDF Loading ──────────────────────────────────────────────────────

  const handleFileSelected = async (files) => {
    const f = files[0];
    setFile(f);
    setLoading(true);
    setAnnotations({});
    setResult(null);
    setError(null);

    try {
      const pdf = await loadPdf(f);
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
    } catch (err) {
      setError('Failed to load PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Canvas Helpers ───────────────────────────────────────────────────

  // Get position relative to annotation canvas
  const getPos = (e) => {
    const canvas = annotCanvasRef.current;
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
  };

  // Redraw all annotations on the annotation canvas (not the PDF canvas)
  const redrawCanvas = useCallback((pageAnnotations) => {
    const canvas = annotCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    (pageAnnotations || []).forEach((ann, idx) => {
      ctx.save();
      ctx.globalAlpha = ann.opacity ?? 1;

      if (ann.type === 'text') {
        ctx.font = `${ann.fontSize || 16}px -apple-system, Inter, sans-serif`;
        ctx.fillStyle = ann.color || '#000';
        ctx.fillText(ann.text, ann.x, ann.y);
      } else if (ann.type === 'draw') {
        ctx.strokeStyle = ann.color || '#000';
        ctx.lineWidth = ann.strokeWidth || 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ann.points.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      } else if (ann.type === 'highlight') {
        ctx.fillStyle = ann.color || '#FFFF00';
        ctx.globalAlpha = 0.35;
        ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
      } else if (ann.type === 'rect') {
        ctx.strokeStyle = ann.color || '#000';
        ctx.lineWidth = ann.strokeWidth || 2;
        ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
      } else if (ann.type === 'image' && ann.dataUrl) {
        const cached = imgCacheRef.current[ann.dataUrl];
        if (cached) {
          ctx.drawImage(cached, ann.x, ann.y, ann.width || 200, ann.height || 150);
        } else {
          const img = new Image();
          img.onload = () => {
            imgCacheRef.current[ann.dataUrl] = img;
            redrawCanvas(pageAnnotations);
          };
          img.src = ann.dataUrl;
        }
      }

      ctx.restore();

      // Draw selection border for selected image
      if (ann.type === 'image' && idx === selectedAnnIdx) {
        ctx.save();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(ann.x - 2, ann.y - 2, (ann.width || 200) + 4, (ann.height || 150) + 4);
        ctx.restore();
      }
    });
  }, [selectedAnnIdx]);

  // Find topmost image annotation at a canvas position (for current page)
  const getImageAtPos = useCallback((pos) => {
    const anns = annotations[currentPage] || [];
    for (let i = anns.length - 1; i >= 0; i--) {
      const ann = anns[i];
      if (ann.type === 'image') {
        if (pos.x >= ann.x && pos.x <= ann.x + (ann.width || 200) &&
            pos.y >= ann.y && pos.y <= ann.y + (ann.height || 150)) {
          return i;
        }
      }
    }
    return -1;
  }, [annotations, currentPage]);

  // Add annotation to current page
  const addAnnotation = (ann) => {
    setAnnotations(prev => ({
      ...prev,
      [currentPage]: [...(prev[currentPage] || []), ann],
    }));
  };

  // ── Render PDF page effect ───────────────────────────────────────────

  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current) return;

    const render = async () => {
      const dims = await renderPage(pdfDoc, currentPage, pdfCanvasRef.current);
      setCanvasDims(dims);

      // Resize annotation canvas to match PDF canvas
      if (annotCanvasRef.current) {
        annotCanvasRef.current.width = dims.width;
        annotCanvasRef.current.height = dims.height;
        redrawCanvas(annotations[currentPage] || []);
      }
    };

    render();
  }, [pdfDoc, currentPage, result]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pointer Handlers ─────────────────────────────────────────────────

  const handlePointerDown = (e) => {
    if (activeTool === 'select') {
      const idx = getImageAtPos(getPos(e));
      setSelectedAnnIdx(idx >= 0 ? idx : null);
      return;
    }

    if (activeTool === 'text') {
      const pos = getPos(e);
      setTextInput({ visible: true, x: pos.x, y: pos.y, value: '' });
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }

    if (activeTool === 'image') {
      setStartPoint(getPos(e));
      imageInputRef.current?.click();
      return;
    }

    const pos = getPos(e);
    setIsDrawing(true);
    setStartPoint(pos);

    if (activeTool === 'draw') {
      setCurrentPath([pos]);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    const canvas = annotCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (activeTool === 'draw') {
      setCurrentPath((prev) => {
        const newPath = [...prev, pos];
        // Live draw on annotation canvas
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (newPath.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(newPath[newPath.length - 2].x, newPath[newPath.length - 2].y);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
        }
        ctx.restore();
        return newPath;
      });
    } else if (activeTool === 'highlight' || activeTool === 'rect') {
      // Live preview — redraw annotations then show preview rect
      redrawCanvas(annotations[currentPage] || []);
      const ctx2 = annotCanvasRef.current?.getContext('2d');
      if (!ctx2 || !startPoint) return;
      ctx2.save();
      if (activeTool === 'highlight') {
        ctx2.fillStyle = color || '#FFFF00';
        ctx2.globalAlpha = 0.35;
        ctx2.fillRect(startPoint.x, startPoint.y, pos.x - startPoint.x, pos.y - startPoint.y);
      } else {
        ctx2.strokeStyle = color;
        ctx2.lineWidth = strokeWidth;
        ctx2.globalAlpha = opacity;
        ctx2.strokeRect(startPoint.x, startPoint.y, pos.x - startPoint.x, pos.y - startPoint.y);
      }
      ctx2.restore();
    } else if (activeTool === 'eraser') {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const handlePointerUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const pos = getPos(e);

    let newAnnotation = null;

    if (activeTool === 'draw' && currentPath.length > 1) {
      newAnnotation = { type: 'draw', points: currentPath, color, strokeWidth, opacity };
    } else if ((activeTool === 'highlight' || activeTool === 'rect') && startPoint) {
      newAnnotation = {
        type: activeTool,
        x: Math.min(startPoint.x, pos.x),
        y: Math.min(startPoint.y, pos.y),
        width: Math.abs(pos.x - startPoint.x),
        height: Math.abs(pos.y - startPoint.y),
        color,
        strokeWidth,
        opacity,
      };
    }

    if (newAnnotation) {
      addAnnotation(newAnnotation);
    }

    setCurrentPath([]);
    setStartPoint(null);
  };

  // ── Text Placement ───────────────────────────────────────────────────

  const placeText = () => {
    if (!textInput.value.trim()) {
      setTextInput({ visible: false, x: 0, y: 0, value: '' });
      return;
    }
    const ann = {
      type: 'text',
      x: textInput.x,
      y: textInput.y,
      text: textInput.value,
      color,
      fontSize,
      opacity,
    };
    addAnnotation(ann);
    setTextInput({ visible: false, x: 0, y: 0, value: '' });
  };

  // ── Undo ─────────────────────────────────────────────────────────────

  const undo = useCallback(() => {
    setAnnotations((prev) => {
      const pageAnns = prev[currentPage] || [];
      if (pageAnns.length === 0) return prev;
      return { ...prev, [currentPage]: pageAnns.slice(0, -1) };
    });
  }, [currentPage]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo]);

  // Redraw annotation canvas when annotations change
  useEffect(() => {
    redrawCanvas(annotations[currentPage] || []);
  }, [annotations, currentPage, redrawCanvas]);

  // ── Save ─────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!file) return;
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('annotations', JSON.stringify(annotations));
      fd.append('canvasWidth', String(canvasDims.width));
      fd.append('canvasHeight', String(canvasDims.height));
      const res = await fetch('/api/pdf/edit', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Save failed');
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPdfDoc(null);
    setTotalPages(0);
    setCurrentPage(1);
    setAnnotations({});
    setResult(null);
    setError(null);
    setSelectedAnnIdx(null);
  };

  // ── Render ──────────────────────────────────────────────────────────

  // Step 1: Upload
  if (!file) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-surface-100 mb-1">Online PDF Editor</h2>
          <p className="text-sm text-surface-500">Add text, draw, highlight, and annotate PDFs directly in your browser</p>
        </div>
        <FileUpload onFilesSelected={handleFileSelected} accept=".pdf,application/pdf" multiple={false} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[['✏️', 'Draw & annotate'], ['T', 'Add text'], ['🖊', 'Highlight'], ['⬜', 'Draw shapes']].map(([icon, label]) => (
            <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-xl">{icon}</span>
              <span className="text-xs text-surface-500">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  // Step 3: Result
  if (result) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
        <div className="flex flex-col items-center gap-4 p-6 rounded-2xl" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }} className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(48,209,88,0.15)' }}>
            <svg className="w-7 h-7 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </motion.div>
          <p className="text-sm font-semibold text-surface-100">PDF saved successfully!</p>
          <a href={result.downloadUrl} download={result.metadata?.outputName || 'edited.pdf'} className="btn-primary w-full flex items-center justify-center gap-2 min-h-[44px]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download Edited PDF
          </a>
          <p className="text-xs text-surface-500 flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Your data is auto-deleted in 24h
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setResult(null)} className="flex-1 btn-secondary">Continue Editing</button>
          <button onClick={reset} className="flex-1 btn-secondary">Edit Another PDF</button>
        </div>
      </motion.div>
    );
  }

  const annotationCount = Object.values(annotations).flat().length;
  const pageAnnotationCount = (annotations[currentPage] || []).length;

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
        <button onClick={reset} className="text-xs text-surface-500 hover:text-red-400 transition-colors shrink-0 ml-2">✕ Close</button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Tool selector */}
        <div className="flex gap-1">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              title={tool.label}
              className="w-9 h-9 rounded-lg text-sm font-bold transition-all duration-150 flex items-center justify-center"
              style={activeTool === tool.id
                ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)', color: '#fff' }
                : { background: 'rgba(255,255,255,0.06)', color: '#8e8e93' }
              }
            >
              {tool.icon}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-white/10" />

        {/* Color swatches */}
        <div className="flex gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-6 h-6 rounded-full transition-all duration-150"
              style={{
                backgroundColor: c,
                border: color === c ? '2px solid #fff' : '2px solid transparent',
                transform: color === c ? 'scale(1.2)' : 'scale(1)',
              }}
            />
          ))}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-6 h-6 rounded-full cursor-pointer border-0 bg-transparent" title="Custom color" />
        </div>

        <div className="w-px h-6 bg-white/10" />

        {/* Font size (text tool only) */}
        {activeTool === 'text' && (
          <select
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="h-8 px-2 rounded-lg text-xs text-surface-200 focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
          </select>
        )}

        {/* Image tool hint */}
        {activeTool === 'image' && (
          <span className="text-xs text-surface-400">Click on the PDF to place an image</span>
        )}

        {/* Stroke width (draw/rect) */}
        {['draw', 'rect'].includes(activeTool) && (
          <div className="flex gap-1">
            {STROKE_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => setStrokeWidth(w)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
                style={strokeWidth === w
                  ? { background: 'rgba(255,99,99,0.2)', border: '1px solid rgba(255,99,99,0.4)' }
                  : { background: 'rgba(255,255,255,0.06)' }
                }
              >
                <div className="rounded-full bg-surface-200" style={{ width: w * 2, height: w * 2 }} />
              </button>
            ))}
          </div>
        )}

        {/* Opacity */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-surface-500">Opacity</span>
          <input
            type="range" min="0.2" max="1" step="0.1" value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-20 accent-primary-500"
          />
          <span className="text-xs text-surface-400 w-8">{Math.round(opacity * 100)}%</span>
        </div>

        <div className="w-px h-6 bg-white/10" />

        {/* Undo & Clear */}
        <button
          onClick={undo}
          disabled={pageAnnotationCount === 0}
          className="h-8 px-3 rounded-lg text-xs font-medium text-surface-300 hover:text-surface-100 disabled:opacity-30 transition-all"
          style={{ background: 'rgba(255,255,255,0.06)' }}
          title="Undo (Ctrl+Z)"
        >
          ↩ Undo
        </button>
        <button
          onClick={() => setAnnotations((prev) => ({ ...prev, [currentPage]: [] }))}
          className="h-8 px-3 rounded-lg text-xs font-medium text-surface-300 hover:text-red-400 transition-all"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          🗑 Clear
        </button>

        {/* Save button */}
        <div className="ml-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary h-9 px-4 text-sm disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Save PDF {annotationCount > 0 ? `(${annotationCount})` : ''}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tool tooltips */}
      {activeTool === 'text' && (
        <div className="flex items-start gap-3 p-3 rounded-xl text-xs" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
          <span className="text-primary-400 text-base shrink-0">💡</span>
          <div className="text-surface-400 space-y-1">
            <p><span className="text-surface-200 font-medium">Text tool:</span> Click anywhere on the PDF to place a text box.</p>
            <p>Type your text → press <kbd className="px-1 py-0.5 rounded text-xs font-mono" style={{ background: 'rgba(255,255,255,0.08)' }}>Enter</kbd> to place, <kbd className="px-1 py-0.5 rounded text-xs font-mono" style={{ background: 'rgba(255,255,255,0.08)' }}>Esc</kbd> to cancel.</p>
            <p>Change font size and color in the toolbar above.</p>
          </div>
        </div>
      )}
      {activeTool === 'image' && (
        <div className="flex items-start gap-3 p-3 rounded-xl text-xs" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
          <span className="text-primary-400 text-base shrink-0">💡</span>
          <div className="text-surface-400 space-y-1">
            <p><span className="text-surface-200 font-medium">Image tool:</span> Click anywhere on the PDF to place an image.</p>
            <p>A file picker will open — select any PNG, JPG, or WebP image.</p>
            <p>After placing, switch to <span className="text-surface-200 font-medium">Select (↖)</span> tool to resize or rotate the image.</p>
          </div>
        </div>
      )}
      {activeTool === 'select' && (
        <div className="flex items-start gap-3 p-3 rounded-xl text-xs" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
          <span className="text-primary-400 text-base shrink-0">💡</span>
          <div className="text-surface-400">
            <p><span className="text-surface-200 font-medium">Select tool:</span> Click on an image to select it, then use the controls below to resize, rotate, or delete it.</p>
          </div>
        </div>
      )}

      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 p-2 rounded-xl" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="h-8 px-3 rounded-lg text-xs font-medium text-surface-300 hover:text-surface-100 disabled:opacity-30 transition-all"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            ← Prev
          </button>
          <span className="text-sm text-surface-300 font-medium tabular-nums">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="h-8 px-3 rounded-lg text-xs font-medium text-surface-300 hover:text-surface-100 disabled:opacity-30 transition-all"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Editor canvas area */}
      <div className="relative rounded-xl overflow-hidden" style={{ background: '#525659' }}>
        {/* Loading overlay */}
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

        {/* PDF render canvas — shows the actual PDF page (read-only) */}
        <canvas ref={pdfCanvasRef} className="w-full" style={{ display: 'block' }} />

        {/* Annotation canvas overlay — transparent, captures all interactions */}
        <canvas
          ref={annotCanvasRef}
          className="absolute inset-0 w-full h-full"
          style={{
            cursor: activeTool === 'select' ? 'default'
              : activeTool === 'text' ? 'text'
              : activeTool === 'eraser' ? 'cell'
              : 'crosshair',
            touchAction: 'none',
          }}
          onMouseDown={(e) => {
            if (textInput.visible) {
              placeText();
              return;
            }
            handlePointerDown(e);
          }}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />

        {/* Inline text input */}
        {textInput.visible && (
          <input
            ref={textInputRef}
            type="text"
            value={textInput.value}
            onChange={(e) => setTextInput((prev) => ({ ...prev, value: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') placeText();
              if (e.key === 'Escape') setTextInput({ visible: false, x: 0, y: 0, value: '' });
            }}
            onBlur={() => { /* commit only on Enter/Escape/next canvas click */ }}
            className="absolute outline-none caret-white text-white placeholder-white/50"
            style={{
              left: `${(textInput.x / canvasDims.width) * 100}%`,
              top: `${(textInput.y / canvasDims.height) * 100}%`,
              fontSize: `${fontSize}px`,
              color: color === '#000000' ? '#ffffff' : color,
              minWidth: 160,
              maxWidth: 300,
              fontFamily: '-apple-system, Inter, sans-serif',
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,99,99,0.8)',
              borderRadius: '4px',
              padding: '4px 8px',
              backdropFilter: 'blur(4px)',
              zIndex: 20,
            }}
            placeholder="Type here..."
            autoFocus
          />
        )}

        {/* Hidden image file input */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const imgFile = e.target.files?.[0];
            if (!imgFile || !startPoint) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
              const dataUrl = ev.target.result;
              const img = new Image();
              img.onload = () => {
                const maxW = 300;
                const scale = img.width > maxW ? maxW / img.width : 1;
                const w = img.width * scale;
                const h = img.height * scale;
                const ann = {
                  type: 'image',
                  x: startPoint.x,
                  y: startPoint.y,
                  width: w,
                  height: h,
                  dataUrl,
                  opacity,
                };
                addAnnotation(ann);
              };
              img.src = dataUrl;
            };
            reader.readAsDataURL(imgFile);
            e.target.value = '';
          }}
        />

        {/* Tool hint overlay */}
        <div className="absolute bottom-3 left-3 text-xs text-white/50 pointer-events-none">
          {activeTool === 'select' && 'Click on an image to select it'}
          {activeTool === 'text' && 'Click anywhere to add text'}
          {activeTool === 'draw' && 'Click and drag to draw'}
          {activeTool === 'highlight' && 'Click and drag to highlight'}
          {activeTool === 'rect' && 'Click and drag to draw rectangle'}
          {activeTool === 'eraser' && 'Click and drag to erase'}
          {activeTool === 'image' && 'Click to place an image from your device'}
        </div>
      </div>

      {/* Image controls panel — shown when an image annotation is selected */}
      {selectedAnnIdx !== null && annotations[currentPage]?.[selectedAnnIdx]?.type === 'image' && (
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="text-xs text-surface-400 font-medium">Selected image:</span>

          {/* Width/Height inputs */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-surface-500">W:</span>
            <input
              type="number"
              value={Math.round(annotations[currentPage][selectedAnnIdx].width || 200)}
              onChange={(e) => {
                const newW = Number(e.target.value);
                if (newW < 10) return;
                setAnnotations(prev => {
                  const anns = [...(prev[currentPage] || [])];
                  anns[selectedAnnIdx] = { ...anns[selectedAnnIdx], width: newW };
                  return { ...prev, [currentPage]: anns };
                });
              }}
              className="w-16 px-2 py-1 rounded-lg text-xs text-surface-200 focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <span className="text-xs text-surface-500">H:</span>
            <input
              type="number"
              value={Math.round(annotations[currentPage][selectedAnnIdx].height || 150)}
              onChange={(e) => {
                const newH = Number(e.target.value);
                if (newH < 10) return;
                setAnnotations(prev => {
                  const anns = [...(prev[currentPage] || [])];
                  anns[selectedAnnIdx] = { ...anns[selectedAnnIdx], height: newH };
                  return { ...prev, [currentPage]: anns };
                });
              }}
              className="w-16 px-2 py-1 rounded-lg text-xs text-surface-200 focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          {/* Rotation buttons */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-surface-500">Rotate:</span>
            {[['↺ 90°', -90], ['↻ 90°', 90], ['180°', 180]].map(([label, deg]) => (
              <button
                key={label}
                onClick={() => {
                  setAnnotations(prev => {
                    const anns = [...(prev[currentPage] || [])];
                    const ann = anns[selectedAnnIdx];
                    if (!ann || ann.type !== 'image') return prev;
                    const img = imgCacheRef.current[ann.dataUrl];
                    if (!img) return prev;
                    const rad = (deg * Math.PI) / 180;
                    const cos = Math.abs(Math.cos(rad));
                    const sin = Math.abs(Math.sin(rad));
                    const offscreen = document.createElement('canvas');
                    offscreen.width = Math.round(img.width * cos + img.height * sin);
                    offscreen.height = Math.round(img.width * sin + img.height * cos);
                    const ctx = offscreen.getContext('2d');
                    ctx.translate(offscreen.width / 2, offscreen.height / 2);
                    ctx.rotate(rad);
                    ctx.drawImage(img, -img.width / 2, -img.height / 2);
                    const newDataUrl = offscreen.toDataURL('image/png');
                    const newImg = new Image();
                    newImg.onload = () => { imgCacheRef.current[newDataUrl] = newImg; };
                    newImg.src = newDataUrl;
                    anns[selectedAnnIdx] = {
                      ...ann,
                      dataUrl: newDataUrl,
                      width: offscreen.width * (ann.width / img.width),
                      height: offscreen.height * (ann.height / img.height),
                    };
                    return { ...prev, [currentPage]: anns };
                  });
                }}
                className="h-7 px-2 rounded-lg text-xs text-surface-300 hover:text-surface-100 transition-all"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Delete selected */}
          <button
            onClick={() => {
              setAnnotations(prev => {
                const anns = [...(prev[currentPage] || [])];
                anns.splice(selectedAnnIdx, 1);
                return { ...prev, [currentPage]: anns };
              });
              setSelectedAnnIdx(null);
            }}
            className="h-7 px-2 rounded-lg text-xs text-red-400 hover:text-red-300 transition-all ml-auto"
            style={{ background: 'rgba(239,68,68,0.1)' }}
          >
            🗑 Delete
          </button>
        </div>
      )}

      {/* Annotation count */}
      {annotationCount > 0 && (
        <p className="text-xs text-surface-500 text-center">
          {annotationCount} annotation{annotationCount !== 1 ? 's' : ''} added
          {totalPages > 1 ? ` (${pageAnnotationCount} on this page)` : ''}
          {' '}· Click &quot;Save PDF&quot; to download
        </p>
      )}

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-xl text-sm text-red-400 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </motion.div>
      )}

      {/* Save progress */}
      {saving && (
        <ProgressBar label="Saving PDF with annotations..." indeterminate />
      )}
    </motion.div>
  );
}
