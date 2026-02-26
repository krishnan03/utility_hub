import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FileUpload from '../../common/FileUpload';
import ProgressBar from '../../common/ProgressBar';

const POSITIONS = [
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'center', label: 'Center' },
  { value: 'custom', label: 'Custom X/Y' },
];

export default function PDFESignature() {
  const [file, setFile] = useState(null);
  const [sigType, setSigType] = useState('draw');
  const [sigText, setSigText] = useState('');
  const [position, setPosition] = useState('bottom-right');
  const [customX, setCustomX] = useState('400');
  const [customY, setCustomY] = useState('50');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);
  const lastPos = useRef(null);

  const step = result ? 'done' : file ? 'configure' : 'upload';

  useEffect(() => {
    if (sigType === 'draw' && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.fillStyle = 'transparent';
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [sigType]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    lastPos.current = getPos(e, canvasRef.current);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e, canvasRef.current);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('signatureType', sigType);
      fd.append('position', position);
      fd.append('x', position === 'custom' ? customX : '0');
      fd.append('y', position === 'custom' ? customY : '0');

      if (sigType === 'draw' && canvasRef.current) {
        fd.append('signatureData', canvasRef.current.toDataURL('image/png'));
      } else if (sigType === 'type') {
        fd.append('signatureData', sigText);
      }

      const res = await fetch('/api/pdf/esignature', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Signing failed');
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setFile(null); setResult(null); setError(null); clearCanvas(); setSigText(''); };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FileUpload onFilesSelected={(f) => setFile(f[0])} accept=".pdf,application/pdf" multiple={false} />
          </motion.div>
        )}

        {step === 'configure' && !processing && (
          <motion.div key="configure" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-lg">✍️</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-100 truncate">{file?.name}</p>
                <p className="text-xs text-surface-500">{(file?.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button type="button" onClick={reset} className="text-xs text-surface-400 hover:text-red-500 transition-colors">Change</button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-2">Signature type</label>
              <div className="grid grid-cols-2 gap-2">
                {[['draw', '✏️ Draw'], ['type', '⌨️ Type']].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setSigType(val)} className={`py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${sigType === val ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`} style={sigType === val ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>{label}</button>
                ))}
              </div>
            </div>

            {sigType === 'draw' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-surface-300">Draw your signature</label>
                  <button type="button" onClick={clearCanvas} className="text-xs text-surface-400 hover:text-red-500 transition-colors">Clear</button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={120}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                  className="w-full rounded-xl cursor-crosshair touch-none"
                  style={{ border: '2px dashed rgba(255,255,255,0.15)', background: '#1c1c1e' }}
                  style={{ height: 120 }}
                />
              </div>
            )}

            {sigType === 'type' && (
              <div>
                <label className="block text-sm font-semibold text-surface-300 mb-1">Type your name</label>
                <input type="text" value={sigText} onChange={(e) => setSigText(e.target.value)} placeholder="Your full name" className="w-full px-4 py-3 rounded-xl text-lg font-bold italic text-blue-400 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'Georgia, serif' }} />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-2">Placement</label>
              <div className="grid grid-cols-2 gap-2">
                {POSITIONS.map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => setPosition(value)} className={`py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${position === value ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`} style={position === value ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>{label}</button>
                ))}
              </div>
              {position === 'custom' && (
                <div className="flex gap-3 mt-3">
                  <div className="flex-1">
                    <label className="block text-xs text-surface-400 mb-1">X (px from left)</label>
                    <input type="number" value={customX} onChange={(e) => setCustomX(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-surface-400 mb-1">Y (px from bottom)</label>
                    <input type="number" value={customY} onChange={(e) => setCustomY(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                </div>
              )}
            </div>

            <motion.button type="button" onClick={handleSubmit} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full min-h-[52px] rounded-2xl text-base font-bold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200">
              Sign PDF
            </motion.button>
          </motion.div>
        )}

        {processing && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8">
            <ProgressBar label="Signing PDF..." indeterminate />
          </motion.div>
        )}

        {step === 'done' && result && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="flex flex-col items-center gap-4 p-6 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(255,99,99,0.08), rgba(16,185,129,0.08))', border: '1px solid rgba(255,99,99,0.15)' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }} className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </motion.div>
              <p className="text-sm font-semibold text-surface-100">PDF signed!</p>
              <a href={result.downloadUrl} download={result.metadata?.outputName || 'signed.pdf'} className="w-full flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-2xl text-sm font-semibold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download Signed PDF
              </a>
              <p className="text-xs text-surface-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Your data is auto-deleted in 24h
              </p>
            </div>
            <div className="text-center"><button type="button" onClick={reset} className="text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors">Sign another PDF →</button></div>
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
