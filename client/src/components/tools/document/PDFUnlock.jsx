import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FileUpload from '../../common/FileUpload';

export default function PDFUnlock() {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const step = result ? 'done' : file ? 'configure' : 'upload';

  const handleUnlock = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, {
        password: password || undefined,
        ignoreEncryption: false,
      });
      // Save without encryption
      const savedBytes = await pdfDoc.save();
      const blob = new Blob([savedBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const outputName = file.name.replace(/\.pdf$/i, '') + '_unlocked.pdf';
      setResult({ downloadUrl: blobUrl, outputName });
    } catch (e) {
      if (e.message?.includes('password') || e.message?.includes('encrypted') || e.message?.includes('decrypt')) {
        setError('Incorrect password. Please check and try again.');
      } else {
        setError('Failed to unlock PDF: ' + e.message);
      }
    } finally {
      setProcessing(false);
    }
  }, [file, password]);

  const reset = () => {
    if (result?.downloadUrl?.startsWith('blob:')) URL.revokeObjectURL(result.downloadUrl);
    setFile(null);
    setResult(null);
    setError(null);
    setPassword('');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FileUpload onFilesSelected={(f) => setFile(f[0])} accept=".pdf,application/pdf" multiple={false} />
          </motion.div>
        )}

        {step === 'configure' && !processing && (
          <motion.div key="configure" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            {/* File info */}
            <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-lg">🔒</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-100 truncate">{file?.name}</p>
                <p className="text-xs text-surface-500">{(file?.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button type="button" onClick={reset} className="text-xs text-surface-400 hover:text-red-500 transition-colors">Change</button>
            </div>

            {/* Password input */}
            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-1">PDF password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && password) handleUnlock(); }}
                  placeholder="Enter the PDF password…"
                  className="w-full px-4 py-3 pr-12 rounded-xl text-sm text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-300 transition-colors">
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Privacy notice */}
            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              <div className="text-xs text-emerald-400/80">
                <p className="font-semibold text-emerald-400">100% Private</p>
                <p className="mt-0.5">Your password never leaves your browser. All processing happens locally on your device.</p>
              </div>
            </div>

            <motion.button type="button" onClick={handleUnlock} disabled={!password} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full min-h-[52px] rounded-2xl text-base font-bold text-white shadow-lg shadow-primary-500/20 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
              🔓 Unlock PDF
            </motion.button>
          </motion.div>
        )}

        {processing && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 py-12">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <svg className="w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            </motion.div>
            <p className="text-sm text-surface-400">Unlocking PDF…</p>
          </motion.div>
        )}

        {step === 'done' && result && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="flex flex-col items-center gap-4 p-6 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(255,99,99,0.08), rgba(16,185,129,0.08))', border: '1px solid rgba(255,99,99,0.15)' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }} className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </motion.div>
              <p className="text-sm font-semibold text-surface-100">PDF unlocked successfully!</p>
              <a href={result.downloadUrl} download={result.outputName} className="w-full flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-2xl text-sm font-semibold text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download Unlocked PDF
              </a>
              <p className="text-xs text-surface-500 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                100% client-side — your PDF never left your browser
              </p>
            </div>
            <div className="text-center">
              <button type="button" onClick={reset} className="text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors">Unlock another PDF →</button>
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
