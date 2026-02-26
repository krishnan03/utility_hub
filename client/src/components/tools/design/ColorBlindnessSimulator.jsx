import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

const MODES = [
  { id: 'normal', label: 'Normal', filter: 'none' },
  { id: 'protanopia', label: 'Protanopia', subtitle: 'Red-blind', filter: 'url(#protanopia)' },
  { id: 'deuteranopia', label: 'Deuteranopia', subtitle: 'Green-blind', filter: 'url(#deuteranopia)' },
  { id: 'tritanopia', label: 'Tritanopia', subtitle: 'Blue-blind', filter: 'url(#tritanopia)' },
  { id: 'achromatopsia', label: 'Achromatopsia', subtitle: 'No color', filter: 'grayscale(100%)' },
];

// SVG color matrix filters for color blindness simulation
const SVG_FILTERS = `
<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
  <defs>
    <filter id="protanopia">
      <feColorMatrix type="matrix" values="0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0"/>
    </filter>
    <filter id="deuteranopia">
      <feColorMatrix type="matrix" values="0.625,0.375,0,0,0 0.7,0.3,0,0,0 0,0.3,0.7,0,0 0,0,0,1,0"/>
    </filter>
    <filter id="tritanopia">
      <feColorMatrix type="matrix" values="0.95,0.05,0,0,0 0,0.433,0.567,0,0 0,0.475,0.525,0,0 0,0,0,1,0"/>
    </filter>
  </defs>
</svg>`;

const S = {
  on: { background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.1)' },
  off: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' },
};

function CompareSlider({ imgSrc, filter }) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef(null);

  const handleMove = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    setPos(Math.max(0, Math.min(100, (x / rect.width) * 100)));
  };

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl overflow-hidden cursor-col-resize select-none"
      style={{ height: 280 }}
      onMouseMove={(e) => e.buttons === 1 && handleMove(e)}
      onTouchMove={handleMove}
    >
      <img src={imgSrc} alt="Simulated" className="absolute inset-0 w-full h-full object-contain" style={{ filter }} />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img
          src={imgSrc}
          alt="Original"
          className="w-full h-full object-contain"
          style={{ width: `${100 / (pos / 100)}%`, maxWidth: 'none' }}
        />
      </div>
      <div className="absolute top-0 bottom-0" style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}>
        <div className="w-0.5 h-full bg-white shadow-lg" />
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
          <span className="text-xs text-gray-600">↔</span>
        </div>
      </div>
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold text-white" style={{ background: 'rgba(0,0,0,0.6)' }}>Original</div>
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold text-white" style={{ background: 'rgba(0,0,0,0.6)' }}>Simulated</div>
    </div>
  );
}

export default function ColorBlindnessSimulator() {
  const [imgSrc, setImgSrc] = useState('');
  const [selected, setSelected] = useState('normal');
  const [showAll, setShowAll] = useState(false);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => setImgSrc(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) { const dt = new DataTransfer(); dt.items.add(file); fileRef.current.files = dt.files; handleFile({ target: fileRef.current }); }
  };

  const activeMode = MODES.find(m => m.id === selected);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Inject SVG filters */}
      <div dangerouslySetInnerHTML={{ __html: SVG_FILTERS }} />

      {!imgSrc ? (
        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div
            onDrop={handleDrop} onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current.click()}
            className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors group"
            style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
            <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">🖼️</div>
            <p className="text-sm text-surface-400">Drop an image or click to upload</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold text-surface-100">Simulation Mode</h3>
              <button onClick={() => setImgSrc('')} className="text-sm text-primary-400 hover:text-primary-300">Change image</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {MODES.map(m => (
                <button key={m.id} onClick={() => { setSelected(m.id); setShowAll(false); }}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors min-h-[44px]`}
                  style={selected === m.id && !showAll ? S.on : S.off}>
                  <div style={{ color: selected === m.id && !showAll ? '#fff' : 'rgba(255,255,255,0.6)' }}>{m.label}</div>
                  {m.subtitle && <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{m.subtitle}</div>}
                </button>
              ))}
            </div>

            {/* Compare / Show All toggle */}
            <div className="flex gap-2">
              <button onClick={() => setShowAll(false)} style={!showAll ? S.on : S.off} className="flex-1 min-h-[44px] rounded-xl text-sm font-semibold">
                <span style={{ color: !showAll ? '#fff' : 'rgba(255,255,255,0.5)' }}>Compare</span>
              </button>
              <button onClick={() => setShowAll(true)} style={showAll ? S.on : S.off} className="flex-1 min-h-[44px] rounded-xl text-sm font-semibold">
                <span style={{ color: showAll ? '#fff' : 'rgba(255,255,255,0.5)' }}>Show All</span>
              </button>
            </div>
          </div>

          {showAll ? (
            /* Show All grid — all modes at once */
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {MODES.map(m => (
                <div key={m.id} className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <img src={imgSrc} alt={m.label} className="w-full h-32 object-contain" style={{ filter: m.filter }} />
                  <div className="px-2 py-1.5 text-center">
                    <p className="text-xs font-semibold text-surface-200">{m.label}</p>
                    {m.subtitle && <p className="text-xs text-surface-500">{m.subtitle}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Compare mode — slider comparison */
            activeMode.filter !== 'none' ? (
              <CompareSlider imgSrc={imgSrc} filter={activeMode.filter} />
            ) : (
              /* Normal mode — just show the image */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Original</div>
                  <img src={imgSrc} alt="Original" className="w-full rounded-xl object-contain max-h-64" />
                </div>
                <div className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-xs font-semibold text-surface-400 uppercase tracking-wider">{activeMode.label}</div>
                  <img src={imgSrc} alt={activeMode.label} className="w-full rounded-xl object-contain max-h-64"
                    style={{ filter: activeMode.filter }} />
                </div>
              </div>
            )
          )}
        </>
      )}
    </motion.div>
  );
}
