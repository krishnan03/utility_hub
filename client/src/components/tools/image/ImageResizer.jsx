import { useState } from 'react';
import { motion } from 'framer-motion';
import FileUpload from '../../common/FileUpload';
import BatchUpload from '../../common/BatchUpload';
import ProgressBar from '../../common/ProgressBar';
import ErrorMessage from '../../common/ErrorMessage';
import DownloadButton from '../../common/DownloadButton';
import useServerProcess from '../../../hooks/useServerProcess';
import useFileStore from '../../../stores/useFileStore';

const PRESETS = [
  { label: 'Instagram Post', width: 1080, height: 1080 },
  { label: 'Instagram Story', width: 1080, height: 1920 },
  { label: 'Twitter Post', width: 1200, height: 675 },
  { label: 'Facebook Cover', width: 820, height: 312 },
  { label: 'LinkedIn Post', width: 1200, height: 627 },
  { label: 'YouTube Thumbnail', width: 1280, height: 720 },
];

export default function ImageResizer() {
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [usePercentage, setUsePercentage] = useState(false);
  const [percentage, setPercentage] = useState(50);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [origDim, setOrigDim] = useState({ w: 0, h: 0 });
  const { files, addFiles, removeFile, clearFiles } = useFileStore();
  const { process, processing, progress, error, result } = useServerProcess('/image/resize');

  const handleFilesSelected = (selected) => {
    addFiles(selected);
    if (selected.length > 0) {
      const url = URL.createObjectURL(selected[0]);
      setPreviewUrl(url);
      const img = new Image();
      img.onload = () => setOrigDim({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = url;
    }
  };

  const applyPreset = (preset) => {
    setUsePercentage(false);
    setWidth(String(preset.width));
    setHeight(String(preset.height));
    setLockAspectRatio(false);
  };

  const handleResize = async () => {
    if (files.length === 0) return;
    const options = usePercentage
      ? { percentage: String(percentage) }
      : { width, height, lockAspectRatio: String(lockAspectRatio) };

    try {
      await process(files, options);
    } catch {
      // error handled by hook
    }
  };

  const handleReset = () => {
    clearFiles();
    setWidth('');
    setHeight('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setOrigDim({ w: 0, h: 0 });
  };

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

      {/* Image preview with dimensions overlay */}
      {previewUrl && !result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rounded-xl overflow-hidden" style={{ background: '#1c1c1e' }}>
            <div className="relative">
              <img src={previewUrl} alt="Preview" className="w-full h-48 object-contain" />
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg text-xs font-mono text-white" style={{ background: 'rgba(0,0,0,0.7)' }}>
                {origDim.w} × {origDim.h}
              </div>
            </div>
            {(width || height) && (
              <div className="px-3 py-2 flex items-center justify-center gap-2 text-xs">
                <span className="text-surface-400 font-mono">{origDim.w}×{origDim.h}</span>
                <span className="text-primary-400">→</span>
                <span className="text-primary-400 font-mono font-bold">{width || '?'}×{height || '?'}</span>
              </div>
            )}
          </div>
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
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setUsePercentage(false)}
              className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                !usePercentage
                  ? 'bg-primary-600 text-white'
                  : 'text-surface-300'
              }`}
              style={!usePercentage ? undefined : { background: 'rgba(255,255,255,0.06)' }}
            >
              Pixels
            </button>
            <button
              type="button"
              onClick={() => setUsePercentage(true)}
              className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                usePercentage
                  ? 'bg-primary-600 text-white'
                  : 'text-surface-300'
              }`}
              style={usePercentage ? undefined : { background: 'rgba(255,255,255,0.06)' }}
            >
              Percentage
            </button>
          </div>

          {usePercentage ? (
            /* Percentage input */
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="percentage" className="text-sm font-medium text-surface-300">
                  Scale
                </label>
                <span className="text-sm text-surface-400">{percentage}%</span>
              </div>
              <input
                id="percentage"
                type="range"
                min={1}
                max={500}
                value={percentage}
                onChange={(e) => setPercentage(Number(e.target.value))}
                disabled={processing}
                className="w-full h-2 rounded-full appearance-none accent-primary-600"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              />
            </div>
          ) : (
            /* Pixel dimensions */
            <>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label htmlFor="width" className="block text-sm font-medium text-surface-300 mb-1.5">
                    Width (px)
                  </label>
                  <input
                    id="width"
                    type="number"
                    min={1}
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    placeholder="Auto"
                    disabled={processing}
                    className="w-full px-3 py-2.5 rounded-xl text-surface-100 text-sm min-h-[44px]"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                </div>

                {/* Lock aspect ratio */}
                <button
                  type="button"
                  onClick={() => setLockAspectRatio(!lockAspectRatio)}
                  aria-label={lockAspectRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                  className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${
                    lockAspectRatio
                      ? 'text-primary-400'
                      : 'text-surface-400'
                  }`}
                  style={{ background: lockAspectRatio ? 'rgba(255,99,99,0.12)' : 'rgba(255,255,255,0.06)' }}
                >
                  {lockAspectRatio ? '🔗' : '🔓'}
                </button>

                <div className="flex-1">
                  <label htmlFor="height" className="block text-sm font-medium text-surface-300 mb-1.5">
                    Height (px)
                  </label>
                  <input
                    id="height"
                    type="number"
                    min={1}
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="Auto"
                    disabled={processing}
                    className="w-full px-3 py-2.5 rounded-xl text-surface-100 text-sm min-h-[44px]"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                </div>
              </div>

              {/* Presets */}
              <div>
                <p className="text-sm font-medium text-surface-300 mb-2">Presets</p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      disabled={processing}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-surface-300 hover:bg-primary-900/30 hover:text-primary-400 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      {preset.label} ({preset.width}×{preset.height})
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Resize button */}
          <button
            type="button"
            onClick={handleResize}
            disabled={processing || files.length === 0}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {processing ? 'Resizing...' : `Resize ${files.length > 1 ? `${files.length} files` : 'Image'}`}
          </button>
        </motion.div>
      )}

      {/* Progress */}
      {processing && (
        <ProgressBar progress={progress} label="Resizing..." />
      )}

      {/* Error */}
      <ErrorMessage message={error} onRetry={handleResize} onDismiss={() => useFileStore.getState().setError(null)} />

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {result.metadata && (
            <p className="text-sm text-surface-400">
              Output: {result.metadata.outputName}
            </p>
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
            Resize another image
          </button>
        </motion.div>
      )}
    </div>
  );
}
