function formatSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function calcSavings(beforeSize, afterSize) {
  if (!beforeSize || !afterSize || beforeSize === 0) return null;
  const pct = ((1 - afterSize / beforeSize) * 100).toFixed(1);
  return pct;
}

/**
 * Side-by-side before/after preview panel.
 *
 * Props:
 *  - before: { url, label, size (bytes) }
 *  - after:  { url, label, size (bytes) }
 */
export default function PreviewPanel({ before, after }) {
  if (!before && !after) return null;

  const savings = before?.size && after?.size
    ? calcSavings(before.size, after.size)
    : null;

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Before */}
        {before && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-medium text-surface-600 dark:text-surface-300">
              {before.label || 'Original'}
            </span>
            <div className="w-full rounded-xl overflow-hidden bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
              <img
                src={before.url}
                alt={before.label || 'Original preview'}
                className="w-full h-auto object-contain max-h-80"
              />
            </div>
            {before.size != null && (
              <span className="text-xs text-surface-400 dark:text-surface-500">
                {formatSize(before.size)}
              </span>
            )}
          </div>
        )}

        {/* After */}
        {after && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-medium text-surface-600 dark:text-surface-300">
              {after.label || 'Processed'}
            </span>
            <div className="w-full rounded-xl overflow-hidden bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
              <img
                src={after.url}
                alt={after.label || 'Processed preview'}
                className="w-full h-auto object-contain max-h-80"
              />
            </div>
            {after.size != null && (
              <span className="text-xs text-surface-400 dark:text-surface-500">
                {formatSize(after.size)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Size comparison */}
      {savings !== null && (
        <div className="mt-3 text-center" aria-label="File size comparison">
          <span className={`text-sm font-medium ${Number(savings) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {Number(savings) >= 0
              ? `${savings}% smaller`
              : `${Math.abs(Number(savings))}% larger`}
          </span>
          <span className="text-xs text-surface-400 dark:text-surface-500 ml-2">
            ({formatSize(before.size)} → {formatSize(after.size)})
          </span>
        </div>
      )}
    </div>
  );
}
