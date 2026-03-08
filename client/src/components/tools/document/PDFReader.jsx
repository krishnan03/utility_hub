import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import FileUpload from '../../common/FileUpload';

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const ZOOM_LABELS = ['50%', '75%', '100%', '125%', '150%', '200%', '300%'];

export default function PDFReader() {
  const [file, setFile] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomIdx, setZoomIdx] = useState(2); // default 100%
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState(null);

  // Search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]); // [{page, matches}]
  const [activeMatch, setActiveMatch] = useState(0);
  const searchInputRef = useRef(null);

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [thumbnails, setThumbnails] = useState({}); // page -> dataUrl
  const [pageText, setPageText] = useState(''); // extracted text for current page

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  // Canvas
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);

  const zoom = ZOOM_LEVELS[zoomIdx];

  // ── Load PDF ──────────────────────────────────────────────────────────
  const handleFileSelected = async (files) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setLoading(true);
    setError(null);
    setSearchResults([]);
    setSearchQuery('');
    setThumbnails({});
    setPageText('');

    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
      const arrayBuffer = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      setZoomIdx(2);
    } catch (err) {
      setError('Failed to load PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Render page ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;

    const render = async () => {
      setRendering(true);
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: zoom });

        const canvas = canvasRef.current;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        if (cancelled) return;

        // Extract text content for search and text layer
        const textContent = await page.getTextContent();
        const textItems = textContent.items.map((item) => item.str).join(' ');
        setPageText(textItems);

        // Render text layer for selection
        if (textLayerRef.current) {
          textLayerRef.current.innerHTML = '';
          textLayerRef.current.style.width = `${viewport.width}px`;
          textLayerRef.current.style.height = `${viewport.height}px`;

          textContent.items.forEach((item) => {
            const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
            const span = document.createElement('span');
            span.textContent = item.str;
            span.style.position = 'absolute';
            span.style.left = `${tx[4]}px`;
            span.style.top = `${tx[5] - item.height * zoom}px`;
            span.style.fontSize = `${item.height * zoom}px`;
            span.style.fontFamily = item.fontName || 'sans-serif';
            span.style.color = 'transparent';
            span.style.whiteSpace = 'pre';
            span.style.pointerEvents = 'all';
            span.style.userSelect = 'text';
            textLayerRef.current.appendChild(span);
          });
        }
      } catch (err) {
        if (!cancelled) setError('Render failed: ' + err.message);
      } finally {
        if (!cancelled) setRendering(false);
      }
    };

    render();
    return () => { cancelled = true; };
  }, [pdfDoc, currentPage, zoom]);

  // ── Generate thumbnails for sidebar ───────────────────────────────────
  useEffect(() => {
    if (!pdfDoc || !sidebarOpen) return;
    let cancelled = false;

    const generateThumbs = async () => {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        if (thumbnails[i] || cancelled) continue;
        try {
          const page = await pdfDoc.getPage(i);
          const vp = page.getViewport({ scale: 0.3 });
          const canvas = document.createElement('canvas');
          canvas.width = vp.width;
          canvas.height = vp.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
          if (!cancelled) {
            setThumbnails((prev) => ({ ...prev, [i]: canvas.toDataURL('image/jpeg', 0.6) }));
          }
        } catch { /* skip */ }
      }
    };

    generateThumbs();
    return () => { cancelled = true; };
  }, [pdfDoc, sidebarOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search across all pages ───────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    if (!pdfDoc || !searchQuery.trim()) { setSearchResults([]); return; }
    const query = searchQuery.toLowerCase();
    const results = [];

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      try {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items.map((item) => item.str).join(' ').toLowerCase();
        const matches = [];
        let idx = 0;
        while ((idx = text.indexOf(query, idx)) !== -1) {
          matches.push(idx);
          idx += query.length;
        }
        if (matches.length > 0) {
          results.push({ page: i, count: matches.length });
        }
      } catch { /* skip */ }
    }

    setSearchResults(results);
    setActiveMatch(0);
    // Jump to first result
    if (results.length > 0) setCurrentPage(results[0].page);
  }, [pdfDoc, searchQuery]);

  // ── Navigation helpers ────────────────────────────────────────────────
  const goToPage = (p) => setCurrentPage(Math.max(1, Math.min(totalPages, p)));
  const prevPage = () => goToPage(currentPage - 1);
  const nextPage = () => goToPage(currentPage + 1);
  const zoomIn = () => setZoomIdx((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1));
  const zoomOut = () => setZoomIdx((i) => Math.max(0, i - 1));
  const fitWidth = () => {
    if (!canvasRef.current?.parentElement) return;
    const containerWidth = canvasRef.current.parentElement.clientWidth - 32;
    // Estimate: default viewport width at scale 1
    setZoomIdx(2); // reset to 100% as a reasonable fit
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const nextSearchResult = () => {
    if (searchResults.length === 0) return;
    const next = (activeMatch + 1) % searchResults.length;
    setActiveMatch(next);
    setCurrentPage(searchResults[next].page);
  };

  const prevSearchResult = () => {
    if (searchResults.length === 0) return;
    const prev = (activeMatch - 1 + searchResults.length) % searchResults.length;
    setActiveMatch(prev);
    setCurrentPage(searchResults[prev].page);
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (!pdfDoc) return;
      // Don't capture when typing in search
      if (e.target.tagName === 'INPUT') {
        if (e.key === 'Enter') handleSearch();
        if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); nextPage(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prevPage(); }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn(); }
      if (e.key === '-') { e.preventDefault(); zoomOut(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 100); }
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey) { toggleFullscreen(); }
      if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pdfDoc, currentPage, handleSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for fullscreen exit
  useEffect(() => {
    const handler = () => { if (!document.fullscreenElement) setIsFullscreen(false); };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const reset = () => {
    if (pdfDoc) pdfDoc.destroy().catch(() => {});
    setFile(null);
    setPdfDoc(null);
    setTotalPages(0);
    setCurrentPage(1);
    setError(null);
    setSearchResults([]);
    setSearchQuery('');
    setThumbnails({});
    setSidebarOpen(false);
    setSearchOpen(false);
  };

  // ── Step 1: Upload ────────────────────────────────────────────────────
  if (!file) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-surface-100 mb-1">PDF Reader</h2>
          <p className="text-sm text-surface-500">Open and read PDFs in your browser — zoom, search, navigate, and select text</p>
        </div>
        <FileUpload onFilesSelected={handleFileSelected} accept=".pdf,application/pdf" multiple={false} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[['🔍', 'Search text'], ['📖', 'Page navigation'], ['🔎', 'Zoom controls'], ['📋', 'Select & copy']].map(([icon, label]) => (
            <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-xl">{icon}</span>
              <span className="text-xs text-surface-500">{label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-center" style={{ color: 'var(--tp-muted)' }}>
          100% client-side — your PDF never leaves your browser
        </p>
      </motion.div>
    );
  }

  // ── Step 2: Reader ────────────────────────────────────────────────────
  const totalSearchMatches = searchResults.reduce((sum, r) => sum + r.count, 0);

  return (
    <div ref={containerRef} className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-50' : ''}`} style={{ background: isFullscreen ? 'var(--tp-bg)' : undefined }}>
      {/* Top toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-t-xl flex-wrap" style={{ background: 'var(--tp-card)', border: '1px solid var(--tp-border)' }}>
        {/* Sidebar toggle */}
        <ToolbarBtn onClick={() => setSidebarOpen((v) => !v)} title="Toggle page thumbnails" active={sidebarOpen}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h8m-8 6h16" /></svg>
        </ToolbarBtn>

        <div className="w-px h-5 bg-white/10" />

        {/* Page navigation */}
        <ToolbarBtn onClick={prevPage} disabled={currentPage <= 1} title="Previous page (←)">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </ToolbarBtn>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => goToPage(Number(e.target.value))}
            className="w-12 text-center text-xs font-mono font-bold rounded-lg py-1 outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--tp-text)', border: '1px solid var(--tp-border)' }}
          />
          <span className="text-xs text-surface-500">/ {totalPages}</span>
        </div>
        <ToolbarBtn onClick={nextPage} disabled={currentPage >= totalPages} title="Next page (→)">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </ToolbarBtn>

        <div className="w-px h-5 bg-white/10" />

        {/* Zoom */}
        <ToolbarBtn onClick={zoomOut} disabled={zoomIdx <= 0} title="Zoom out (-)">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
        </ToolbarBtn>
        <span className="text-xs font-mono font-bold min-w-[3rem] text-center" style={{ color: 'var(--tp-text)' }}>
          {ZOOM_LABELS[zoomIdx]}
        </span>
        <ToolbarBtn onClick={zoomIn} disabled={zoomIdx >= ZOOM_LEVELS.length - 1} title="Zoom in (+)">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </ToolbarBtn>

        <div className="w-px h-5 bg-white/10" />

        {/* Search */}
        <ToolbarBtn onClick={() => { setSearchOpen((v) => !v); setTimeout(() => searchInputRef.current?.focus(), 100); }} title="Search (Ctrl+F)" active={searchOpen}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </ToolbarBtn>

        {/* Fullscreen */}
        <ToolbarBtn onClick={toggleFullscreen} title="Fullscreen (F)">
          {isFullscreen ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
          )}
        </ToolbarBtn>

        {/* File info + close */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-surface-500 truncate max-w-[120px] hidden sm:inline">{file.name}</span>
          <button onClick={reset} className="text-xs text-surface-500 hover:text-red-400 transition-colors">✕</button>
        </div>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'var(--tp-card)', borderBottom: '1px solid var(--tp-border)' }}>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="Search in PDF..."
                className="flex-1 text-sm px-3 py-1.5 rounded-lg outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--tp-text)', border: '1px solid var(--tp-border)' }}
              />
              <button onClick={handleSearch} className="btn-primary text-xs px-3 py-1.5">Search</button>
              {searchResults.length > 0 && (
                <>
                  <span className="text-xs text-surface-400">{totalSearchMatches} match{totalSearchMatches !== 1 ? 'es' : ''} on {searchResults.length} page{searchResults.length !== 1 ? 's' : ''}</span>
                  <ToolbarBtn onClick={prevSearchResult} title="Previous match">↑</ToolbarBtn>
                  <ToolbarBtn onClick={nextSearchResult} title="Next match">↓</ToolbarBtn>
                </>
              )}
              <button onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }} className="text-xs text-surface-500 hover:text-red-400">✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main area: sidebar + canvas */}
      <div className="flex flex-1 min-h-0 rounded-b-xl overflow-hidden" style={{ border: '1px solid var(--tp-border)', borderTop: 'none' }}>
        {/* Thumbnail sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 140, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-y-auto overflow-x-hidden flex-shrink-0 py-2 space-y-2 scrollbar-hide"
              style={{ background: 'var(--tp-card)', borderRight: '1px solid var(--tp-border)' }}
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className="w-full px-2 flex flex-col items-center gap-1 transition-all"
                >
                  <div
                    className="w-full rounded-lg overflow-hidden transition-all"
                    style={{
                      border: currentPage === p ? '2px solid var(--tp-accent)' : '2px solid transparent',
                      boxShadow: currentPage === p ? `0 0 8px var(--tp-glow)` : 'none',
                    }}
                  >
                    {thumbnails[p] ? (
                      <img src={thumbnails[p]} alt={`Page ${p}`} className="w-full" />
                    ) : (
                      <div className="w-full aspect-[3/4] flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <span className="text-xs text-surface-500">{p}</span>
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium ${currentPage === p ? 'text-surface-100' : 'text-surface-500'}`}>{p}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* PDF canvas area */}
        <div className="flex-1 overflow-auto flex justify-center py-4 px-2" style={{ background: '#525659' }}>
          {loading && (
            <div className="flex items-center justify-center py-20">
              <svg className="w-8 h-8 animate-spin" style={{ color: 'var(--tp-accent)' }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl text-sm text-red-400 m-4" style={{ background: 'rgba(239,68,68,0.1)' }}>
              {error}
            </div>
          )}

          {pdfDoc && !loading && (
            <div className="relative inline-block shadow-2xl rounded-lg overflow-hidden">
              {/* Rendering overlay */}
              {rendering && (
                <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <svg className="w-6 h-6 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
              <canvas ref={canvasRef} style={{ display: 'block' }} />
              {/* Text selection layer */}
              <div
                ref={textLayerRef}
                className="absolute top-0 left-0"
                style={{ pointerEvents: 'auto', userSelect: 'text', mixBlendMode: 'multiply' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom status bar */}
      {pdfDoc && (
        <div className="flex items-center justify-between px-3 py-1.5 text-[10px] rounded-b-xl" style={{ background: 'var(--tp-card)', borderTop: '1px solid var(--tp-border)', color: 'var(--tp-muted)' }}>
          <span>Page {currentPage} of {totalPages}</span>
          <span>{ZOOM_LABELS[zoomIdx]}</span>
          <span>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
          <span className="hidden sm:inline">← → navigate · +/- zoom · Ctrl+F search · F fullscreen</span>
        </div>
      )}
    </div>
  );
}

/** Toolbar button component */
function ToolbarBtn({ onClick, disabled, title, active, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-all duration-150 disabled:opacity-30"
      style={{
        background: active ? 'var(--tp-selection)' : 'rgba(255,255,255,0.05)',
        color: active ? 'var(--tp-accent)' : 'var(--tp-muted)',
        border: active ? '1px solid var(--tp-accent)' : '1px solid transparent',
      }}
    >
      {children}
    </button>
  );
}
