import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FileUpload from '../../common/FileUpload';
import ProgressBar from '../../common/ProgressBar';

export default function HEICToJPG() {
  const [files, setFiles] = useState([]);
  const [quality, setQuality] = useState(90);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const step = results.length > 0 ? 'done' : files.length > 0 ? 'configure' : 'upload';

  const handleConvert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setError(null);
    try {
      const converted = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('outputFormat', 'jpg');
        fd.append('quality', String(quality));
        const res = await fetch('/api/image/convert', { method: 'POST', body: fd, credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || `Failed to convert ${file.name}`);
        converted.push({ name: file.name.replace(/\.(heic|heif)$/i, '.jpg'), ...data });
      }
      setResults(converted);
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setFiles([]); setResults([]); setError(null); };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="text-sm text-surface-400 mb-3">Upload HEIC or HEIF files from iPhone/iPad</p>
            <FileUpload onFilesSelected={(f) => setFiles((prev) => [...prev, ...f])} accept=".heic,.heif,image/heic,image/heif" multiple />
          </motion.div>
        )}

        {step === 'configure' && !processing && (
          <motion.div key="configure" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-surface-100">{files.length} HEIC file{files.length > 1 ? 's' : ''}</p>
                <button type="button" onClick={reset} className="text-xs text-surface-400 hover:text-red-500 transition-colors">Clear</button>
              </div>
              <div className="space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-surface-400">
                    <span className="text-primary-500">📷</span>
                    <span className="truncate">{f.name}</span>
                    <span className="ml-auto shrink-0">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-surface-300">JPG quality</label>
                <span className="text-sm font-mono font-bold text-primary-500">{quality}%</span>
              </div>
              <input type="range" min="1" max="100" step="1" value={quality} onChange={(e) => setQuality(parseInt(e.target.value, 10))} className="w-full accent-primary-500" />
              <div className="flex justify-between text-xs text-surface-400 mt-1">
                <span>Smaller file</span>
                <span>Best quality</span>
              </div>
            </div>

            <motion.button type="button" onClick={handleConvert} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full min-h-[52px] rounded-2xl text-base font-bold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200">
              Convert to JPG
            </motion.button>
          </motion.div>
        )}

        {processing && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8">
            <ProgressBar label={`Converting ${files.length} file${files.length > 1 ? 's' : ''}...`} indeterminate />
          </motion.div>
        )}

        {step === 'done' && results.length > 0 && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="p-6 rounded-3xl space-y-4" style={{ background: 'linear-gradient(135deg, rgba(255,99,99,0.08), rgba(16,185,129,0.08))', border: '1px solid rgba(255,99,99,0.15)' }}>
              <div className="flex items-center gap-3">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }} className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </motion.div>
                <p className="text-sm font-semibold text-surface-100">{results.length} file{results.length > 1 ? 's' : ''} converted!</p>
              </div>
              <div className="space-y-2">
                {results.map((r, i) => (
                  <a key={i} href={r.downloadUrl} download={r.name} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all duration-200 group" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span className="text-lg">🖼️</span>
                    <span className="flex-1 text-sm font-medium text-surface-300 truncate">{r.name}</span>
                    <svg className="w-4 h-4 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </a>
                ))}
              </div>
              <p className="text-xs text-surface-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Your data is auto-deleted in 24h
              </p>
            </div>
            <div className="text-center"><button type="button" onClick={reset} className="text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors">Convert more HEIC files →</button></div>
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
