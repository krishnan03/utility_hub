import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FileUpload from '../../common/FileUpload';
import ProgressBar from '../../common/ProgressBar';

function formatSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function PDFFlatten() {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const step = result ? 'done' : file ? 'configure' : 'upload';

  const handleFilesSelected = useCallback((files) => {
    const pdf = Array.from(files).find((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (pdf) { setFile(pdf); setError(null); }
  }, []);

  const handleFlatten = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/pdf/flatten', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Flatten failed');
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setFile(null); setResult(null); setError(null); };

  const fieldsFlattened = result?.metadata?.fieldsFlattened ?? 0;
  const originalSize = result?.metadata?.originalSize ?? 0;
  const outputSize = result?.metadata?.outputSize ?? 0;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FileUpload onFilesSelected={handleFilesSelected} accept=".pdf,application/pdf" multiple={false} />
            <p className="text-xs text-surface-500 text-center mt-3">Upload a PDF with form fields, annotations, or interactive elements</p>
          </motion.div>
        )}

        {step === 'configure' && !processing && (
          <motion.div key="configure" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            {/* Selected file */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-lg">📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-200 truncate">{file.name}</p>
                <p className="text-xs text-surface-500">{formatSize(file.size)}</p>
              </div>
              <button type="button" onClick={reset} className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-500/10 transition-all text-sm">×</button>
            </div>

            {/* Info card */}
            <div className="p-4 rounded-2xl space-y-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-sm font-semibold text-surface-200">What flattening does:</p>
              <ul className="text-xs text-surface-400 space-y-1.5">
                <li className="flex items-start gap-2"><span className="text-primary-500 mt-0.5">•</span>Converts form fields (text, checkboxes, dropdowns) to static content</li>
                <li className="flex items-start gap-2"><span className="text-primary-500 mt-0.5">•</span>Removes interactive elements so the PDF looks the same everywhere</li>
                <li className="flex items-start gap-2"><span className="text-primary-500 mt-0.5">•</span>Preserves the visual appearance of filled-in form data</li>
              </ul>
            </div>

            <motion.button
              type="button"
              onClick={handleFlatten}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full min-h-[52px] rounded-2xl text-base font-bold text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
            >
              📋 Flatten PDF
            </motion.button>
          </motion.div>
        )}

        {processing && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 py-8">
            <ProgressBar label="Flattening PDF — removing interactive elements..." indeterminate />
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5">
            {/* Success header */}
            <div className="flex flex-col items-center gap-4 p-6 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(255,99,99,0.08), rgba(16,185,129,0.08))', border: '1px solid rgba(255,99,99,0.15)' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }} className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </motion.div>
              <p className="text-sm font-semibold text-surface-100">
                PDF Flattened Successfully
              </p>

              {/* Stats */}
              <div className="flex gap-3 w-full">
                <div className="flex-1 p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-xs text-surface-400 mb-1">Fields removed</p>
                  <p className="text-lg font-bold text-primary-500 font-mono">{fieldsFlattened}</p>
                </div>
                <div className="flex-1 p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-xs text-surface-400 mb-1">Before</p>
                  <p className="text-sm font-bold text-surface-100 font-mono">{formatSize(originalSize)}</p>
                </div>
                <div className="flex-1 p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-xs text-surface-400 mb-1">After</p>
                  <p className="text-sm font-bold text-emerald-500 font-mono">{formatSize(outputSize)}</p>
                </div>
              </div>

              {fieldsFlattened === 0 && (
                <p className="text-xs text-surface-400 text-center">No form fields were found — the PDF was re-saved as a clean static document.</p>
              )}
            </div>

            {/* Download */}
            <a
              href={result?.downloadUrl}
              download={result?.metadata?.outputName || 'flattened.pdf'}
              className="w-full flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-2xl text-sm font-bold text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download Flattened PDF
            </a>

            <p className="text-xs text-surface-400 flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Your data is auto-deleted in 24h
            </p>
            <div className="text-center">
              <button type="button" onClick={reset} className="text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors">Flatten another PDF →</button>
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
