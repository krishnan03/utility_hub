import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FileUpload({
  onFilesSelected,
  accept = '*',
  maxSize = 104857600,
  multiple = false,
}) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const [recentDrop, setRecentDrop] = useState(false);
  const inputRef = useRef(null);

  const validateFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList);
      const acceptedTypes = accept.split(',').map((t) => t.trim()).filter(Boolean);

      for (const file of files) {
        if (file.size > maxSize) {
          const limitMB = (maxSize / (1024 * 1024)).toFixed(0);
          setError(`"${file.name}" exceeds the ${limitMB} MB size limit.`);
          return null;
        }
        if (accept !== '*' && acceptedTypes.length > 0) {
          const matches = acceptedTypes.some((pattern) => {
            if (pattern.startsWith('.')) return file.name.toLowerCase().endsWith(pattern.toLowerCase());
            if (pattern.endsWith('/*')) return file.type.startsWith(pattern.replace('/*', '/'));
            return file.type === pattern;
          });
          if (!matches) {
            setError(`"${file.name}" is not an accepted file type.`);
            return null;
          }
        }
      }
      setError(null);
      return files;
    },
    [accept, maxSize],
  );

  const handleFiles = useCallback(
    (fileList) => {
      const valid = validateFiles(fileList);
      if (valid && valid.length > 0) {
        setRecentDrop(true);
        setTimeout(() => setRecentDrop(false), 600);
        onFilesSelected(valid);
      }
    },
    [validateFiles, onFilesSelected],
  );

  const handleDrop = useCallback((e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }, [handleFiles]);
  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setDragOver(false); }, []);
  const handleClick = () => inputRef.current?.click();
  const handleKeyDown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } };
  const handleInputChange = (e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ''; };

  return (
    <div className="w-full">
      <motion.div
        role="button"
        tabIndex={0}
        aria-label="Upload files by clicking or dragging and dropping"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        animate={{
          scale: dragOver ? 1.02 : recentDrop ? [1, 1.03, 1] : 1,
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`relative flex flex-col items-center justify-center gap-4 p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 min-h-[200px] overflow-hidden ${
          dragOver
            ? 'border-primary-500/60 bg-primary-500/10'
            : 'border-white/10 bg-white/[0.02] hover:border-primary-500/40 hover:bg-primary-500/5'
        }`}
      >
        {/* Animated background pulse on drag */}
        <AnimatePresence>
          {dragOver && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 2.5, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute w-40 h-40 rounded-full bg-primary-500"
              style={{ opacity: 0.08 }}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        {/* Upload icon with animation */}
        <motion.div
          animate={{ y: dragOver ? -8 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="relative z-10"
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300"
            style={{
              background: dragOver ? 'rgba(255,99,99,0.12)' : 'rgba(255,255,255,0.05)',
            }}
          >
            <svg
              className={`w-7 h-7 transition-colors duration-300 ${
                dragOver ? 'text-primary-500' : 'text-surface-500'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
        </motion.div>

        <div className="relative z-10 text-center">
          <p className="text-sm font-semibold text-surface-200">
            {dragOver ? 'Drop to upload' : 'Drop files here'}
          </p>
          <p className="mt-1 text-sm text-surface-500">
            or <span className="text-primary-400 font-medium">browse from your device</span>
          </p>
          <p className="mt-3 text-xs text-surface-600">
            Max {(maxSize / (1024 * 1024)).toFixed(0)} MB per file {multiple && '· Multiple files supported'}
          </p>
        </div>

        <input ref={inputRef} type="file" accept={accept} multiple={multiple} onChange={handleInputChange} className="hidden" aria-hidden="true" tabIndex={-1} />
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.p
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-3 text-sm text-accent-red flex items-center gap-2"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
