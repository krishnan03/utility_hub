import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

const DEFAULT_FILTERS = { brightness: 100, contrast: 100, saturation: 100, blur: 0, grayscale: false, sepia: false, invert: false };
const DEFAULT_CROP = { x: 0, y: 0, w: 0, h: 0 };
const DEFAULT_TEXT = { text: '', x: 50, y: 50, size: 32, color: '#ffffff' };

export default function PhotoEditor() {
  const [imgSrc, setImgSrc] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [crop, setCrop] = useState(DEFAULT_CROP);
  const [textOverlay, setTextOverlay] = useState(DEFAULT_TEXT);
  const [format, setFormat] = useState('png');
  const canvasRef = useRef();
  const originalRef = useRef(null);
  const fileRef = useRef();

  const buildFilter = (f) => {
    let s = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) blur(${f.blur}px)`;
    if (f.grayscale) s += ' grayscale(100%)';
    if (f.sepia) s += ' sepia(100%)';
    if (f.invert) s += ' invert(100%)';
    return s;
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = originalRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');

    const rad = (rotation * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const w = img.naturalWidth * cos + img.naturalHeight * sin;
    const h = img.naturalWidth * sin + img.naturalHeight * cos;
    canvas.width = w;
    canvas.height = h;

    ctx.save();
    ctx.filter = buildFilter(filters);
    ctx.translate(w / 2, h / 2);
    ctx.rotate(rad);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    // Crop
    const cx = parseInt(crop.x) || 0;
    const cy = parseInt(crop.y) || 0;
    const cw = parseInt(crop.w) || 0;
    const ch = parseInt(crop.h) || 0;
    if (cw > 0 && ch > 0) {
      const imageData = ctx.getImageData(cx, cy, cw, ch);
      canvas.width = cw;
      canvas.height = ch;
      ctx.putImageData(imageData, 0, 0);
    }

    // Text overlay
    if (textOverlay.text) {
      ctx.save();
      ctx.font = `bold ${textOverlay.size}px Inter, sans-serif`;
      ctx.fillStyle = textOverlay.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeText(textOverlay.text, parseInt(textOverlay.x), parseInt(textOverlay.y));
      ctx.fillText(textOverlay.text, parseInt(textOverlay.x), parseInt(textOverlay.y));
      ctx.restore();
    }
  }, [filters, rotation, flipH, flipV, crop, textOverlay]);

  useEffect(() => { if (imgSrc) draw(); }, [imgSrc, draw]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { originalRef.current = img; setImgSrc(url); };
    img.src = url;
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setCrop(DEFAULT_CROP);
    setTextOverlay(DEFAULT_TEXT);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const url = canvas.toDataURL(mime, 0.92);
    const a = document.createElement('a'); a.href = url; a.download = `edited.${format}`; a.click();
  };

  const Slider = ({ label, field, min, max, unit = '' }) => (
    <div>
      <div className="flex justify-between text-xs text-surface-400 mb-1">
        <span>{label}</span><span>{filters[field]}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={filters[field]}
        onChange={e => setFilters(f => ({ ...f, [field]: Number(e.target.value) }))}
        className="w-full accent-blue-500" />
    </div>
  );

  const Toggle = ({ label, field }) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={filters[field]} onChange={e => setFilters(f => ({ ...f, [field]: e.target.checked }))} className="accent-blue-500 w-4 h-4" />
      <span className="text-sm text-surface-300">{label}</span>
    </label>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {!imgSrc ? (
        <div
          className="border-2 border-dashed border-white/20 rounded-2xl p-12 text-center cursor-pointer hover:border-primary-500/40 transition-colors"
          style={{ background: 'rgba(44,44,46,0.8)' }}
          onClick={() => fileRef.current.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { fileRef.current.files = e.dataTransfer.files; handleFile({ target: { files: e.dataTransfer.files } }); } }}
        >
          <div className="text-5xl mb-3">🖼️</div>
          <p className="text-surface-400">Drop an image here or click to upload</p>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-sm font-semibold text-surface-300">Adjustments</p>
              <Slider label="Brightness" field="brightness" min={0} max={200} unit="%" />
              <Slider label="Contrast" field="contrast" min={0} max={200} unit="%" />
              <Slider label="Saturation" field="saturation" min={0} max={200} unit="%" />
              <Slider label="Blur" field="blur" min={0} max={10} unit="px" />
              <div className="flex flex-wrap gap-3 pt-1">
                <Toggle label="Grayscale" field="grayscale" />
                <Toggle label="Sepia" field="sepia" />
                <Toggle label="Invert" field="invert" />
              </div>
            </div>

            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-sm font-semibold text-surface-300">Rotate & Flip</p>
              <div className="flex flex-wrap gap-2">
                {[90, 180, 270].map(deg => (
                  <button key={deg} onClick={() => setRotation(deg)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${rotation === deg ? 'text-white' : ' text-surface-300 hover:bg-white/5'}`}>
                    {deg}°
                  </button>
                ))}
                <button onClick={() => setFlipH(v => !v)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${flipH ? 'text-white' : ' text-surface-300 hover:bg-white/5'}`}>↔ Flip H</button>
                <button onClick={() => setFlipV(v => !v)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${flipV ? 'text-white' : ' text-surface-300 hover:bg-white/5'}`}>↕ Flip V</button>
              </div>
            </div>

            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-sm font-semibold text-surface-300">Crop (px)</p>
              <div className="grid grid-cols-2 gap-2">
                {['x', 'y', 'w', 'h'].map(k => (
                  <div key={k}>
                    <label className="text-xs text-surface-400 uppercase">{k === 'w' ? 'Width' : k === 'h' ? 'Height' : k.toUpperCase()}</label>
                    <input type="number" value={crop[k]} onChange={e => setCrop(c => ({ ...c, [k]: e.target.value }))}
                      className="w-full px-2 py-1.5 rounded-lg text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-sm font-semibold text-surface-300">Text Overlay</p>
              <input type="text" placeholder="Text..." value={textOverlay.text} onChange={e => setTextOverlay(t => ({ ...t, text: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 text-sm" />
              <div className="grid grid-cols-3 gap-2">
                {[['x', 'X'], ['y', 'Y'], ['size', 'Size']].map(([k, l]) => (
                  <div key={k}>
                    <label className="text-xs text-surface-400">{l}</label>
                    <input type="number" value={textOverlay[k]} onChange={e => setTextOverlay(t => ({ ...t, [k]: e.target.value }))}
                      className="w-full px-2 py-1.5 rounded-lg text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs text-surface-400">Color</label>
                <input type="color" value={textOverlay.color} onChange={e => setTextOverlay(t => ({ ...t, color: e.target.value }))} className="w-full h-8 rounded-lg cursor-pointer" />
              </div>
            </div>

            <div className="flex gap-2">
              <select value={format} onChange={e => setFormat(e.target.value)} className="px-3 py-2 rounded-xl text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>>
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
              </select>
              <button onClick={handleDownload} className="flex-1 px-4 py-2 bg-blue-500 hover:text-white rounded-xl font-medium transition-colors text-sm">
                Download
              </button>
              <button onClick={handleReset} className="px-4 py-2 hover:bg-white/5 text-surface-300 rounded-xl font-medium transition-colors text-sm">
                Reset
              </button>
            </div>
          </div>

          {/* Canvas preview */}
          <div className="lg:col-span-2 rounded-2xl p-4 flex items-center justify-center min-h-64">
            <canvas ref={canvasRef} className="max-w-full max-h-[500px] rounded-xl object-contain" />
          </div>
        </div>
      )}
    </motion.div>
  );
}
