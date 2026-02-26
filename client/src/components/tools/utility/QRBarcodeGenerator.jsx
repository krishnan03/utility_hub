import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProgressBar from '../../common/ProgressBar';

const BARCODE_FORMATS = ['CODE128', 'EAN-13', 'UPC-A', 'CODE39', 'ITF'];

const DOT_STYLES = ['square', 'rounded', 'dots', 'classy', 'classy-rounded', 'extra-rounded'];
const CORNER_SQUARE_STYLES = ['square', 'dot', 'extra-rounded'];
const CORNER_DOT_STYLES = ['square', 'dot'];
const ERROR_LEVELS = ['L', 'M', 'Q', 'H'];

function StyleGrid({ label, options, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-surface-400 mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 min-h-[36px] ${
              value === opt ? 'text-white' : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'
            }`}
            style={value === opt ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function QRBarcodeGenerator() {
  const [tab, setTab] = useState('qr');

  // QR state
  const [qrText, setQrText] = useState('');
  const [qrSize, setQrSize] = useState('400');
  const [qrFg, setQrFg] = useState('#000000');
  const [qrBg, setQrBg] = useState('#ffffff');
  const [dotStyle, setDotStyle] = useState('square');
  const [cornerSquareStyle, setCornerSquareStyle] = useState('square');
  const [cornerDotStyle, setCornerDotStyle] = useState('square');
  const [errorLevel, setErrorLevel] = useState('M');
  const [useGradient, setUseGradient] = useState(false);
  const [gradientStart, setGradientStart] = useState('#FF6363');
  const [gradientEnd, setGradientEnd] = useState('#FF9F43');
  const [logoFile, setLogoFile] = useState(null);
  const [logoDataUrl, setLogoDataUrl] = useState(null);

  // Barcode state
  const [bcText, setBcText] = useState('');
  const [bcFormat, setBcFormat] = useState('CODE128');
  const [bcWidth, setBcWidth] = useState(2);
  const [bcHeight, setBcHeight] = useState(80);

  const [processing, setProcessing] = useState(false);
  const [bcResult, setBcResult] = useState(null);
  const [error, setError] = useState(null);

  const qrRef = useRef(null);
  const qrInstanceRef = useRef(null);
  const debounceRef = useRef(null);
  const logoInputRef = useRef(null);

  // Handle logo file upload
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoDataUrl(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoDataUrl(null);
  };

  // Build QR options object
  const buildQrOptions = useCallback(() => {
    const size = parseInt(qrSize, 10);
    const opts = {
      width: size,
      height: size,
      data: qrText || ' ',
      dotsOptions: {
        type: dotStyle,
        ...(useGradient
          ? { gradient: { type: 'linear', rotation: 135 / 180 * Math.PI, colorStops: [{ offset: 0, color: gradientStart }, { offset: 1, color: gradientEnd }] } }
          : { color: qrFg }),
      },
      cornersSquareOptions: { type: cornerSquareStyle, color: qrFg },
      cornersDotOptions: { type: cornerDotStyle, color: qrFg },
      backgroundOptions: { color: qrBg },
      qrOptions: { errorCorrectionLevel: errorLevel },
      imageOptions: { crossOrigin: 'anonymous', margin: 8, imageSize: 0.35 },
    };
    if (logoDataUrl) {
      opts.image = logoDataUrl;
    }
    return opts;
  }, [qrText, qrSize, qrFg, qrBg, dotStyle, cornerSquareStyle, cornerDotStyle, errorLevel, useGradient, gradientStart, gradientEnd, logoDataUrl]);

  // Render QR code with debounce
  useEffect(() => {
    if (tab !== 'qr' || !qrText.trim()) {
      // Clear preview when no text
      if (qrRef.current) qrRef.current.innerHTML = '';
      qrInstanceRef.current = null;
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const QRCodeStyling = (await import('qr-code-styling')).default;
        const opts = buildQrOptions();

        if (qrInstanceRef.current) {
          qrInstanceRef.current.update(opts);
        } else {
          qrInstanceRef.current = new QRCodeStyling(opts);
          if (qrRef.current) {
            qrRef.current.innerHTML = '';
            qrInstanceRef.current.append(qrRef.current);
          }
        }
      } catch (err) {
        console.error('QR render error:', err);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [tab, qrText, buildQrOptions]);

  const handleDownloadQR = async (format) => {
    if (!qrInstanceRef.current) return;
    try {
      await qrInstanceRef.current.download({ name: 'qrcode', extension: format });
    } catch (err) {
      setError('Download failed: ' + err.message);
    }
  };

  // Barcode generation (still server-side)
  const handleGenerateBarcode = async () => {
    if (!bcText.trim()) return;
    setProcessing(true);
    setError(null);
    setBcResult(null);
    try {
      const res = await fetch('/api/qr/barcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: bcText, format: bcFormat, width: bcWidth, height: bcHeight }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Generation failed');
      setBcResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadBarcode = (format) => {
    if (!bcResult?.downloadUrl) return;
    const a = document.createElement('a');
    a.href = bcResult.downloadUrl;
    a.download = `barcode.${format}`;
    a.click();
  };

  const reset = () => { setBcResult(null); setError(null); };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {[['qr', '⬛ QR Code'], ['barcode', '▌▌▌ Barcode']].map(([val, label]) => (
          <button key={val} type="button" onClick={() => { setTab(val); reset(); }} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${tab === val ? 'text-white' : 'text-surface-400 hover:text-surface-200'}`} style={tab === val ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : undefined}>{label}</button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'qr' && (
          <motion.div key="qr" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-5">
            {/* Text input */}
            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-1">Text or URL</label>
              <input type="text" value={qrText} onChange={(e) => setQrText(e.target.value)} placeholder="https://example.com" className="w-full px-4 py-3 rounded-xl text-sm text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>

            {/* Preview + Customization side by side */}
            <div className="flex flex-col lg:flex-row gap-5">
              {/* Live Preview */}
              <div className="flex-1 flex flex-col items-center justify-center p-6 rounded-2xl min-h-[280px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {qrText.trim() ? (
                  <div ref={qrRef} className="flex items-center justify-center [&>canvas]:rounded-xl [&>svg]:rounded-xl" />
                ) : (
                  <div className="text-center text-surface-500">
                    <div className="text-4xl mb-2">⬛</div>
                    <p className="text-sm">Enter text to see live preview</p>
                  </div>
                )}
              </div>

              {/* Customization Panel */}
              <div className="flex-1 space-y-4 p-5 rounded-2xl overflow-y-auto max-h-[520px]" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="text-sm font-bold text-surface-200">Customize</h3>

                <StyleGrid label="Dot Style" options={DOT_STYLES} value={dotStyle} onChange={setDotStyle} />
                <StyleGrid label="Corner Square" options={CORNER_SQUARE_STYLES} value={cornerSquareStyle} onChange={setCornerSquareStyle} />
                <StyleGrid label="Corner Dot" options={CORNER_DOT_STYLES} value={cornerDotStyle} onChange={setCornerDotStyle} />

                {/* Colors */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1">Foreground</label>
                    <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <input type="color" value={qrFg} onChange={(e) => setQrFg(e.target.value)} className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent" />
                      <span className="text-xs font-mono text-surface-300">{qrFg}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1">Background</label>
                    <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <input type="color" value={qrBg} onChange={(e) => setQrBg(e.target.value)} className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent" />
                      <span className="text-xs font-mono text-surface-300">{qrBg}</span>
                    </div>
                  </div>
                </div>

                {/* Gradient toggle */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-surface-400">Use Gradient</label>
                    <button
                      type="button"
                      onClick={() => setUseGradient(!useGradient)}
                      className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${useGradient ? 'bg-primary-500' : 'bg-white/10'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${useGradient ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                  <AnimatePresence>
                    {useGradient && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-2 gap-3 overflow-hidden">
                        <div>
                          <label className="block text-xs text-surface-500 mb-1">Start</label>
                          <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <input type="color" value={gradientStart} onChange={(e) => setGradientStart(e.target.value)} className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent" />
                            <span className="text-xs font-mono text-surface-300">{gradientStart}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-surface-500 mb-1">End</label>
                          <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <input type="color" value={gradientEnd} onChange={(e) => setGradientEnd(e.target.value)} className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent" />
                            <span className="text-xs font-mono text-surface-300">{gradientEnd}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Logo upload */}
                <div>
                  <label className="block text-xs font-semibold text-surface-400 mb-1.5">Center Logo</label>
                  {logoFile ? (
                    <div className="flex items-center gap-3 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <img src={logoDataUrl} alt="Logo" className="w-8 h-8 rounded object-contain" />
                      <span className="text-xs text-surface-300 truncate flex-1">{logoFile.name}</span>
                      <button type="button" onClick={removeLogo} className="text-xs text-red-400 hover:text-red-300 min-h-[36px] min-w-[36px] flex items-center justify-center">✕</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => logoInputRef.current?.click()} className="w-full py-2.5 rounded-xl text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 transition-all min-h-[44px]" style={{ background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.15)' }}>
                      + Upload logo image
                    </button>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </div>

                {/* Error correction */}
                <StyleGrid label="Error Correction" options={ERROR_LEVELS} value={errorLevel} onChange={setErrorLevel} />

                {/* Size */}
                <div>
                  <label className="block text-xs font-semibold text-surface-400 mb-1.5">Size</label>
                  <div className="flex gap-1.5">
                    {['200', '400', '600'].map((s) => (
                      <button key={s} type="button" onClick={() => setQrSize(s)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 min-h-[36px] ${qrSize === s ? 'text-white' : 'text-surface-400 hover:bg-white/5'}`} style={qrSize === s ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>{s}px</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Download buttons */}
            {qrText.trim() && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <motion.button type="button" onClick={() => handleDownloadQR('png')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 flex items-center justify-center gap-2 min-h-[52px] px-4 py-3 rounded-2xl text-sm font-bold text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download PNG
                </motion.button>
                <motion.button type="button" onClick={() => handleDownloadQR('svg')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 flex items-center justify-center gap-2 min-h-[52px] px-4 py-3 rounded-2xl text-sm font-bold text-surface-300 hover:bg-white/5 transition-all duration-200" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download SVG
                </motion.button>
              </motion.div>
            )}

            <p className="text-xs text-surface-500 text-center flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              QR codes are generated entirely in your browser — no data sent to any server
            </p>
          </motion.div>
        )}

        {tab === 'barcode' && (
          <motion.div key="barcode" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-1">Text to encode</label>
              <input type="text" value={bcText} onChange={(e) => setBcText(e.target.value)} placeholder="Enter barcode content" className="w-full px-4 py-3 rounded-xl text-sm text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-2">Format</label>
              <div className="grid grid-cols-3 gap-2">
                {BARCODE_FORMATS.map((fmt) => (
                  <button key={fmt} type="button" onClick={() => setBcFormat(fmt)} className={`py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${bcFormat === fmt ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`} style={bcFormat === fmt ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>{fmt}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold text-surface-300">Bar width</label>
                  <span className="text-xs font-mono text-primary-500">{bcWidth}px</span>
                </div>
                <input type="range" min="1" max="5" step="0.5" value={bcWidth} onChange={(e) => setBcWidth(parseFloat(e.target.value))} className="w-full accent-primary-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold text-surface-300">Height</label>
                  <span className="text-xs font-mono text-primary-500">{bcHeight}px</span>
                </div>
                <input type="range" min="40" max="200" step="10" value={bcHeight} onChange={(e) => setBcHeight(parseInt(e.target.value, 10))} className="w-full accent-primary-500" />
              </div>
            </div>

            <motion.button
              type="button"
              onClick={handleGenerateBarcode}
              disabled={processing || !bcText.trim()}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full min-h-[52px] rounded-2xl text-base font-bold text-white shadow-lg shadow-primary-500/20 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
            >
              Generate Barcode
            </motion.button>

            {processing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4">
                <ProgressBar label="Generating..." indeterminate />
              </motion.div>
            )}

            {bcResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 p-6 rounded-3xl"
                style={{ background: 'linear-gradient(135deg, rgba(255,99,99,0.08), rgba(16,185,129,0.08))', border: '1px solid rgba(255,99,99,0.15)' }}
              >
                {(bcResult.imageData || bcResult.downloadUrl) && (
                  <img
                    src={bcResult.imageData || bcResult.downloadUrl}
                    alt="Barcode"
                    className="max-w-full rounded-xl bg-white p-3"
                    style={{ maxHeight: 300, border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                )}
                <div className="flex gap-2 w-full">
                  <motion.button type="button" onClick={() => handleDownloadBarcode('png')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    PNG
                  </motion.button>
                  <motion.button type="button" onClick={() => handleDownloadBarcode('svg')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold text-surface-300 hover:bg-white/5 transition-all duration-200" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    SVG
                  </motion.button>
                </div>
                <p className="text-xs text-surface-400 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Your data is auto-deleted in 24h
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-500 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </motion.div>
      )}
    </motion.div>
  );
}
