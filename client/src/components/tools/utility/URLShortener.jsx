import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'utilhub_short_urls';
const BASE_URL = 'https://utilhub.io/s/';
const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateCode() {
  return Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function isValidURL(str) {
  try { new URL(str); return true; } catch { return false; }
}

const cardStyle = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };
const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' };
const btnGradient = { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' };

function QRCodeDisplay({ url, size = 200 }) {
  const containerRef = useRef(null);
  const qrRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const QRCodeStyling = (await import('qr-code-styling')).default;
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = '';
        const qr = new QRCodeStyling({
          width: size,
          height: size,
          data: url,
          dotsOptions: { color: '#FF6363', type: 'rounded' },
          backgroundOptions: { color: '#1c1c1e' },
          cornersSquareOptions: { color: '#FF9F43', type: 'extra-rounded' },
          cornersDotOptions: { color: '#FF6363' },
          imageOptions: { crossOrigin: 'anonymous', margin: 4 },
        });
        qr.append(containerRef.current);
        qrRef.current = qr;
      } catch { /* qr-code-styling not available */ }
    })();
    return () => { cancelled = true; };
  }, [url, size]);

  const downloadQR = useCallback(() => {
    if (qrRef.current) qrRef.current.download({ name: 'qr-code', extension: 'png' });
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={containerRef} className="rounded-xl overflow-hidden" />
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={downloadQR}
        className="px-4 py-2 rounded-xl text-sm font-semibold text-white min-h-[44px] transition-all"
        style={btnGradient}
      >
        ⬇ Download QR
      </motion.button>
    </div>
  );
}

function QRThumbnail({ url }) {
  const ref = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const QRCodeStyling = (await import('qr-code-styling')).default;
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = '';
        new QRCodeStyling({
          width: 40, height: 40, data: url,
          dotsOptions: { color: '#FF6363', type: 'rounded' },
          backgroundOptions: { color: '#1c1c1e' },
          cornersSquareOptions: { color: '#FF9F43' },
        }).append(ref.current);
      } catch { /* fallback: no thumbnail */ }
    })();
    return () => { cancelled = true; };
  }, [url]);

  return <div ref={ref} className="rounded-md overflow-hidden shrink-0 w-10 h-10" />;
}

export default function URLShortener() {
  const [url, setUrl] = useState('');
  const [history, setHistory] = useState([]);
  const [latest, setLatest] = useState(null);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => { setHistory(loadHistory()); }, []);

  const handleShorten = () => {
    const trimmed = url.trim();
    if (!trimmed) { setError('Please enter a URL.'); return; }
    if (!isValidURL(trimmed)) { setError('Please enter a valid URL (include https://).'); return; }
    setError('');
    const existing = history.find(h => h.longUrl === trimmed);
    if (existing) { setLatest(existing); return; }
    const code = generateCode();
    const entry = { code, longUrl: trimmed, shortUrl: `${BASE_URL}${code}`, createdAt: Date.now() };
    const updated = [entry, ...history].slice(0, 20);
    setHistory(updated);
    saveHistory(updated);
    setLatest(entry);
    setUrl('');
  };

  const handleCopy = (shortUrl, code) => {
    navigator.clipboard.writeText(shortUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const handleDelete = (code) => {
    const updated = history.filter(h => h.code !== code);
    setHistory(updated);
    saveHistory(updated);
    if (latest?.code === code) setLatest(null);
  };

  const handleClearAll = () => { setHistory([]); saveHistory([]); setLatest(null); };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <h2 className="text-lg font-bold text-surface-100">URL Shortener + QR Code</h2>
        <div className="p-3 border border-amber-200 dark:border-amber-700 rounded-xl text-sm text-amber-700 dark:text-amber-400">
          ⚠️ This is a local simulation — shortened URLs are stored in your browser only and won't work on other devices.
        </div>
        <div className="flex gap-3">
          <input type="url" value={url} onChange={e => { setUrl(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleShorten()}
            placeholder="https://example.com/very/long/url/that/needs/shortening"
            className="flex-1 px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            style={inputStyle} />
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleShorten}
            className="px-5 py-2 rounded-xl font-medium text-white transition-colors whitespace-nowrap min-h-[44px]"
            style={btnGradient}>
            Shorten
          </motion.button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      <AnimatePresence>
        {latest && (
          <motion.div key={latest.code} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(255,99,99,0.04)', border: '1px solid rgba(255,99,99,0.15)' }}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎉</span>
              <p className="text-sm font-semibold text-surface-300">Your short URL is ready!</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 items-center">
              <div className="flex-1 space-y-3 min-w-0 w-full">
                <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <span className="flex-1 font-mono text-primary-400 text-sm font-medium truncate">{latest.shortUrl}</span>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleCopy(latest.shortUrl, latest.code)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-white whitespace-nowrap min-h-[36px]"
                    style={btnGradient}>
                    {copiedCode === latest.code ? '✓ Copied!' : 'Copy'}
                  </motion.button>
                </div>
                <p className="text-xs text-surface-500 truncate">→ {latest.longUrl}</p>
              </div>
              <QRCodeDisplay url={latest.shortUrl} size={160} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {history.length > 0 && (
        <div className="rounded-2xl p-6 space-y-3" style={cardStyle}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-surface-300">History ({history.length})</p>
            <button onClick={handleClearAll} className="text-xs text-red-400 hover:text-red-500 transition-colors">Clear all</button>
          </div>
          <div className="space-y-2">
            {history.map(entry => (
              <motion.div key={entry.code} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                className="flex items-center gap-3 p-3 rounded-xl group">
                <QRThumbnail url={entry.shortUrl} />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-primary-400 font-medium">{entry.shortUrl}</p>
                  <p className="text-xs text-surface-500 truncate mt-0.5">{entry.longUrl}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => handleCopy(entry.shortUrl, entry.code)}
                    className="px-2.5 py-1.5 text-xs rounded-lg transition-colors text-surface-400 hover:text-white min-h-[36px]"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                    {copiedCode === entry.code ? '✓' : 'Copy'}
                  </button>
                  <button onClick={() => handleDelete(entry.code)}
                    className="px-2.5 py-1.5 text-xs rounded-lg transition-colors text-surface-400 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 min-h-[36px]"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                    ✕
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
