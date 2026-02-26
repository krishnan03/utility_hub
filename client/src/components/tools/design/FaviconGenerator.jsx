import { useState, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import JSZip from 'jszip';

const PLATFORM_SIZES = [
  { size: 16, label: 'favicon-16x16', platform: 'Browser' },
  { size: 32, label: 'favicon-32x32', platform: 'Browser' },
  { size: 48, label: 'favicon-48x48', platform: 'Browser' },
  { size: 180, label: 'apple-touch-icon', platform: 'iOS' },
  { size: 192, label: 'android-chrome-192x192', platform: 'Android' },
  { size: 512, label: 'android-chrome-512x512', platform: 'Android/PWA' },
  { size: 150, label: 'mstile-150x150', platform: 'Windows' },
];

const PLATFORMS = ['Browser', 'iOS', 'Android', 'Android/PWA', 'Windows'];

function renderToCanvas(img, size, bgColor) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.drawImage(img, 0, 0, size, size);
  return canvas;
}

function CodeBlock({ code, label, copied, onCopy }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-surface-300">{label}</p>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onCopy}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-sm font-medium transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)' }}
          aria-label={`Copy ${label}`}
        >
          {copied ? <span className="text-green-400">✓</span> : '📋'}
        </motion.button>
      </div>
      <pre className="p-4 rounded-xl text-xs font-mono text-surface-300 overflow-x-auto whitespace-pre" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {code}
      </pre>
    </div>
  );
}

