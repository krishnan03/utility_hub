import { useState, useEffect, useRef, useCallback, memo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Cache for PDF documents and rendered thumbnails
const pdfCache = new Map();

export async function loadPdfDoc(file) {
  const key = `${file.name}-${file.size}-${file.lastModified}`;
  if (pdfCache.has(key)) return pdfCache.get(key);
  const arrayBuffer = await file.arrayBuffer();
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  pdfCache.set(key, pdf);
  return pdf;
}

// PDFThumbnail — renders a single page thumbnail
export const PDFThumbnail = memo(function PDFThumbnail({ file, pageNum, width = 120, onClick, selected, className = '' }) {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dims, setDims] = useState({ width: width, height: width * 1.414 }); // A4 aspect ratio default

  useEffect(() => {
    if (!file || !canvasRef.current) return;
    let cancelled = false;

    const render = async () => {
      try {
        setLoading(true);
        setError(false);
        const pdf = await loadPdfDoc(file);
        if (cancelled) return;

        const page = await pdf.getPage(pageNum);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1 });
        const scale = width / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        setDims({ width: scaledViewport.width, height: scaledViewport.height });

        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
        setLoading(false);
      } catch {
        if (!cancelled) { setError(true); setLoading(false); }
      }
    };

    render();
    return () => { cancelled = true; };
  }, [file, pageNum, width]);

  return (
    <div
      className={`relative group cursor-pointer transition-all duration-200 ${selected ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-surface-900 scale-105' : 'hover:scale-105'} ${className}`}
      onClick={onClick}
      style={{ width: dims.width, minHeight: dims.height }}
    >
      {/* Canvas */}
      <canvas ref={canvasRef} className="rounded-lg shadow-lg w-full" style={{ display: loading ? 'none' : 'block' }} />

      {/* Loading skeleton */}
      {loading && (
        <div className="absolute inset-0 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 rounded-lg flex items-center justify-center text-xs text-red-400" style={{ background: 'rgba(255,255,255,0.04)' }}>
          Failed
        </div>
      )}

      {/* Selected overlay */}
      {selected && (
        <div className="absolute inset-0 rounded-lg bg-primary-500/20 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}

      {/* Page number */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: 'rgba(0,0,0,0.6)' }}>
        {pageNum}
      </div>
    </div>
  );
});

// PDFPageGrid — renders all pages as a grid with selection and drag support
export function PDFPageGrid({ file, selectedPages = [], onPageClick, onReorder, draggable = false, thumbnailWidth = 120 }) {
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    loadPdfDoc(file).then(pdf => {
      if (!cancelled) { setPageCount(pdf.numPages); setLoading(false); }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [file]);

  const handleDragStart = useCallback((e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', idx);
  }, []);

  const handleDragOver = useCallback((e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(idx);
  }, []);

  const handleDrop = useCallback((e, dropIdx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); setDragOverIdx(null); return; }

    // Build new order
    const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
    const [moved] = pages.splice(dragIdx, 1);
    pages.splice(dropIdx, 0, moved);

    onReorder?.(pages);
    setDragIdx(null);
    setDragOverIdx(null);
  }, [dragIdx, pageCount, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDragOverIdx(null);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-surface-400">Loading pages...</span>
        </div>
      </div>
    );
  }

  if (pageCount === 0) {
    return <p className="text-sm text-surface-500 text-center py-8">No pages found in this PDF</p>;
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${thumbnailWidth + 16}px, 1fr))` }}>
      {Array.from({ length: pageCount }, (_, i) => i).map((idx) => {
        const pageNum = idx + 1;
        const isSelected = selectedPages.includes(pageNum);
        const isDragOver = dragOverIdx === idx;

        return (
          <div
            key={idx}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${isDragOver ? 'bg-primary-500/10 ring-2 ring-primary-500/30' : ''}`}
            draggable={draggable}
            onDragStart={draggable ? (e) => handleDragStart(e, idx) : undefined}
            onDragOver={draggable ? (e) => handleDragOver(e, idx) : undefined}
            onDrop={draggable ? (e) => handleDrop(e, idx) : undefined}
            onDragEnd={draggable ? handleDragEnd : undefined}
          >
            <PDFThumbnail
              file={file}
              pageNum={pageNum}
              width={thumbnailWidth}
              onClick={() => onPageClick?.(pageNum)}
              selected={isSelected}
            />
          </div>
        );
      })}
    </div>
  );
}

export default PDFThumbnail;
