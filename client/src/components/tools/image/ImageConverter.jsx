import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FileUpload from '../../common/FileUpload';
import BatchUpload from '../../common/BatchUpload';
import ProgressBar from '../../common/ProgressBar';
import ErrorMessage from '../../common/ErrorMessage';
import DownloadButton from '../../common/DownloadButton';
import useServerProcess from '../../../hooks/useServerProcess';
import useFileStore from '../../../stores/useFileStore';

const TARGET_FORMATS = ['PNG', 'JPG', 'WEBP', 'GIF', 'BMP', 'TIFF', 'ICO', 'AVIF'];

const stepVariants = {
  enter: { opacity: 0, x: 20 },
  center: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

export default function ImageConverter() {
  const [targetFormat, setTargetFormat] = useState('PNG');
  const [preserveMetadata, setPreserveMetadata] = useState(true);
  const { files, addFiles, removeFile, clearFiles } = useFileStore();
  const { process, processing, progress, error, result } = useServerProcess('/image/convert');

  const handleFilesSelected = (selected) => addFiles(selected);

  const handleConvert = async () => {
    if (files.length === 0) return;
    try {
      await process(files, {
        targetFormat: targetFormat.toLowerCase(),
        preserveMetadata: String(preserveMetadata),
      });
    } catch { /* error set in hook */ }
  };

  const handleReset = () => {
    clearFiles();
    useFileStore.getState().reset();
  };

  // Determine current step
  const step = result ? 'done' : files.length > 0 ? 'configure' : 'upload';

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-2">
        {['Upload', 'Configure', 'Download'].map((label, i) => {
          const stepNames = ['upload', 'configure', 'done'];
          const currentIdx = stepNames.indexOf(step);
          const isActive = i <= currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={label} className="flex items-center gap-3 flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${
                isCurrent
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30 scale-110'
                  : isActive
                    ? 'bg-primary-500/20 text-primary-500'
                    : 'text-surface-400'
              }`} style={!isCurrent && !isActive ? { background: 'rgba(255,255,255,0.06)' } : undefined}>
                {i + 1}
              </div>
              <span className={`text-xs font-semibold hidden sm:block transition-colors ${
                isActive ? 'text-surface-100' : 'text-surface-500'
              }`}>
                {label}
              </span>
              {i < 2 && (
                <div className={`flex-1 h-0.5 rounded-full transition-colors duration-500 ${
                  i < currentIdx ? 'bg-primary-500' : ''
                }`} style={i >= currentIdx ? { background: 'rgba(255,255,255,0.06)' } : undefined} />
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <motion.div key="upload" variants={stepVariants} initial="enter" animate="center" exit="exit">
            <FileUpload onFilesSelected={handleFilesSelected} accept="image/*" multiple />
          </motion.div>
        )}

        {/* Step 2: Configure */}
        {step === 'configure' && !processing && (
          <motion.div key="configure" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-5">
            {/* File summary */}
            <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                <span className="text-lg">🖼️</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-100">
                  {files.length} file{files.length > 1 ? 's' : ''} selected
                </p>
                <p className="text-xs text-surface-400 truncate">
                  {files.map(f => f.name).join(', ')}
                </p>
              </div>
              <button type="button" onClick={handleReset} className="text-xs text-surface-400 hover:text-red-500 transition-colors" aria-label="Remove files">
                Change
              </button>
            </div>

            {/* Format grid */}
            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-3">Convert to</label>
              <div className="grid grid-cols-4 gap-2">
                {TARGET_FORMATS.map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setTargetFormat(fmt)}
                    className={`py-3 rounded-2xl text-sm font-bold transition-all duration-200 ${
                      targetFormat === fmt
                        ? 'text-white scale-105'
                        : 'text-surface-300 hover:bg-white/5'
                    }`}
                    style={targetFormat === fmt ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Metadata toggle */}
            <label className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${preserveMetadata ? 'bg-primary-500' : 'bg-surface-600'}`}>
                <motion.div
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md"
                  animate={{ left: preserveMetadata ? '18px' : '2px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </div>
              <input type="checkbox" checked={preserveMetadata} onChange={(e) => setPreserveMetadata(e.target.checked)} className="sr-only" />
              <div>
                <span className="text-sm font-medium text-surface-300">Preserve metadata</span>
                <p className="text-xs text-surface-500">Keep EXIF data in converted images</p>
              </div>
            </label>

            {/* Convert button */}
            <motion.button
              type="button"
              onClick={handleConvert}
              disabled={processing}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full min-h-[52px] px-6 py-3.5 rounded-2xl text-base font-bold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl hover:shadow-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Convert to {targetFormat}
            </motion.button>
          </motion.div>
        )}

        {/* Processing */}
        {processing && (
          <motion.div key="processing" variants={stepVariants} initial="enter" animate="center" exit="exit" className="py-8">
            <ProgressBar progress={progress} label="Converting your files..." />
          </motion.div>
        )}

        {/* Step 3: Done */}
        {step === 'done' && (
          <motion.div key="done" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-4">
            <DownloadButton
              downloadUrl={result.downloadUrl}
              filename={result.metadata?.outputName}
              expiresAt={result.metadata?.expiresAt}
            />
            <div className="text-center">
              <button type="button" onClick={handleReset} className="text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors">
                Convert another image →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <ErrorMessage message={error} onRetry={handleConvert} onDismiss={() => useFileStore.getState().setError(null)} />
    </div>
  );
}
