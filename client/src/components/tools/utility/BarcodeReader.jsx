import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

export default function BarcodeReader() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [manualResult, setManualResult] = useState('');
  const fileRef = useRef();

  const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!supported) { setError('BarcodeDetector API is not supported in this browser. Try Chrome 83+ or Edge 83+.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const bitmap = await createImageBitmap(file);
      const detector = new window.BarcodeDetector();
      const codes = await detector.detect(bitmap);
      if (codes.length === 0) { setError('No barcode detected in this image.'); }
      else { setResult(codes[0]); }
    } catch (err) {
      setError('Failed to read barcode: ' + err.message);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) { const dt = new DataTransfer(); dt.items.add(file); fileRef.current.files = dt.files; handleFile({ target: fileRef.current }); }
  };

  const decodeManual = () => {
    if (!manualInput.trim()) return;
    setManualResult(`Value: ${manualInput.trim()} (manual entry — no decoding applied)`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {!supported && (
        <div className="border rounded-2xl p-4 text-sm text-orange-300">
          ⚠️ BarcodeDetector API is not supported in this browser. Use Chrome 83+ or Edge 83+ for image scanning. You can still use the manual input below.
        </div>
      )}

      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="font-semibold text-surface-100">Scan from Image</h3>
        <div
          onDrop={handleDrop} onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current.click()}
          className="border-2 border-dashed border-white/20 hover:border-primary-500/40 rounded-2xl p-10 text-center cursor-pointer transition-colors group">
          <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📷</div>
          <p className="text-sm text-surface-400">Drop an image here or click to upload</p>
          <p className="text-xs text-surface-500 mt-1">Supports QR codes, barcodes (EAN, UPC, Code 128, etc.)</p>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>

        {loading && <p className="text-sm text-primary-400 text-center">Scanning...</p>}
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {result && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold">✓ Barcode Detected</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-surface-400">Format</div>
              <div className="font-mono text-surface-100">{result.format}</div>
              <div className="text-surface-400">Value</div>
              <div className="font-mono text-surface-100 break-all">{result.rawValue}</div>
            </div>
            <button onClick={() => navigator.clipboard.writeText(result.rawValue)} className="text-xs text-primary-400 hover:text-blue-600">Copy value</button>
          </div>
        )}
      </div>

      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="font-semibold text-surface-100">Manual Barcode Input</h3>
        <p className="text-sm text-surface-400">Enter a barcode value to look up or record it.</p>
        <div className="flex gap-2">
          <input value={manualInput} onChange={e => setManualInput(e.target.value)} placeholder="Enter barcode value..."
            className="flex-1 px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono" />
          <button onClick={decodeManual} className="px-4 py-2 bg-blue-500 hover:text-white rounded-xl font-medium transition-colors">Submit</button>
        </div>
        {manualResult && (
          <div className="rounded-xl px-4 py-3 text-sm text-surface-300 font-mono">{manualResult}</div>
        )}
      </div>
    </motion.div>
  );
}
