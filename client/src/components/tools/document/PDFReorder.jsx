import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FileUpload from '../../common/FileUpload';
import ProgressBar from '../../common/ProgressBar';
import { PDFPageGrid, loadPdfDoc } from '../../common/PDFThumbnail';

export default function PDFReorder() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageOrder, setPageOrder] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const step = result ? 'done' : file ? 'configure' : 'upload';

  const handleFileSelected = useCallback(async (files) => {
    const f = files[0];
    setFile(f);
    setPageOrder([]);
    setPageCount(0);
    setLoading(true);
    try {
      const pdf = await loadPdfDoc(f);
      const count = pdf.numPages;
      setPageCount(count);
      setPageOrder(Array.from({ length: count }, (_, i) => i + 1));
    } catch {
      setError('Could not read PDF pages. Please try another file.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReorderGrid = useCallback((newOrder) => {
    setPageOrder(newOrder);
  }, []);

  const handleReorder = async () => {
    if (!file || pageOrder.length === 0) return;
    setProcessing(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('pageOrder', JSON.stringify(pageOrder));
      const res = await fetch('/api/pdf/reorder', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Reorder failed');
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const resetOrder = useCallback(() => {
    setPageOrder(Array.from({ length: pageCount }, (_, i) => i + 1));
  }, [pageCount]);

  const reset = () => { setFile(null); setResult(null); setError(null); setPageOrder([]); setPageCount(0); };

  // Build a reorderable file wrapper that renders pages in pageOrder
  const ReorderableGrid = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-surface-400">Detecting pages...</span>
          </div>
        </div>
      );
    }

    if (pageCount === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-surface-300">
            {pageCount} pages — drag to reorder
          </p>
          <button type="button" onClick={resetOrder} className="text-xs text-surface-400 hover:text-surface-300 transition-colors">
            Reset order
          </button>
        </div>
        <p className="text-xs text-surface-500">Current order: {pageOrder.join(', ')}</p>
        <PDFPageGrid
          file={file}
          draggable
          onReorder={handleReorderGrid}
          thumbnailWidth={100}
        />
      </div>
    );
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
            <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-lg">📄</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-100 truncate">{file?.name}</p>
                <p className="text-xs text-surface-500">{(file?.size / 1024 / 1024).toFixed(2)} MB{pageCount > 0 && ` · ${pageCount} pages`}</p>
              </div>
              <button type="button" onClick={reset} className="text-xs text-surface-400 hover:text-red-500 transition-colors">Change</button>
            </div>

            <ReorderableGrid />

            {pageOrder.length > 0 && (
              <motion.button type="button" onClick={handleReorder} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full min-h-[52px] rounded-2xl text-base font-bold text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
                Apply Reorder
              </motion.button>
            )}
          </motion.div>
        )}

        {processing && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8">
            <ProgressBar label="Reordering pages..." indeterminate />
          </motion.div>
        )}

        {step === 'done' && result && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="flex flex-col items-center gap-4 p-6 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(255,99,99,0.08), rgba(16,185,129,0.08))', border: '1px solid rgba(255,99,99,0.15)' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }} className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </motion.div>
              <p className="text-sm font-semibold text-surface-100">Pages reordered!</p>
              <a href={result.downloadUrl} download={result.metadata?.outputName || 'reordered.pdf'} className="w-full flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-2xl text-sm font-semibold text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download PDF
              </a>
              <p className="text-xs text-surface-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Your data is auto-deleted in 24h
              </p>
            </div>
            <div className="text-center"><button type="button" onClick={reset} className="text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors">Reorder another PDF →</button></div>
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
