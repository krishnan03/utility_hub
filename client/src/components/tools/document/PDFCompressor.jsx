import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FileUpload from '../../common/FileUpload';
import ProgressBar from '../../common/ProgressBar';

const QUALITY_OPTIONS = [
  { value: 'low', label: 'Low', desc: 'Max compression, smaller file' },
  { value: 'medium', label: 'Medium', desc: 'Balanced quality & size' },
  { value: 'high', label: 'High', desc: 'Minimal compression, best quality' },
];

const STATUS_BADGES = {
  pending: { icon: '⏳', label: 'Pending', cls: 'text-surface-400' },
  processing: { icon: '🔄', label: 'Processing', cls: 'text-primary-500' },
  done: { icon: '✅', label: 'Done', cls: 'text-emerald-500' },
  error: { icon: '❌', label: 'Error', cls: 'text-red-500' },
};

function formatSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function PDFCompressor() {
  const [files, setFiles] = useState([]);
  const [quality, setQuality] = useState('medium');
  const [processing, setProcessing] = useState(false);
  const [fileResults, setFileResults] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [error, setError] = useState(null);

  const hasResults = fileResults.length > 0 && fileResults.every((r) => r.status === 'done' || r.status === 'error');
  const step = hasResults ? 'done' : files.length > 0 ? 'configure' : 'upload';

  const handleFilesSelected = useCallback((newFiles) => {
    const pdfs = Array.from(newFiles).filter((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    setFiles((prev) => [...prev, ...pdfs]);
  }, []);

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const compressOne = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('quality', quality);
    const res = await fetch('/api/pdf/compress', { method: 'POST', body: fd, credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'Compression failed');
    return data;
  };

  const handleCompress = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setError(null);

    const results = files.map((file) => ({ file, result: null, error: null, status: 'pending' }));
    setFileResults([...results]);

    for (let i = 0; i < files.length; i++) {
      setCurrentIndex(i);
      results[i].status = 'processing';
      setFileResults([...results]);

      try {
        const data = await compressOne(files[i]);
        results[i].result = data;
        results[i].status = 'done';
      } catch (e) {
        results[i].error = e.message;
        results[i].status = 'error';
      }
      setFileResults([...results]);
    }

    setCurrentIndex(-1);
    setProcessing(false);
  };

  const handleDownloadAll = async () => {
    const doneResults = fileResults.filter((r) => r.status === 'done' && r.result?.downloadUrl);
    if (doneResults.length === 0) return;

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (const r of doneResults) {
        const resp = await fetch(r.result.downloadUrl);
        const blob = await resp.blob();
        const name = r.result.metadata?.outputName || `compressed_${r.file.name}`;
        zip.file(name, blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'compressed_pdfs.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: download individually
      for (const r of doneResults) {
        const a = document.createElement('a');
        a.href = r.result.downloadUrl;
        a.download = r.result.metadata?.outputName || `compressed_${r.file.name}`;
        a.click();
      }
    }
  };

  const reset = () => { setFiles([]); setFileResults([]); setError(null); setCurrentIndex(-1); };

  const totalOriginal = fileResults.reduce((sum, r) => sum + (r.result?.metadata?.originalSize || 0), 0);
  const totalCompressed = fileResults.reduce((sum, r) => sum + (r.result?.metadata?.compressedSize || 0), 0);
  const totalSavings = totalOriginal > 0 ? Math.round((1 - totalCompressed / totalOriginal) * 100) : 0;
  const doneCount = fileResults.filter((r) => r.status === 'done').length;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FileUpload onFilesSelected={handleFilesSelected} accept=".pdf,application/pdf" multiple={true} />
          </motion.div>
        )}

        {step === 'configure' && !processing && (
          <motion.div key="configure" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            {/* File list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-surface-300">{files.length} file{files.length !== 1 ? 's' : ''} selected</label>
                <button type="button" onClick={reset} className="text-xs text-surface-400 hover:text-red-500 transition-colors">Clear all</button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {files.map((f, i) => (
                  <motion.div
                    key={`${f.name}-${i}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <span className="text-base">📄</span>
                    <span className="flex-1 text-sm text-surface-200 truncate min-w-0">{f.name}</span>
                    <span className="text-xs text-surface-500 shrink-0">{formatSize(f.size)}</span>
                    <button type="button" onClick={() => removeFile(i)} className="w-6 h-6 flex items-center justify-center rounded-md text-surface-400 hover:text-red-500 hover:bg-red-500/10 transition-all text-sm">×</button>
                  </motion.div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => document.querySelector('input[type=file]')?.click()}
                className="w-full py-2 rounded-lg text-xs font-medium text-primary-500 border border-dashed border-primary-500/40 hover:bg-primary-500/5 transition-colors"
              >
                + Add more PDFs
              </button>
            </div>

            {/* Quality options */}
            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-3">Compression quality</label>
              <div className="space-y-2">
                {QUALITY_OPTIONS.map(({ value, label, desc }) => (
                  <button key={value} type="button" onClick={() => setQuality(value)} className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 text-left min-h-[44px] ${quality === value ? 'border-primary-500/50 bg-primary-500/10' : 'hover:border-primary-500/30'}`} style={quality !== value ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' } : undefined}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${quality === value ? 'border-primary-500' : 'border-surface-600'}`}>
                      {quality === value && <div className="w-2 h-2 rounded-full bg-primary-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-surface-100">{label}</p>
                      <p className="text-xs text-surface-400">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <motion.button type="button" onClick={handleCompress} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full min-h-[52px] rounded-2xl text-base font-bold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200">
              Compress {files.length > 1 ? `${files.length} PDFs` : 'PDF'}
            </motion.button>
          </motion.div>
        )}

        {processing && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 py-4">
            <ProgressBar label={`Compressing file ${currentIndex + 1} of ${files.length}...`} indeterminate />
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {fileResults.map((r, i) => {
                const badge = STATUS_BADGES[r.status];
                const savings = r.result?.metadata?.originalSize && r.result?.metadata?.compressedSize
                  ? Math.round((1 - r.result.metadata.compressedSize / r.result.metadata.originalSize) * 100)
                  : null;
                return (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <span>{badge.icon}</span>
                    <span className="flex-1 truncate text-surface-300">{r.file.name}</span>
                    <span className={`shrink-0 font-medium ${badge.cls}`}>
                      {r.status === 'done' && savings !== null ? `${savings}% saved` : badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="flex flex-col items-center gap-4 p-6 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(255,99,99,0.08), rgba(16,185,129,0.08))', border: '1px solid rgba(255,99,99,0.15)' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }} className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </motion.div>
              <p className="text-sm font-semibold text-surface-100">
                {doneCount === fileResults.length ? 'All files compressed!' : `${doneCount} of ${fileResults.length} files compressed`}
              </p>

              {/* Total stats */}
              {totalOriginal > 0 && (
                <div className="flex gap-4 w-full">
                  <div className="flex-1 p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <p className="text-xs text-surface-400 mb-1">Total before</p>
                    <p className="text-sm font-bold text-surface-100">{formatSize(totalOriginal)}</p>
                  </div>
                  <div className="flex-1 p-3 rounded-xl bg-emerald-500/10 text-center">
                    <p className="text-xs text-surface-400 mb-1">Total after</p>
                    <p className="text-sm font-bold text-emerald-500">{formatSize(totalCompressed)}</p>
                  </div>
                  <div className="flex-1 p-3 rounded-xl bg-primary-500/10 text-center">
                    <p className="text-xs text-surface-400 mb-1">Total saved</p>
                    <p className="text-sm font-bold text-primary-500">{totalSavings}%</p>
                  </div>
                </div>
              )}
            </div>

            {/* Per-file results */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {fileResults.map((r, i) => {
                const badge = STATUS_BADGES[r.status];
                const savings = r.result?.metadata?.originalSize && r.result?.metadata?.compressedSize
                  ? Math.round((1 - r.result.metadata.compressedSize / r.result.metadata.originalSize) * 100)
                  : null;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <span className="text-base">📄</span>
                    <span className="flex-1 truncate text-surface-200 min-w-0">{r.file.name}</span>
                    {r.result?.metadata?.originalSize && (
                      <span className="text-surface-500 shrink-0">{formatSize(r.result.metadata.originalSize)} → {formatSize(r.result.metadata.compressedSize)}</span>
                    )}
                    <span className={`shrink-0 font-medium ${badge.cls}`}>
                      {r.status === 'done' && savings !== null ? `${savings}%` : badge.label}
                    </span>
                    {r.status === 'done' && r.result?.downloadUrl && (
                      <a href={r.result.downloadUrl} download={r.result.metadata?.outputName || `compressed_${r.file.name}`} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 transition-colors" title="Download">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </a>
                    )}
                    {r.status === 'error' && (
                      <span className="text-red-400 truncate max-w-[120px]" title={r.error}>{r.error}</span>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Download All + Reset */}
            <div className="space-y-3">
              {doneCount > 1 && (
                <motion.button type="button" onClick={handleDownloadAll} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-2xl text-sm font-semibold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download All as ZIP
                </motion.button>
              )}
              {doneCount === 1 && fileResults.find((r) => r.status === 'done')?.result?.downloadUrl && (
                <a href={fileResults.find((r) => r.status === 'done').result.downloadUrl} download={fileResults.find((r) => r.status === 'done').result.metadata?.outputName || 'compressed.pdf'} className="w-full flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-2xl text-sm font-semibold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download Compressed PDF
                </a>
              )}
              <p className="text-xs text-surface-400 flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Your data is auto-deleted in 24h
              </p>
              <div className="text-center"><button type="button" onClick={reset} className="text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors">Compress more PDFs →</button></div>
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
