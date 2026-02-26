import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FileUpload from '../../common/FileUpload';
import ProgressBar from '../../common/ProgressBar';
import { PDFThumbnail, PDFPageGrid, loadPdfDoc } from '../../common/PDFThumbnail';

export default function PDFPages() {
  const [file, setFile] = useState(null);
  const [action, setAction] = useState('extract');
  const [pages, setPages] = useState('');
  const [selectedPages, setSelectedPages] = useState([]);
  const [pageCount, setPageCount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const step = result ? 'done' : file ? 'configure' : 'upload';

  const handleFileSelected = useCallback(async (files) => {
    const f = files[0];
    setFile(f);
    setSelectedPages([]);
    try {
      const pdf = await loadPdfDoc(f);
      setPageCount(pdf.numPages);
    } catch {
      setPageCount(0);
    }
  }, []);

  const handlePageClick = useCallback((pageNum) => {
    setSelectedPages((prev) =>
      prev.includes(pageNum) ? prev.filter((p) => p !== pageNum) : [...prev, pageNum].sort((a, b) => a - b)
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedPages(Array.from({ length: pageCount }, (_, i) => i + 1));
  }, [pageCount]);

  const deselectAll = useCallback(() => {
    setSelectedPages([]);
  }, []);

  const handleSubmit = async () => {
    const pageList = selectedPages.length > 0 ? selectedPages.join(', ') : pages;
    if (!file || !pageList.trim()) return;
    setProcessing(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('action', action);
      fd.append('pages', pageList);
      const res = await fetch('/api/pdf/pages', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Operation failed');
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setFile(null); setResult(null); setError(null); setPages(''); setSelectedPages([]); setPageCount(0); };

  // Overlay color based on action
  const overlayClass = action === 'delete' ? 'ring-red-500' : 'ring-primary-500';

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
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-lg">📑</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-100 truncate">{file?.name}</p>
                <p className="text-xs text-surface-500">{(file?.size / 1024 / 1024).toFixed(2)} MB{pageCount > 0 && ` · ${pageCount} pages`}</p>
              </div>
              <button type="button" onClick={reset} className="text-xs text-surface-400 hover:text-red-500 transition-colors">Change</button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-2">Action</label>
              <div className="flex gap-2">
                {[['extract', '📤 Extract'], ['delete', '🗑️ Delete']].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => { setAction(val); setSelectedPages([]); }} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${action === val ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`} style={action === val ? { background: val === 'delete' ? 'linear-gradient(135deg, #EF4444, #F97316)' : 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>{label}</button>
                ))}
              </div>
            </div>

            {pageCount > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-surface-300">
                    {selectedPages.length} of {pageCount} pages selected
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={selectAll} className="text-xs text-primary-500 hover:text-primary-400 transition-colors">Select All</button>
                    <span className="text-xs text-surface-600">|</span>
                    <button type="button" onClick={deselectAll} className="text-xs text-surface-400 hover:text-surface-300 transition-colors">Deselect All</button>
                  </div>
                </div>

                {/* Visual page grid with colored selection based on action */}
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(116px, 1fr))` }}>
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => {
                    const isSelected = selectedPages.includes(pageNum);
                    return (
                      <div key={pageNum} className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all">
                        <div className="relative">
                          <PDFThumbnail
                            file={file}
                            pageNum={pageNum}
                            width={100}
                            onClick={() => handlePageClick(pageNum)}
                            selected={isSelected}
                            className={isSelected ? (action === 'delete' ? '!ring-red-500 !ring-offset-surface-900' : '') : ''}
                          />
                          {/* Action-specific overlay */}
                          {isSelected && (
                            <div className={`absolute inset-0 rounded-lg flex items-center justify-center pointer-events-none ${action === 'delete' ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${action === 'delete' ? 'bg-red-500' : 'bg-blue-500'}`}>
                                {action === 'delete' ? (
                                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                ) : (
                                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Fallback text input */}
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">
                Or type page numbers manually
              </label>
              <input type="text" value={pages} onChange={(e) => setPages(e.target.value)} placeholder="e.g. 1, 3, 5-8" className="w-full px-4 py-2.5 rounded-xl text-sm text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>

            {action === 'delete' && selectedPages.length > 0 && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {selectedPages.length} page{selectedPages.length > 1 ? 's' : ''} will be permanently removed from the PDF.
              </div>
            )}

            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={selectedPages.length === 0 && !pages.trim()}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full min-h-[52px] rounded-2xl text-base font-bold text-white shadow-lg shadow-primary-500/20 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              style={{ background: action === 'delete' ? 'linear-gradient(135deg, #EF4444, #F97316)' : 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
            >
              {action === 'extract'
                ? `Extract ${selectedPages.length || ''} Page${selectedPages.length !== 1 ? 's' : ''}`
                : `Delete ${selectedPages.length || ''} Page${selectedPages.length !== 1 ? 's' : ''}`
              }
            </motion.button>
          </motion.div>
        )}

        {processing && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8">
            <ProgressBar label="Processing pages..." indeterminate />
          </motion.div>
        )}

        {step === 'done' && result && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="flex flex-col items-center gap-4 p-6 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(255,99,99,0.08), rgba(16,185,129,0.08))', border: '1px solid rgba(255,99,99,0.15)' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }} className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </motion.div>
              <p className="text-sm font-semibold text-surface-100">Done!</p>
              <a href={result.downloadUrl} download={result.metadata?.outputName || 'output.pdf'} className="w-full flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-2xl text-sm font-semibold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download PDF
              </a>
              <p className="text-xs text-surface-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Your data is auto-deleted in 24h
              </p>
            </div>
            <div className="text-center"><button type="button" onClick={reset} className="text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors">Process another PDF →</button></div>
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