export default function FaviconGenerator() {
  const [imgSrc, setImgSrc] = useState(null);
  const [previews, setPreviews] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [themeColor, setThemeColor] = useState('#ffffff');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [transparentBg, setTransparentBg] = useState(true);
  const [copiedSnippet, setCopiedSnippet] = useState('');
  const imgRef = useRef(null);
  const fileRef = useRef();

  const generatePreviews = useCallback((img, bg) => {
    const result = {};
    PLATFORM_SIZES.forEach(({ size, label }) => {
      result[label] = renderToCanvas(img, size, bg).toDataURL('image/png');
    });
    setPreviews(result);
  }, []);

  const handleFile = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgSrc(url);
      generatePreviews(img, transparentBg ? null : bgColor);
      setUploadResult(null);
      setUploadError('');
    };
    img.src = url;
  };

  const handleInputChange = (e) => {
    handleFile(e.target.files[0]);
  };

  const handleBgToggle = (val) => {
    setTransparentBg(val);
    if (imgRef.current) {
      generatePreviews(imgRef.current, val ? null : bgColor);
    }
  };

  const handleBgColorChange = (color) => {
    setBgColor(color);
    if (imgRef.current && !transparentBg) {
      generatePreviews(imgRef.current, color);
    }
  };

  const handleDownload = (label) => {
    const a = document.createElement('a');
    a.href = previews[label];
    a.download = `${label}.png`;
    a.click();
  };

  const manifestJson = useMemo(() => JSON.stringify({
    name: 'My App',
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    theme_color: themeColor,
    background_color: themeColor,
    display: 'standalone',
  }, null, 2), [themeColor]);

  const htmlMeta = useMemo(() =>
`<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<meta name="msapplication-TileColor" content="${themeColor}">
<meta name="theme-color" content="${themeColor}">`, [themeColor]);

  const browserConfigXml = useMemo(() =>
`<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square150x150logo src="/mstile-150x150.png"/>
      <TileColor>${themeColor}</TileColor>
    </tile>
  </msapplication>
</browserconfig>`, [themeColor]);

  const handleCopySnippet = async (key, text) => {
    await navigator.clipboard.writeText(text);
    setCopiedSnippet(key);
    setTimeout(() => setCopiedSnippet(''), 2000);
  };

  const handleDownloadAll = async () => {
    const zip = new JSZip();
    // Add all PNGs
    for (const { label } of PLATFORM_SIZES) {
      if (previews[label]) {
        const base64 = previews[label].split(',')[1];
        zip.file(`${label}.png`, base64, { base64: true });
      }
    }
    // Add manifest.json
    zip.file('manifest.json', manifestJson);
    // Add browserconfig.xml
    zip.file('browserconfig.xml', browserConfigXml);

    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'favicon-package.zip';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleServerUpload = async () => {
    if (!fileRef.current?.files[0]) return;
    setUploading(true);
    setUploadError('');
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('image', fileRef.current.files[0]);
      const res = await fetch('/api/favicon/generate', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) setUploadResult(data);
      else setUploadError(data.error?.message || 'Upload failed.');
    } catch {
      setUploadError('Network error — server may be unavailable.');
    } finally {
      setUploading(false);
    }
  };

  const grouped = useMemo(() => {
    const map = {};
    PLATFORMS.forEach(p => { map[p] = []; });
    PLATFORM_SIZES.forEach(item => {
      if (map[item.platform]) map[item.platform].push(item);
    });
    return map;
  }, []);

  const hasPreviews = Object.keys(previews).length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Upload */}
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 className="text-lg font-bold text-surface-100">Favicon Generator</h2>
        <p className="text-sm text-surface-400">Upload a square image to generate favicons for every platform — Browser, iOS, Android, Windows.</p>

        <div
          className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all group border-white/20 hover:border-primary-500/40"
          onClick={() => fileRef.current.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            handleFile(e.dataTransfer.files[0]);
          }}
        >
          <motion.div
            animate={{ y: imgSrc ? 0 : [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="text-4xl mb-3"
          >
            {imgSrc ? '✅' : '🖼️'}
          </motion.div>
          <p className="text-sm text-surface-400 group-hover:text-primary-400 transition-colors">
            {imgSrc ? 'Click to replace image' : 'Drop image here or click to browse'}
          </p>
          <p className="text-xs text-surface-500 mt-1">PNG, JPG, SVG — square images work best</p>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleInputChange} />
        </div>
      </div>

      {/* Background options */}
      {imgSrc && (
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 className="text-sm font-semibold text-surface-300">Background Options</h3>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={transparentBg}
                onChange={(e) => handleBgToggle(e.target.checked)}
                className="w-5 h-5 rounded border-surface-600 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-surface-300">Transparent background</span>
            </label>
            {!transparentBg && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-surface-400">Color:</label>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => handleBgColorChange(e.target.value)}
                  className="w-8 h-8 rounded-lg border-0 cursor-pointer"
                />
                <span className="text-xs font-mono text-surface-500">{bgColor}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Platform-grouped previews */}
      {hasPreviews && (
        <div className="space-y-6">
          {PLATFORMS.map(platform => {
            const items = grouped[platform];
            if (!items || items.length === 0) return null;
            return (
              <div key={platform} className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="text-sm font-semibold text-surface-300">{platform}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {items.map(({ size, label }) => (
                    <motion.div
                      key={label}
                      whileHover={{ scale: 1.04 }}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      <div
                        className="flex items-center justify-center rounded"
                        style={{ width: Math.min(Math.max(size, 32), 96), height: Math.min(Math.max(size, 32), 96), background: 'rgba(255,255,255,0.06)' }}
                      >
                        <img
                          src={previews[label]}
                          alt={label}
                          style={{
                            width: Math.min(size, 96),
                            height: Math.min(size, 96),
                            imageRendering: size <= 32 ? 'pixelated' : 'auto',
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono text-surface-400">{size}×{size}</span>
                      <span className="text-xs text-surface-500 text-center">{label}.png</span>
                      <button
                        onClick={() => handleDownload(label)}
                        className="min-h-[44px] text-xs px-3 py-2 rounded-lg font-medium transition-all w-full text-center text-white"
                        style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
                      >
                        Download PNG
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Download All + Code Snippets */}
      {hasPreviews && (
        <div className="rounded-2xl p-6 space-y-6" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Download All */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleDownloadAll}
              className="min-h-[44px] px-6 py-3 rounded-xl font-semibold text-white transition-all flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
            >
              📦 Download All (ZIP)
            </motion.button>
            <p className="text-xs text-surface-500">Includes all PNGs + manifest.json + browserconfig.xml</p>
          </div>

          {/* Theme color picker */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-surface-400">Theme Color:</label>
              <input
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="w-8 h-8 rounded-lg border-0 cursor-pointer"
              />
              <span className="text-xs font-mono text-surface-500">{themeColor}</span>
            </div>
          </div>

          {/* HTML Meta Tags */}
          <CodeBlock
            label="HTML Meta Tags"
            code={htmlMeta}
            copied={copiedSnippet === 'html'}
            onCopy={() => handleCopySnippet('html', htmlMeta)}
          />

          {/* manifest.json */}
          <CodeBlock
            label="manifest.json"
            code={manifestJson}
            copied={copiedSnippet === 'manifest'}
            onCopy={() => handleCopySnippet('manifest', manifestJson)}
          />

          {/* browserconfig.xml */}
          <CodeBlock
            label="browserconfig.xml"
            code={browserConfigXml}
            copied={copiedSnippet === 'browserconfig'}
            onCopy={() => handleCopySnippet('browserconfig', browserConfigXml)}
          />
        </div>
      )}

      {/* Server upload for .ico */}
      {imgSrc && (
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <p className="text-sm font-medium text-surface-300">Want a .ico file too?</p>
              <p className="text-sm text-surface-400 mt-1">
                For a complete favicon set with .ico format, use the server-side generator. This bundles multiple sizes into a single <code className="font-mono text-xs px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)' }}>favicon.ico</code> file.
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleServerUpload}
            disabled={uploading}
            className="min-h-[44px] px-4 py-2 rounded-xl font-medium text-white transition-all disabled:opacity-50 flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
          >
            {uploading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </>
            ) : '⚡ Generate .ico (Server)'}
          </motion.button>

          {uploadError && (
            <p className="text-sm text-red-500">{uploadError}</p>
          )}

          {uploadResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-green-900/20 border border-green-700 rounded-xl"
            >
              <p className="text-sm font-medium text-green-400">✅ Favicon package ready!</p>
              {uploadResult.downloadUrl && (
                <a href={uploadResult.downloadUrl} download className="mt-2 inline-block text-sm text-primary-400 hover:underline">
                  Download favicon.ico
                </a>
              )}
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}
