import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FileUpload from '../../common/FileUpload';
import ProgressBar from '../../common/ProgressBar';

const FORMATS = ['MP3', 'WAV', 'OGG', 'FLAC', 'AAC', 'M4A'];
const BITRATES = ['64', '128', '192', '256', '320'];

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSize(bytes) {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
  return (bytes / 1024).toFixed(1) + ' KB';
}

function AudioPreview({ src, label }) {
  const audioRef = useRef(null);
  const [duration, setDuration] = useState(null);

  return (
    <div className="space-y-2">
      {label && <p className="text-xs font-semibold text-surface-300">{label}</p>}
      <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <audio
          ref={audioRef}
          src={src}
          controls
          onLoadedMetadata={() => setDuration(audioRef.current?.duration)}
          className="w-full h-10"
          style={{ filter: 'invert(0.85) hue-rotate(180deg)' }}
        />
        {duration != null && (
          <p className="text-xs text-surface-400 mt-1.5">Duration: {formatDuration(duration)}</p>
        )}
      </div>
    </div>
  );
}

export default function AudioConverter() {
  const [file, setFile] = useState(null);
  const [outputFormat, setOutputFormat] = useState('MP3');
  const [bitrate, setBitrate] = useState('192');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const step = result ? 'done' : file ? 'configure' : 'upload';

  // Create / revoke object URL for uploaded file preview
  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Cleanup converted result URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  const handleConvert = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('outputFormat', outputFormat.toLowerCase());
      fd.append('bitrate', bitrate);
      const res = await fetch('/api/media/audio', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Conversion failed');
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setFile(null); setResult(null); setError(null); };

  const sizeReduction = result?.metadata?.outputSize && file
    ? Math.round((1 - result.metadata.outputSize / file.size) * 100)
    : null;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FileUpload onFilesSelected={(f) => setFile(f[0])} accept=".mp3,.wav,.ogg,.flac,.aac,.m4a,audio/*" multiple={false} maxSize={209715200} />
          </motion.div>
        )}

        {step === 'configure' && !processing && (
          <motion.div key="configure" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-lg">🎵</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-100 truncate">{file?.name}</p>
                <p className="text-xs text-surface-500">{file?.name.split('.').pop()?.toUpperCase()} · {formatSize(file?.size)}</p>
              </div>
              <button type="button" onClick={reset} className="text-xs text-surface-400 hover:text-red-500 transition-colors">Change</button>
            </div>

            {/* Audio preview for uploaded file */}
            {previewUrl && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <AudioPreview src={previewUrl} label="Preview uploaded audio" />
              </motion.div>
            )}

            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-3">Output format</label>
              <div className="grid grid-cols-3 gap-2">
                {FORMATS.map((fmt) => (
                  <button key={fmt} type="button" onClick={() => setOutputFormat(fmt)} className={`py-3 rounded-2xl text-sm font-bold transition-all duration-200 ${outputFormat === fmt ? 'text-white scale-105' : 'text-surface-300 hover:bg-white/5'}`} style={outputFormat === fmt ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>{fmt}</button>
                ))}
              </div>
            </div>

            {['MP3', 'AAC', 'OGG'].includes(outputFormat) && (
              <div>
                <label className="block text-sm font-semibold text-surface-300 mb-3">Bitrate</label>
                <div className="flex gap-2">
                  {BITRATES.map((br) => (
                    <button key={br} type="button" onClick={() => setBitrate(br)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${bitrate === br ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`} style={bitrate === br ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>{br}</button>
                  ))}
                </div>
                <p className="text-xs text-surface-400 mt-1.5 text-right">{bitrate} kbps</p>
              </div>
            )}

            <motion.button type="button" onClick={handleConvert} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full min-h-[52px] rounded-2xl text-base font-bold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200">
              Convert to {outputFormat}
            </motion.button>
          </motion.div>
        )}

        {processing && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8">
            <ProgressBar label="Converting audio..." indeterminate />
            <p className="text-xs text-surface-400 text-center mt-3">Large files may take a moment</p>
          </motion.div>
        )}

        {step === 'done' && result && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="flex flex-col items-center gap-4 p-6 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(255,99,99,0.08), rgba(16,185,129,0.08))', border: '1px solid rgba(255,99,99,0.15)' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }} className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </motion.div>
              <p className="text-sm font-semibold text-surface-100">Audio converted!</p>

              {/* Compare section: original vs converted */}
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
                {previewUrl && <AudioPreview src={previewUrl} label="Original" />}
                <AudioPreview src={result.downloadUrl} label="Converted" />
              </div>

              {/* File size comparison */}
              {result.metadata?.outputSize && file && (
                <div className="w-full rounded-xl p-3 text-xs" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex justify-between text-surface-300">
                    <span>Original: {formatSize(file.size)}</span>
                    <span>Converted: {formatSize(result.metadata.outputSize)}</span>
                  </div>
                  {sizeReduction !== null && (
                    <p className={`mt-1 font-semibold ${sizeReduction > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {sizeReduction > 0 ? `${sizeReduction}% smaller` : sizeReduction < 0 ? `${Math.abs(sizeReduction)}% larger` : 'Same size'}
                    </p>
                  )}
                </div>
              )}

              <a href={result.downloadUrl} download={result.metadata?.outputName || `audio.${outputFormat.toLowerCase()}`} className="w-full flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-2xl text-sm font-semibold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download {outputFormat}
              </a>
              <p className="text-xs text-surface-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Your data is auto-deleted in 24h
              </p>
            </div>
            <div className="text-center"><button type="button" onClick={reset} className="text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors">Convert another file →</button></div>
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
