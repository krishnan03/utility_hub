import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FileUpload from '../../common/FileUpload';
import ProgressBar from '../../common/ProgressBar';

const stepVariants = {
  enter: { opacity: 0, x: 20 },
  center: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

const QUALITY_OPTIONS = [
  { label: 'High', value: '18', desc: 'Best quality, larger file' },
  { label: 'Medium', value: '23', desc: 'Balanced quality & size' },
  { label: 'Low', value: '28', desc: 'Smaller file, lower quality' },
];

const RESOLUTION_OPTIONS = [
  { label: 'Original', value: 'original' },
  { label: '1080p', value: '1080p' },
  { label: '720p', value: '720p' },
  { label: '480p', value: '480p' },
];

const PRESETS = [
  { id: 'web', label: '🌐 Web', desc: '720p, fast loading', quality: '23', resolution: '720p' },
  { id: 'email', label: '📧 Email', desc: '480p, <25MB target', quality: '28', resolution: '480p' },
  { id: 'social', label: '📱 Social Media', desc: '1080p, IG/TikTok/YT', quality: '23', resolution: '1080p' },
  { id: 'archive', label: '🗄️ Archive', desc: 'Original, high quality', quality: '18', resolution: 'original' },
];

const QUALITY_FACTORS = { '18': 0.7, '23': 0.4, '28': 0.2 };
const RESOLUTION_FACTORS = { original: 1.0, '1080p': 0.8, '720p': 0.5, '480p': 0.3 };

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

function VideoPreview({ file, className = '' }) {
  const videoRef = useRef(null);
  const [meta, setMeta] = useState(null);
  const urlRef = useRef(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setMeta({
      duration: v.duration,
      width: v.videoWidth,
      height: v.videoHeight,
    });
  };

  if (!file || !urlRef.current) return null;

  return (
    <div className={`rounded-2xl overflow-hidden ${className}`} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <video
        ref={videoRef}
        src={urlRef.current}
        controls
        onLoadedMetadata={handleMetadata}
        className="w-full max-h-56 object-contain bg-black"
        preload="metadata"
      />
      {meta && (
        <div className="flex items-center gap-4 px-4 py-2.5 text-xs text-surface-400">
          <span className="flex items-center gap-1">⏱ {Math.floor(meta.duration / 60)}:{String(Math.floor(meta.duration % 60)).padStart(2, '0')}</span>
          <span className="flex items-center gap-1">📐 {meta.width}×{meta.height}</span>
          <span className="flex items-center gap-1">📦 {(file.size / 1024 / 1024).toFixed(2)} MB</span>
        </div>
      )}
    </div>
  );
}

export default function VideoCompressor() {
  const [file, setFile] = useState(null);
  const [quality, setQuality] = useState('23');
  const [resolution, setResolution] = useState('original');
  const [activePreset, setActivePreset] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const step = result ? 'done' : file ? 'configure' : 'upload';

  const applyPreset = (preset) => {
    setQuality(preset.quality);
    setResolution(preset.resolution);
    setActivePreset(preset.id);
  };

  // Clear active preset when user manually changes quality/resolution
  const handleQualityChange = (val) => {
    setQuality(val);
    setActivePreset(null);
  };
  const handleResolutionChange = (val) => {
    setResolution(val);
    setActivePreset(null);
  };

  const estimatedSize = useMemo(() => {
    if (!file) return null;
    const qf = QUALITY_FACTORS[quality] || 0.4;
    const rf = RESOLUTION_FACTORS[resolution] || 1.0;
    return file.size * qf * rf;
  }, [file, quality, resolution]);

  const handleSubmit = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(0);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('quality', quality);
      fd.append('resolution', resolution);
      const res = await fetch('/api/media/video', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Compression failed');
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
      setProgress(100);
    }
  };

  const reset = () => { setFile(null); setResult(null); setError(null); setProgress(0); setActivePreset(null); };

  return (
    <div className="space-y-6">
      <StepIndicator step={step} />
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div key="upload" variants={stepVariants} initial="enter" animate="center" exit="exit">
            <FileUpload onFilesSelected={(f) => setFile(f[0])} accept="video/*" multiple={false} />
          </motion.div>
        )}

        {step === 'configure' && !processing && (
          <motion.div key="configure" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-5">
            {/* File info */}
            <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-lg">📉</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-100 truncate">{file?.name}</p>
                <p className="text-xs text-surface-500">{(file?.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button type="button" onClick={reset} className="text-xs text-surface-400 hover:text-red-500 transition-colors">Change</button>
            </div>

            {/* Video preview */}
            <VideoPreview file={file} />

            {/* Use-case presets */}
            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-2">Use-case presets</label>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((p) => (
                  <motion.button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl text-left transition-all duration-200 min-h-[44px] ${activePreset === p.id ? 'text-white ring-1 ring-primary-500/50' : 'text-surface-300 hover:bg-white/5'}`}
                    style={activePreset === p.id ? { background: 'linear-gradient(135deg, rgba(255,99,99,0.2), rgba(255,159,67,0.2))' } : { background: 'rgba(255,255,255,0.06)' }}
                  >
                    <span className="text-lg">{p.label.split(' ')[0]}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{p.label.split(' ').slice(1).join(' ')}</p>
                      <p className={`text-xs ${activePreset === p.id ? 'text-white/60' : 'text-surface-500'}`}>{p.desc}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Quality */}
            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-2">Quality</label>
              <div className="grid grid-cols-3 gap-2">
                {QUALITY_OPTIONS.map((q) => (
                  <button key={q.value} type="button" onClick={() => handleQualityChange(q.value)} className={`py-3 px-2 rounded-xl text-center transition-all duration-200 min-h-[44px] ${quality === q.value ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`} style={quality === q.value ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                    <p className="text-sm font-bold">{q.label}</p>
                    <p className={`text-xs mt-0.5 ${quality === q.value ? 'text-white/70' : 'text-surface-400'}`}>{q.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-2">Resolution</label>
              <div className="grid grid-cols-4 gap-2">
                {RESOLUTION_OPTIONS.map((r) => (
                  <button key={r.value} type="button" onClick={() => handleResolutionChange(r.value)} className={`py-2.5 rounded-xl text-sm font-bold transition-all duration-200 min-h-[44px] ${resolution === r.value ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`} style={resolution === r.value ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>{r.label}</button>
                ))}
              </div>
            </div>

            {/* Estimated output size */}
            {estimatedSize && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(255,159,67,0.08)', border: '1px solid rgba(255,159,67,0.15)' }}
              >
                <span className="text-primary-500">📊</span>
                <span className="text-surface-300">Estimated output:</span>
                <span className="font-bold text-primary-500">~{(estimatedSize / 1024 / 1024).toFixed(1)} MB</span>
              </motion.div>
            )}

            <motion.button type="button" onClick={handleSubmit} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full min-h-[52px] rounded-2xl text-base font-bold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200">
              Compress Video
            </motion.button>
          </motion.div>
        )}

        {processing && (
          <motion.div key="processing" variants={stepVariants} initial="enter" animate="center" exit="exit" className="py-8">
            <ProgressBar progress={progress} label="Compressing video..." indeterminate />
          </motion.div>
        )}

        {step === 'done' && result && (
          <motion.div key="done" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-4">
            <div className="flex flex-col items-center gap-4 p-6 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(255,99,99,0.08), rgba(16,185,129,0.08))', border: '1px solid rgba(255,99,99,0.15)' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }} className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </motion.div>
              <p className="text-sm font-semibold text-surface-100">Video compressed!</p>

              {/* Compressed video preview */}
              {result.downloadUrl && (
                <div className="w-full rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  <video src={result.downloadUrl} controls className="w-full max-h-48 object-contain bg-black" preload="metadata" />
                </div>
              )}

              {result.metadata?.outputSize && (
                <p className="text-xs text-surface-400">
                  {(result.metadata.outputSize / 1024 / 1024).toFixed(2)} MB
                  {result.metadata.inputSize && (
                    <span className="text-emerald-500 ml-1">
                      ({Math.round((1 - result.metadata.outputSize / result.metadata.inputSize) * 100)}% smaller)
                    </span>
                  )}
                </p>
              )}
              <a href={result.downloadUrl} download={result.metadata?.outputName} className="w-full flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-2xl text-sm font-semibold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download Compressed Video
              </a>
              <p className="text-xs text-surface-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Your data is auto-deleted in 24h
              </p>
            </div>
            <div className="text-center"><button type="button" onClick={reset} className="text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors">Compress another video →</button></div>
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
