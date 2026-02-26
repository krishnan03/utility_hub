import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FileUpload from '../../common/FileUpload';
import ProgressBar from '../../common/ProgressBar';

const PAGE_SIZES = ['A4', 'Letter', 'Auto'];
const ORIENTATIONS = ['Portrait', 'Landscape'];

export default function ImageToPDF() {
  const [files, setFiles] = useState([]);
  const [pageSize, setPageSize] = useState('A4');
  const [orientation, setOrientation] = useState('Portrait');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const step = result ? 'done' : files.length > 0 ? 'configure' : 'upload';

  const addFiles = (newFiles) => setFiles((prev) => [...prev, ...newFiles]);
  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));
  const moveUp = (idx) => { if (idx === 0) return; setFiles((prev) => { const a = [...prev]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a; }); };
  const moveDown = (idx) => { if (idx === files.length - 1) return; setFiles((prev) => { const a = [...prev]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; return a; }); };

  const handleConvert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setError(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      fd.append('direction', 'images-to-pdf');
      fd.append('pageSize', pageSize);
      fd.append('orientation', orientation.toLowerCase());
      const res = await fetch('/api/pdf/convert', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Conversion failed');
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setFiles([]); setResult(null); setError(null); };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FileUpload onFilesSelected={addFiles} accept="image/*,.png,.jpg,.jpeg,.webp,.tiff,.bmp" multiple />
          </motion.div>
        )}

        {step === 'configure' && !processing && (
          <motion.div key="configure" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-surface-300">{files.length} image{files.length > 1 ? 's' : ''}</p>
                <button type="button" onClick={() => setFiles([])} className="text-xs text-surface-400 hover:text-red-500 transition-colors">Clear all</button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {files.map((f, i) => (
                  <motion.div key={`${f.name}-${i}`} layout className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span className="w-5 h-5 rounded bg-primary-500/10 text-primary-500 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="flex-1 text-xs text-surface-300 truncate">{f.name}</span>
                    <div className="flex items-center gap-0.5">
                      <button type="button" onClick={() => moveUp(i)} disabled={i === 0} className="w-6 h-6 flex items-center justify-center text-surface-400 hover:text-surface-700 disabled:opacity-30 transition-colors text-xs">↑</button>
                      <button type="button" onClick={() => moveDown(i)} disabled={i === files.length - 1} className="w-6 h-6 flex items-center justify-center text-surface-400 hover:text-surface-700 disabled:opacity-30 transition-colors text-xs">↓</button>
                      <button type="button" onClick={() => removeFile(i)} className="w-6 h-6 flex items-center justify-center text-surface-400 hover:text-red-500 transition-colors">×</button>
                    </div>
                  </motion.div>
                ))}
              </div>
              <button type="button" onClick={() => document.querySelector('input[type=file]')?.click()} className="w-full py-2 rounded-xl text-xs font-medium text-primary-500 border border-dashed border-primary-500/40 hover:bg-primary-500/5 transition-colors">+ Add more images</button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-2">Page size</label>
              <div className="flex gap-2">
                {PAGE_SIZES.map((s) => (
                  <button key={s} type="button" onClick={() => setPageSize(s)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${pageSize === s ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`} style={pageSize === s ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>{s}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-2">Orientation</label>
              <div className="flex gap-2">
                {ORIENTATIONS.map((o) => (
                  <button key={o} type="button" onClick={() => setOrientation(o)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${orientation === o ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`} style={orientation === o ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>{o}</button>
                ))}
              </div>
            </div>

            <motion.button type="button" onClick={handleConvert} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full min-h-[52px] rounded-2xl text-base font-bold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200">
              Convert to PDF
            </motion.button>
          </motion.div>
        )}

        {processing && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8">
            <ProgressBar label="Creating PDF..." indeterminate />
          </motion.div>
        )}

        {step === 'done' && result && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="flex flex-col items-center gap-4 p-6 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(255,99,99,0.08), rgba(16,185,129,0.08))', border: '1px solid rgba(255,99,99,0.15)' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }} className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </motion.div>
              <p className="text-sm font-semibold text-surface-100">PDF created from {files.length} image{files.length > 1 ? 's' : ''}!</p>
              <a href={result.downloadUrl} download={result.metadata?.outputName || 'images.pdf'} className="w-full flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-2xl text-sm font-semibold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download PDF
              </a>
              <p className="text-xs text-surface-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Your data is auto-deleted in 24h
              </p>
            </div>
            <div className="text-center"><button type="button" onClick={reset} className="text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors">Convert more images →</button></div>
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
