import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function DownloadButton({ downloadUrl, filename, expiresAt }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(expiresAt).getTime() - Date.now()));

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const expired = remaining <= 0;

  const handleClick = useCallback(() => {
    if (expired || !downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename || '';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [expired, downloadUrl, filename]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col items-center gap-4 p-6 rounded-2xl"
      style={{
        background: 'var(--tp-card)',
        border: '1px solid var(--tp-border)',
      }}
    >
      {/* Success icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
        className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(48,209,88,0.15)' }}
      >
        <svg className="w-6 h-6 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>

      <div className="text-center">
        <p className="text-sm font-semibold text-surface-100">Ready to download</p>
        <p className="text-xs text-surface-500 mt-1 truncate max-w-[250px]">{filename}</p>
      </div>

      <motion.button
        type="button"
        onClick={handleClick}
        disabled={expired}
        aria-label={`Download ${filename || 'file'}`}
        whileHover={{ scale: expired ? 1 : 1.02 }}
        whileTap={{ scale: expired ? 1 : 0.98 }}
        className={`btn-primary w-full min-h-[44px] ${
          expired ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download
      </motion.button>

      <div className="text-xs text-surface-500 flex items-center gap-1.5">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {expired ? 'Link expired' : `Auto-deletes in ${formatCountdown(remaining)}`}
      </div>
    </motion.div>
  );
}
