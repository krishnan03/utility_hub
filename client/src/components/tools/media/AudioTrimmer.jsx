import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FileUpload from '../../common/FileUpload';
import ProgressBar from '../../common/ProgressBar';

const stepVariants = {
  enter: { opacity: 0, x: 20 },
  center: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

function StepIndicator({ step }) {
  const steps = ['Upload', 'Configure', 'Download'];
  const idx = ['upload', 'configure', 'done'].indexOf(step);
  return (
    <div className="flex items-center gap-3 mb-2">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-3 flex-1">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${i === idx ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30 scale-110' : i < idx ? 'bg-primary-500/20 text-primary-500' : 'text-surface-400'}`} style={i > idx ? { background: 'rgba(255,255,255,0.06)' } : undefined}>{i + 1}</div>
          <span className={`text-xs font-semibold hidden sm:block transition-colors ${i <= idx ? 'text-surface-100' : 'text-surface-400'}`}>{label}</span>
          {i < 2 && <div className={`flex-1 h-0.5 rounded-full transition-colors duration-500 ${i < idx ? 'bg-primary-500' : ''}`} style={i >= idx ? { background: 'rgba(255,255,255,0.06)' } : undefined} />}
        </div>
      ))}
    </div>
  );
}

export default function AudioTrimmer() {
  const [file, setFile] = useState(null);
  const [startTime, setStartTime] = useState('0');
  const [endTime, setEndTime] = useState('30');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const step = result ? 'done' : file ? 'configure' : 'upload';

  const handleSubmit = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(0);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('startTime', startTime);
      fd.append('endTime', endTime);
      const res = await fetch('/api/media/audio-trim', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Trim failed');
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
      setProgress(100);
    }
  };

  const reset = () => { setFile(null); setResult(null); setError(null); setProgress(0); };

  return (
    <div className="space-y-6">
      <StepIndicator step={step} />
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div key="upload" variants={stepVariants} initial="enter" animate="center" exit="exit">
            <FileUpload onFilesSelected={(f) => setFile(f[0])} accept="audio/*" multiple={false} />
          </motion.div>
        )}

        {step === 'configure' && !processing && (
          <motion.div key="configure" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-5">
            <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-lg">✂️</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-100 truncate">{file?.name}</p>
                <p className="text-xs text-surface-500">{(file?.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button type="button" onClick={reset} className="text-xs text-surface-400 hover:text-red-500 transition-colors">Change</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-surface-300 mb-1.5">Start Time (s)</label>
                <input
                  type="number"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  min="0"
                  step="0.1"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-surface-300 mb-1.5">End Time (s)</label>
                <input
                  type="number"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  min="0"
                  step="0.1"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
            </div>

            {Number(endTime) > Number(startTime) && (
              <p className="text-xs text-surface-400">
                Clip duration: <span className="font-mono text-primary-500">{(Number(endTime) - Number(startTime)).toFixed(1)}s</span>
              </p>
            )}

            <motion.button type="button" onClick={handleSubmit} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full min-h-[52px] rounded-2xl text-base font-bold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200">
              Trim Audio
            </motion.button>
          </motion.div>
        )}

        {processing && (
          <motion.div key="processing" variants={stepVariants} initial="enter" animate="center" exit="exit" className="py-8">
            <ProgressBar progress={progress} label="Trimming audio..." indeterminate />
          </motion.div>
        )}

        {step === 'done' && result && (
          <motion.div key="done" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-4">
            <div className="flex flex-col items-center gap-4 p-6 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(255,99,99,0.08), rgba(16,185,129,0.08))', border: '1px solid rgba(255,99,99,0.15)' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }} className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </motion.div>
              <p className="text-sm font-semibold text-surface-100">Audio trimmed!</p>
              <a href={result.downloadUrl} download={result.metadata?.outputName} className="w-full flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-2xl text-sm font-semibold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download Trimmed Audio
              </a>
              <p className="text-xs text-surface-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Your data is auto-deleted in 24h
              </p>
            </div>
            <div className="text-center"><button type="button" onClick={reset} className="text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors">Trim another file →</button></div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-500 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </motion.div>
      )}
    </div>
  );
}
