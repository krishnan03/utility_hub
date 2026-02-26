import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FileUpload from '../../common/FileUpload';
import ProgressBar from '../../common/ProgressBar';

const FRAME_SKIP_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: '2', label: 'Every 2nd' },
  { value: '3', label: 'Every 3rd' },
];

export default function GIFMaker() {
  const [files, setFiles] = useState([]);
  const [inputType, setInputType] = useState('images');
  const [delay, setDelay] = useState(100);
  const [width, setWidth] = useState(480);
  const [loop, setLoop] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Optimization options
  const [colors, setColors] = useState(256);
  const [lossy, setLossy] = useState(0);
  const [frameSkip, setFrameSkip] = useState('none');
  const [dither, setDither] = useState(false);

  const step = result ? 'done' : files.length > 0 ? 'configure' : 'upload';

  const handleFilesSelected = (newFiles) => {
    if (inputType === 'video') setFiles([newFiles[0]]);
    else setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const applyQuickOptimize = () => {
    setColors(128);
    setLossy(80);
    setFrameSkip('none');
    setDither(true);
  };

  const estimatedSize = useMemo(() => {
    const frameCount = inputType === 'images' ? files.length : 30; // rough estimate for video
    if (frameCount === 0) return null;
    const skipDivisor = frameSkip === '2' ? 2 : frameSkip === '3' ? 3 : 1;
    const effectiveFrames = Math.ceil(frameCount / skipDivisor);
    const colorDepth = colors <= 16 ? 4 : colors <= 64 ? 6 : 8;
    const lossyFactor = 1 - (lossy / 400); // lossy 0→1.0, lossy 200→0.5
    const rawBytes = effectiveFrames * width * (width * 0.75) * (colorDepth / 8);
    const compressed = rawBytes * 0.3 * lossyFactor; // GIF compression ~30% of raw
    return Math.max(compressed, 1024); // at least 1KB
  }, [files.length, inputType, width, colors, lossy, frameSkip]);

  const handleCreate = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setError(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      fd.append('delay', String(delay));
      fd.append('width', String(width));
      fd.append('loop', String(loop));
      fd.append('inputType', inputType);
      fd.append('colors', String(colors));
      fd.append('lossy', String(lossy));
      fd.append('frameSkip', frameSkip);
      fd.append('dither', String(dither));
      const res = await fetch('/api/media/gif', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'GIF creation failed');
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setColors(256);
    setLossy(0);
    setFrameSkip('none');
    setDither(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-2">Input type</label>
              <div className="flex gap-2">
                {[['images', '🖼️ Images'], ['video', '🎬 Video clip']].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => { setInputType(val); setFiles([]); }} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 min-h-[44px] ${inputType === val ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`} style={inputType === val ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>{label}</button>
                ))}
              </div>
            </div>
            <FileUpload
              onFilesSelected={handleFilesSelected}
              accept={inputType === 'video' ? 'video/*,.mp4,.webm,.mov' : 'image/*,.png,.jpg,.jpeg,.gif,.webp'}
              multiple={inputType === 'images'}
            />
          </motion.div>
        )}

        {step === 'configure' && !processing && (
          <motion.div key="configure" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            {/* File summary */}
            <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-lg">🎞️</div>
                <div>
                  <p className="text-sm font-semibold text-surface-100">{files.length} {inputType === 'video' ? 'video' : `image${files.length > 1 ? 's' : ''}`}</p>
                  <p className="text-xs text-surface-500">{files.map(f => f.name).join(', ').slice(0, 40)}{files.map(f => f.name).join(', ').length > 40 ? '...' : ''}</p>
                </div>
              </div>
              <button type="button" onClick={reset} className="text-xs text-surface-400 hover:text-red-500 transition-colors">Clear</button>
            </div>

            {/* Image list */}
            {inputType === 'images' && files.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <span className="w-5 h-5 rounded bg-primary-500/10 text-primary-500 font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="flex-1 truncate text-surface-300">{f.name}</span>
                    <button type="button" onClick={() => removeFile(i)} className="text-surface-400 hover:text-red-500 transition-colors">×</button>
                  </div>
                ))}
                <button type="button" onClick={() => document.querySelector('input[type=file]')?.click()} className="w-full py-2 rounded-lg text-xs font-medium text-primary-500 border border-dashed border-primary-500/40 hover:bg-primary-500/5 transition-colors">+ Add more images</button>
              </div>
            )}

            {/* Basic settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold text-surface-300">Frame delay</label>
                  <span className="text-xs font-mono text-primary-500">{delay}ms</span>
                </div>
                <input type="range" min="20" max="1000" step="10" value={delay} onChange={(e) => setDelay(parseInt(e.target.value, 10))} className="w-full accent-primary-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold text-surface-300">Width</label>
                  <span className="text-xs font-mono text-primary-500">{width}px</span>
                </div>
                <input type="range" min="100" max="1200" step="20" value={width} onChange={(e) => setWidth(parseInt(e.target.value, 10))} className="w-full accent-primary-500" />
              </div>
            </div>

            {/* Loop count */}
            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-2">Loop count</label>
              <div className="flex gap-2">
                {[['0', 'Infinite'], ['1', 'Once'], ['3', '3 times'], ['5', '5 times']].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setLoop(parseInt(val, 10))} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 min-h-[44px] ${loop === parseInt(val, 10) ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`} style={loop === parseInt(val, 10) ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>{label}</button>
                ))}
              </div>
            </div>

            {/* Optimization section */}
            <div className="space-y-4 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-surface-200 flex items-center gap-2">
                  ⚡ Optimize
                </label>
                <motion.button
                  type="button"
                  onClick={applyQuickOptimize}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white min-h-[32px]"
                  style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
                >
                  Quick Optimize
                </motion.button>
              </div>

              {/* Color reduction */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-surface-300">Color reduction</label>
                  <span className="text-xs font-mono text-primary-500">{colors} colors</span>
                </div>
                <input type="range" min="16" max="256" step="16" value={colors} onChange={(e) => setColors(parseInt(e.target.value, 10))} className="w-full accent-primary-500" />
                <p className="text-xs text-surface-500 mt-0.5">Fewer colors = smaller file</p>
              </div>

              {/* Lossy compression */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-surface-300">Lossy compression</label>
                  <span className="text-xs font-mono text-primary-500">{lossy}</span>
                </div>
                <input type="range" min="0" max="200" step="10" value={lossy} onChange={(e) => setLossy(parseInt(e.target.value, 10))} className="w-full accent-primary-500" />
                <p className="text-xs text-surface-500 mt-0.5">Higher = more compression, lower quality</p>
              </div>

              {/* Frame skip */}
              <div>
                <label className="text-xs font-semibold text-surface-300 mb-2 block">Frame skip</label>
                <div className="flex gap-2">
                  {FRAME_SKIP_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setFrameSkip(opt.value)} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 min-h-[44px] ${frameSkip === opt.value ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`} style={frameSkip === opt.value ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>{opt.label}</button>
                  ))}
                </div>
              </div>

              {/* Dithering toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-surface-300">Dithering</label>
                  <p className="text-xs text-surface-500">Better appearance with fewer colors</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDither(!dither)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${dither ? 'bg-primary-500' : ''}`}
                  style={!dither ? { background: 'rgba(255,255,255,0.15)' } : undefined}
                  role="switch"
                  aria-checked={dither}
                >
                  <motion.div
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md"
                    animate={{ left: dither ? '22px' : '2px' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            </div>

            {/* Estimated file size */}
            {estimatedSize && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(255,159,67,0.08)', border: '1px solid rgba(255,159,67,0.15)' }}
              >
                <span className="text-primary-500">📊</span>
                <span className="text-surface-300">Estimated:</span>
                <span className="font-bold text-primary-500">
                  ~{estimatedSize > 1024 * 1024 ? `${(estimatedSize / 1024 / 1024).toFixed(1)} MB` : `${(estimatedSize / 1024).toFixed(0)} KB`}
                </span>
              </motion.div>
            )}

            <motion.button type="button" onClick={handleCreate} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full min-h-[52px] rounded-2xl text-base font-bold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200">
              Create GIF
            </motion.button>
          </motion.div>
        )}

        {processing && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8">
            <ProgressBar label="Creating GIF..." indeterminate />
          </motion.div>
        )}

        {step === 'done' && result && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="flex flex-col items-center gap-4 p-6 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(255,99,99,0.08), rgba(16,185,129,0.08))', border: '1px solid rgba(255,99,99,0.15)' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }} className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-2xl">🎉</motion.div>
              <p className="text-sm font-semibold text-surface-100">GIF created!</p>

              {/* GIF preview with file size */}
              {result.downloadUrl && (
                <div className="w-full space-y-2">
                  <img src={result.downloadUrl} alt="GIF preview" className="max-w-full max-h-48 rounded-xl mx-auto" style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
                  {result.metadata?.outputSize && (
                    <p className="text-xs text-surface-400 text-center">
                      File size: <span className="font-bold text-surface-200">
                        {result.metadata.outputSize > 1024 * 1024
                          ? `${(result.metadata.outputSize / 1024 / 1024).toFixed(2)} MB`
                          : `${(result.metadata.outputSize / 1024).toFixed(0)} KB`}
                      </span>
                      {result.metadata.frameCount && (
                        <span className="ml-2">• {result.metadata.frameCount} frames</span>
                      )}
                      {result.metadata.dimensions && (
                        <span className="ml-2">• {result.metadata.dimensions}</span>
                      )}
                    </p>
                  )}
                </div>
              )}

              <a href={result.downloadUrl} download={result.metadata?.outputName || 'animation.gif'} className="w-full flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-2xl text-sm font-semibold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download GIF
              </a>
              <p className="text-xs text-surface-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Your data is auto-deleted in 24h
              </p>
            </div>
            <div className="text-center"><button type="button" onClick={reset} className="text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors">Make another GIF →</button></div>
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
