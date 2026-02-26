import { motion, AnimatePresence } from 'framer-motion';

const STATUS_STYLES = {
  pending: 'bg-surface-200 dark:bg-surface-700',
  uploading: 'bg-primary-500',
  complete: 'bg-green-500',
  error: 'bg-red-500',
};

const STATUS_LABELS = {
  pending: 'Pending',
  uploading: 'Uploading',
  complete: 'Complete',
  error: 'Error',
};

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Multi-file upload list with individual progress bars.
 *
 * Props:
 *  - files: Array<{ name, size, progress (0-100), status: 'pending'|'uploading'|'complete'|'error' }>
 *  - onRemove(index) — callback to remove a file
 */
export default function BatchUpload({ files = [], onRemove }) {
  if (files.length === 0) return null;

  return (
    <div aria-live="polite" aria-label="File upload list" className="w-full space-y-2">
      <AnimatePresence initial={false}>
        {files.map((file, index) => (
          <motion.div
            key={`${file.name}-${index}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-surface-100 dark:bg-surface-800"
          >
            {/* File info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-surface-700 dark:text-surface-200 truncate">
                  {file.name}
                </p>
                <span className="text-xs text-surface-400 dark:text-surface-500 shrink-0">
                  {formatSize(file.size)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${STATUS_STYLES[file.status] || STATUS_STYLES.pending}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${file.progress ?? 0}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>

              <p className="mt-1 text-xs text-surface-400 dark:text-surface-500">
                {STATUS_LABELS[file.status] || 'Pending'}
                {file.status === 'uploading' && file.progress != null && ` — ${file.progress}%`}
              </p>
            </div>

            {/* Remove button */}
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={`Remove ${file.name}`}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
