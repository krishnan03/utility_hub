import { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import FileUpload from '../../common/FileUpload';
import BatchUpload from '../../common/BatchUpload';
import ProgressBar from '../../common/ProgressBar';
import ErrorMessage from '../../common/ErrorMessage';
import DownloadButton from '../../common/DownloadButton';
import useServerProcess from '../../../hooks/useServerProcess';
import useFileStore from '../../../stores/useFileStore';

function BeforeAfterSlider({ before, after }) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef(null);

  const handleMove = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    setPos(Math.max(0, Math.min(100, (x / rect.width) * 100)));
  };

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl overflow-hidden cursor-col-resize select-none"
      style={{ height: 300 }}
      onMouseMove={(e) => e.buttons === 1 && handleMove(e)}
      onTouchMove={handleMove}
    >
      <img src={after} alt="After" className="absolute inset-0 w-full h-full object-contain" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img
          src={before}
          alt="Before"
          className="w-full h-full object-contain"
          style={{ width: `${100 / (pos / 100)}%`, maxWidth: 'none' }}
        />
      </div>
      <div className="absolute top-0 bottom-0" style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}>
        <div className="w-0.5 h-full bg-white shadow-lg" />
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
          <span className="text-xs text-gray-600">↔</span>
        </div>
      </div>
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold text-white" style={{ background: 'rgba(0,0,0,0.6)' }}>Before</div>
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold text-white" style={{ background: 'rgba(0,0,0,0.6)' }}>After</div>
    </div>
  );
}

export default function BackgroundRemover() {
  const [replacementColor, setReplacementColor] = useState('');
  const [replacementImage, setReplacementImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const { files, addFiles, removeFile, clearFiles } = useFileStore();
  const { process, processing, progress, error, result } = useServerProcess('/image/remove-bg');

  const handleFilesSelected = (selected) => {
    // Limit to 10 files for background removal
    const limited = selected.slice(0, 10);
    addFiles(limited);
    if (limited.length > 0) {
      setPreviewUrl(URL.createObjectURL(limited[0]));
    }
  };

  const handleReplacementImage = (selected) => {
    if (selected.length > 0) {
      setReplacementImage(selected[0]);
    }
  };

  const handleRemove = async () => {
    if (files.length === 0) return;
    const options = {};
    if (replacementColor) options.replacementColor = replacementColor;
    // If replacement image is provided, it will be sent as an additional file
    try {
      const filesToSend = [...files];
      if (replacementImage) {
        options.hasReplacementImage = 'true';
      }
      await process(filesToSend, options);
    } catch {
      // error handled by hook
    }
  };

  const handleReset = () => {
    clearFiles();
    setReplacementImage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const previewData = useMemo(() => {
    if (!result || !previewUrl) return null;
    return {
      before: { url: previewUrl, label: 'Original' },
      after: {
        url: result.preview ? `data:image/png;base64,${result.preview}` : result.downloadUrl,
        label: 'Background Removed',
      },
    };
  }, [result, previewUrl]);

  return (
    <div className="space-y-6">
      {/* Upload */}
      {!result && (
        <FileUpload
          onFilesSelected={handleFilesSelected}
          accept="image/*"
          multiple
        />
      )}

      {files.length > 0 && !result && (
        <p className="text-xs text-surface-500">
          {files.length} file{files.length !== 1 ? 's' : ''} selected (max 10)
        </p>
      )}

      {/* Uploaded image preview */}
      {previewUrl && !result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rounded-xl overflow-hidden" style={{ background: '#1c1c1e' }}>
            <img src={previewUrl} alt="Uploaded preview" className="w-full h-48 object-contain" />
          </div>
          <p className="text-xs text-surface-500 mt-2 text-center">
            Uses AI when available, threshold-based fallback otherwise.
          </p>
        </motion.div>
      )}

      {/* Batch list */}
      {files.length > 1 && !result && (
        <BatchUpload
          files={files.map((f) => ({
            name: f.name,
            size: f.size,
            progress: processing ? progress : 0,
            status: processing ? 'uploading' : 'pending',
          }))}
          onRemove={(index) => removeFile(files[index]?.id)}
        />
      )}

      {/* Options */}
      {files.length > 0 && !result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <p className="text-sm font-medium text-surface-300">
            Background Replacement (optional)
          </p>

          {/* Replacement color */}
          <div>
            <label htmlFor="bg-color" className="block text-xs text-surface-400 mb-1">
              Solid color
            </label>
            <div className="flex items-center gap-3">
              <input
                id="bg-color"
                type="color"
                value={replacementColor || '#ffffff'}
                onChange={(e) => { setReplacementColor(e.target.value); setReplacementImage(null); }}
                className="w-[44px] h-[44px] rounded-xl cursor-pointer"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <span className="text-sm text-surface-300">
                {replacementColor || 'Transparent (default)'}
              </span>
              {replacementColor && (
                <button
                  type="button"
                  onClick={() => setReplacementColor('')}
                  className="text-xs text-primary-400 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Replacement image */}
          <div>
            <label className="block text-xs text-surface-400 mb-1">
              Or upload replacement image
            </label>
            {replacementImage ? (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <span className="text-sm text-surface-300 truncate flex-1">
                  {replacementImage.name}
                </span>
                <button
                  type="button"
                  onClick={() => setReplacementImage(null)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <FileUpload
                onFilesSelected={handleReplacementImage}
                accept="image/*"
              />
            )}
          </div>

          {/* Remove button */}
          <button
            type="button"
            onClick={handleRemove}
            disabled={processing || files.length === 0}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {processing ? 'Removing Background...' : `Remove Background${files.length > 1 ? ` (${files.length} files)` : ''}`}
          </button>
        </motion.div>
      )}

      {/* Progress */}
      {processing && (
        <ProgressBar progress={progress} label="Removing background..." indeterminate />
      )}

      {/* Error */}
      <ErrorMessage message={error} onRetry={handleRemove} onDismiss={() => useFileStore.getState().setError(null)} />

      {/* Result with before/after slider */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {previewData && (
            <BeforeAfterSlider before={previewData.before.url} after={previewData.after.url} />
          )}
          <DownloadButton
            downloadUrl={result.downloadUrl}
            filename={result.metadata?.outputName}
            expiresAt={result.metadata?.expiresAt}
          />
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-primary-400 hover:underline"
          >
            Remove another background
          </button>
        </motion.div>
      )}
    </div>
  );
}
