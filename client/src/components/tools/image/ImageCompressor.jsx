import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import FileUpload from '../../common/FileUpload';
import BatchUpload from '../../common/BatchUpload';
import ProgressBar from '../../common/ProgressBar';
import ErrorMessage from '../../common/ErrorMessage';
import DownloadButton from '../../common/DownloadButton';
import PreviewPanel from '../../common/PreviewPanel';
import useServerProcess from '../../../hooks/useServerProcess';
import useFileStore from '../../../stores/useFileStore';

const formatSize = (bytes) => bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;

export default function ImageCompressor() {
  const [quality, setQuality] = useState(80);
  const [lossless, setLossless] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewDataUrl, setPreviewDataUrl] = useState(null);
  const [estimatedSize, setEstimatedSize] = useState(0);
  const [originalSize, setOriginalSize] = useState(0);
  const { files, addFiles, removeFile, clearFiles } = useFileStore();
  const { process, processing, progress, error, result } = useServerProcess('/image/compress');

  const handleFilesSelected = (selected) => {
    addFiles(selected);
    if (selected.length > 0) {
      const url = URL.createObjectURL(selected[0]);
      setPreviewUrl(url);
      setOriginalSize(selected[0].size);
    }
  };

  // Live preview: re-render at selected quality via Canvas
  useEffect(() => {
    if (!previewUrl || lossless) { setPreviewDataUrl(null); return; }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', quality / 100);
      setPreviewDataUrl(dataUrl);
      const base64Len = dataUrl.split(',')[1]?.length || 0;
      setEstimatedSize(Math.round(base64Len * 0.75));
    };
    img.src = previewUrl;
  }, [previewUrl, quality, lossless]);

  const handleCompress = async () => {
    if (files.length === 0) return;
    try {
      await process(files, {
        quality: String(quality),
        mode: lossless ? 'lossless' : 'lossy',
      });
    } catch {
      // error handled by hook
    }
  };

  const handleReset = () => {
    clearFiles();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewDataUrl(null);
    setEstimatedSize(0);
    setOriginalSize(0);
  };

  const previewData = useMemo(() => {
    if (!result) return null;
    return {
      before: {
        url: previewUrl,
        label: 'Original',
        size: result.metadata?.originalSize,
      },
      after: {
        url: result.preview ? `data:image/png;base64,${result.preview}` : result.downloadUrl,
        label: 'Compressed',
        size: result.metadata?.outputSize,
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

      {/* Visual before/after preview */}
      {previewUrl && !result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {/* Side by side preview */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <img src={previewUrl} alt="Original" className="w-full h-40 object-contain" />
              <div className="px-3 py-2 text-center">
                <p className="text-xs text-surface-400">Original</p>
                <p className="text-sm font-mono font-bold text-surface-200">{formatSize(originalSize)}</p>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <img src={previewDataUrl || previewUrl} alt="Preview" className="w-full h-40 object-contain" />
              <div className="px-3 py-2 text-center">
                <p className="text-xs text-surface-400">Estimated</p>
                <p className="text-sm font-mono font-bold text-primary-400">{formatSize(estimatedSize)}</p>
              </div>
            </div>
          </div>
          {/* Compression ratio bar */}
          {estimatedSize > 0 && originalSize > 0 && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full" style={{ width: `${(estimatedSize / originalSize) * 100}%`, background: 'linear-gradient(90deg, #30d158, #FF9F43)' }} />
              </div>
              <span className="text-xs font-mono text-accent-green font-bold">
                {Math.round((1 - estimatedSize / originalSize) * 100)}% smaller
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Options */}
      {files.length > 0 && !result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Quality slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="quality" className="text-sm font-medium text-surface-200">
                Quality
              </label>
              <span className="text-sm text-surface-400">{quality}%</span>
            </div>
            <input
              id="quality"
              type="range"
              min={1}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              disabled={processing || lossless}
              className="w-full h-2 rounded-full appearance-none accent-primary-600"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            />
            <div className="flex justify-between text-xs text-surface-500 mt-1">
              <span>Smaller file</span>
              <span>Higher quality</span>
            </div>
          </div>

          {/* Lossless toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={lossless}
              onChange={(e) => setLossless(e.target.checked)}
              disabled={processing}
              className="w-5 h-5 rounded border-surface-600 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-surface-200">
              Lossless compression
            </span>
          </label>

          {/* Compress button */}
          <button
            type="button"
            onClick={handleCompress}
            disabled={processing || files.length === 0}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {processing ? 'Compressing...' : `Compress ${files.length > 1 ? `${files.length} files` : 'Image'}`}
          </button>
        </motion.div>
      )}

      {/* Progress */}
      {processing && (
        <ProgressBar progress={progress} label="Compressing..." />
      )}

      {/* Error */}
      <ErrorMessage message={error} onRetry={handleCompress} onDismiss={() => useFileStore.getState().setError(null)} />

      {/* Result with preview */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {previewData && (
            <PreviewPanel before={previewData.before} after={previewData.after} />
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
            Compress another image
          </button>
        </motion.div>
      )}
    </div>
  );
}
