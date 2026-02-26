import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  hexToRgb, rgbToHsl,
  hexToHsv, hexToCmyk,
  getContrastRatio, meetsWCAG,
  generatePalette, generateRandomPalette, randomColor,
  exportPaletteCSS, exportPaletteTailwind, exportPaletteSCSS, exportPaletteJSON,
  simulateColorBlindness, BLINDNESS_TYPES, BLINDNESS_LABELS,
  extractColorsFromImage,
  buildGradientCSS, GRADIENT_PRESETS,
} from '../../../utils/colorUtils';

// ─── Shared tiny components ─────────────────────────────────────────────────

function CopyBtn({ text, small }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <motion.button type="button" onClick={copy} whileTap={{ scale: 0.9 }}
      className={`shrink-0 flex items-center justify-center rounded-xl bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 transition-colors ${small ? 'min-w-[36px] min-h-[36px]' : 'min-w-[44px] min-h-[44px]'}`}
      aria-label="Copy value">
      {copied ? '✓' : '📋'}
    </motion.button>
  );
}

function ColorSwatch({ hex, compact, label }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <motion.button type="button" onClick={copy} whileTap={{ scale: 0.95 }}
      className={`group relative rounded-2xl overflow-hidden transition-all hover:shadow-lg ${compact ? 'h-16' : 'h-24'}`}
      style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      aria-label={`Copy ${hex}`}>
      <div className="absolute inset-0" style={{ backgroundColor: hex }} />
      <div className="absolute inset-x-0 bottom-0 px-2 py-1.5 bg-black/40 backdrop-blur-sm">
        <span className="text-xs font-mono font-bold text-white">
          {copied ? '✓ Copied' : label || hex.toUpperCase()}
        </span>
      </div>
    </motion.button>
  );
}

function WcagBadge({ passes, label }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${passes ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
      {passes ? '✓' : '✗'} {label}
    </span>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`p-4 rounded-2xl ${className}`}
      style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {children}
    </div>
  );
}

function ColorInput({ value, onChange, label }) {
  return (
    <div>
      {label && <label className="block text-sm font-semibold text-surface-300 mb-1.5">{label}</label>}
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-xl cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-lg"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-h-[44px] px-3 py-2 rounded-xl text-sm font-mono text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
      </div>
    </div>
  );
}

const PALETTE_TYPES = [
  'complementary', 'analogous', 'triadic', 'monochromatic',
  'split-complementary', 'tetradic', 'random',
];

const EXPORT_FORMATS = [
  { id: 'css', label: 'CSS Variables' },
  { id: 'tailwind', label: 'Tailwind' },
  { id: 'scss', label: 'SCSS' },
  { id: 'json', label: 'JSON' },
];

const TABS = [
  { id: 'convert', label: 'Convert', icon: '🎨' },
  { id: 'contrast', label: 'Contrast', icon: '◐' },
  { id: 'palette', label: 'Palette', icon: '🎭' },
  { id: 'gradient', label: 'Gradient', icon: '🌈' },
  { id: 'blindness', label: 'Blindness', icon: '👁' },
  { id: 'extract', label: 'Extract', icon: '🖼' },
];

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ColorTools() {
  const [tab, setTab] = useState('convert');
  const [color, setColor] = useState('#6366f1');

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Tab bar — scrollable on mobile */}
      <div className="flex gap-1 p-1 rounded-2xl overflow-x-auto scrollbar-hide" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`flex-shrink-0 min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${tab === t.id ? 'text-white shadow-sm' : 'text-surface-400 hover:text-surface-200'}`}
            style={tab === t.id ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : {}}>
            <span className="mr-1.5">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'convert' && <ConvertTab key="convert" color={color} setColor={setColor} />}
        {tab === 'contrast' && <ContrastTab key="contrast" />}
        {tab === 'palette' && <PaletteTab key="palette" color={color} setColor={setColor} />}
        {tab === 'gradient' && <GradientTab key="gradient" />}
        {tab === 'blindness' && <BlindnessTab key="blindness" color={color} setColor={setColor} />}
        {tab === 'extract' && <ExtractTab key="extract" />}
      </AnimatePresence>
    </motion.div>
  );
}


// ─── Convert Tab ────────────────────────────────────────────────────────────

function ConvertTab({ color, setColor }) {
  const converted = useMemo(() => {
    try {
      const rgb = hexToRgb(color);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      const hsv = hexToHsv(color);
      const cmyk = hexToCmyk(color);
      return { hex: color.toUpperCase(), rgb, hsl, hsv, cmyk, error: null };
    } catch {
      return { hex: color, rgb: null, hsl: null, hsv: null, cmyk: null, error: 'Invalid color' };
    }
  }, [color]);

  const handleRandom = () => setColor(randomColor());

  const formats = converted.rgb ? [
    { label: 'HEX', value: converted.hex },
    { label: 'RGB', value: `rgb(${converted.rgb.r}, ${converted.rgb.g}, ${converted.rgb.b})` },
    { label: 'HSL', value: `hsl(${converted.hsl.h}, ${converted.hsl.s}%, ${converted.hsl.l}%)` },
    { label: 'HSV', value: `hsv(${converted.hsv.h}, ${converted.hsv.s}%, ${converted.hsv.v}%)` },
    { label: 'CMYK', value: `cmyk(${converted.cmyk.c}%, ${converted.cmyk.m}%, ${converted.cmyk.y}%, ${converted.cmyk.k}%)` },
  ] : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
          className="w-16 h-16 rounded-2xl cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-xl"
          style={{ border: '2px solid rgba(255,255,255,0.1)' }} />
        <input type="text" value={color} onChange={(e) => setColor(e.target.value)}
          className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-mono text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          placeholder="#6366f1" />
        <motion.button type="button" onClick={handleRandom} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
          🎲 Random
        </motion.button>
      </div>

      {formats.length > 0 && (
        <div className="grid gap-3">
          {formats.map((fmt) => (
            <div key={fmt.label} className="flex items-center gap-3 p-3 rounded-2xl"
              style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-xs font-bold text-surface-400 w-12 shrink-0">{fmt.label}</span>
              <code className="flex-1 text-sm font-mono text-surface-100 select-all">{fmt.value}</code>
              <CopyBtn text={fmt.value} />
            </div>
          ))}
        </div>
      )}
      {converted.error && <p className="text-sm text-red-500">{converted.error}</p>}
    </motion.div>
  );
}

// ─── Contrast Tab ───────────────────────────────────────────────────────────

function ContrastTab() {
  const [fg, setFg] = useState('#ffffff');
  const [bg, setBg] = useState('#1e1b4b');

  const contrast = useMemo(() => {
    try {
      const ratio = getContrastRatio(fg, bg);
      const aa = meetsWCAG(fg, bg, 'AA');
      const aaa = meetsWCAG(fg, bg, 'AAA');
      return { ratio, aa, aaa, error: null };
    } catch {
      return { ratio: 0, aa: null, aaa: null, error: 'Invalid colors' };
    }
  }, [fg, bg]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <ColorInput value={fg} onChange={setFg} label="Foreground" />
        <ColorInput value={bg} onChange={setBg} label="Background" />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="p-6 text-center" style={{ backgroundColor: bg, color: fg }}>
          <p className="text-2xl font-bold mb-1">Sample Text</p>
          <p className="text-sm">The quick brown fox jumps over the lazy dog</p>
        </div>
      </div>

      {!contrast.error && (
        <div className="space-y-4">
          <Card className="flex items-center justify-between">
            <span className="text-sm font-semibold text-surface-300">Contrast Ratio</span>
            <span className={`text-2xl font-mono font-bold ${contrast.ratio >= 7 ? 'text-emerald-500' : contrast.ratio >= 4.5 ? 'text-green-500' : contrast.ratio >= 3 ? 'text-yellow-500' : 'text-red-500'}`}>
              {contrast.ratio.toFixed(2)}:1
            </span>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Card className="space-y-2">
              <span className="text-xs font-bold text-surface-400 uppercase">AA</span>
              <div className="flex flex-col gap-1.5">
                <WcagBadge passes={contrast.aa?.normalText} label="Normal Text" />
                <WcagBadge passes={contrast.aa?.largeText} label="Large Text" />
              </div>
            </Card>
            <Card className="space-y-2">
              <span className="text-xs font-bold text-surface-400 uppercase">AAA</span>
              <div className="flex flex-col gap-1.5">
                <WcagBadge passes={contrast.aaa?.normalText} label="Normal Text" />
                <WcagBadge passes={contrast.aaa?.largeText} label="Large Text" />
              </div>
            </Card>
          </div>
        </div>
      )}
      {contrast.error && <p className="text-sm text-red-500">{contrast.error}</p>}
    </motion.div>
  );
}


// ─── Palette Tab ────────────────────────────────────────────────────────────

function PaletteTab({ color, setColor }) {
  const [paletteType, setPaletteType] = useState('complementary');
  const [exportCopied, setExportCopied] = useState(null);

  const palette = useMemo(() => {
    try { return generatePalette(color, paletteType); }
    catch { return []; }
  }, [color, paletteType]);

  const [randomPalette, setRandomPalette] = useState(() => generateRandomPalette());

  const regenerate = useCallback(() => setRandomPalette(generateRandomPalette()), []);

  // Spacebar shortcut for random palette
  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        regenerate();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [regenerate]);

  const handleExport = async (format) => {
    const colors = palette;
    let text;
    switch (format) {
      case 'css': text = exportPaletteCSS(colors); break;
      case 'tailwind': text = exportPaletteTailwind(colors); break;
      case 'scss': text = exportPaletteSCSS(colors); break;
      case 'json': text = exportPaletteJSON(colors); break;
      default: return;
    }
    await navigator.clipboard.writeText(text);
    setExportCopied(format);
    setTimeout(() => setExportCopied(null), 1500);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      {/* Color input */}
      <div className="flex items-center gap-4">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
          className="w-14 h-14 rounded-2xl cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-xl"
          style={{ border: '2px solid rgba(255,255,255,0.1)' }} />
        <input type="text" value={color} onChange={(e) => setColor(e.target.value)}
          className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-mono text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
      </div>

      {/* Palette type selector */}
      <div className="flex flex-wrap gap-2">
        {PALETTE_TYPES.map((pt) => (
          <button key={pt} type="button" onClick={() => setPaletteType(pt)}
            className={`min-h-[44px] px-3 py-2 rounded-xl text-sm font-semibold capitalize transition-all duration-200 ${paletteType === pt ? 'text-white shadow-lg shadow-primary-500/20' : 'text-surface-300 hover:bg-white/5'}`}
            style={paletteType === pt ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
            {pt.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Palette swatches */}
      <div className={`grid gap-2 ${palette.length <= 3 ? 'grid-cols-3' : palette.length === 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>
        {palette.map((hex, i) => <ColorSwatch key={`${hex}-${i}`} hex={hex} />)}
      </div>

      {/* Export buttons */}
      <Card>
        <p className="text-xs font-bold text-surface-400 uppercase mb-3">Export Palette</p>
        <div className="flex flex-wrap gap-2">
          {EXPORT_FORMATS.map((fmt) => (
            <motion.button key={fmt.id} type="button" onClick={() => handleExport(fmt.id)}
              whileTap={{ scale: 0.95 }}
              className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold transition-all bg-white/5 hover:bg-white/10 text-surface-200">
              {exportCopied === fmt.id ? '✓ Copied' : fmt.label}
            </motion.button>
          ))}
        </div>
      </Card>

      {/* Random palette (Coolors-style) */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-surface-400 uppercase">Random Palette</p>
          <motion.button type="button" onClick={regenerate} whileTap={{ scale: 0.95 }}
            className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
            🎲 Generate Random
          </motion.button>
        </div>
        <p className="text-xs text-surface-500 mb-3">Press spacebar to generate a new palette</p>
        <div className="grid grid-cols-5 gap-2">
          {randomPalette.map((hex, i) => <ColorSwatch key={`rnd-${hex}-${i}`} hex={hex} />)}
        </div>
      </Card>
    </motion.div>
  );
}


// ─── Gradient Tab ───────────────────────────────────────────────────────────

function GradientTab() {
  const [gradType, setGradType] = useState('linear');
  const [angle, setAngle] = useState(135);
  const [stops, setStops] = useState([
    { color: '#6366f1', pos: 0 },
    { color: '#ec4899', pos: 100 },
  ]);
  const [cssCopied, setCssCopied] = useState(false);

  const cssValue = useMemo(() => buildGradientCSS(gradType, angle, stops), [gradType, angle, stops]);

  const updateStop = (index, field, value) => {
    setStops((prev) => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const addStop = () => {
    if (stops.length >= 5) return;
    const lastPos = stops[stops.length - 1]?.pos ?? 0;
    setStops((prev) => [...prev, { color: randomColor(), pos: Math.min(lastPos + 20, 100) }]);
  };

  const removeStop = (index) => {
    if (stops.length <= 2) return;
    setStops((prev) => prev.filter((_, i) => i !== index));
  };

  const applyPreset = (preset) => {
    setStops(preset.stops.map((s) => ({ ...s })));
  };

  const copyCSS = async () => {
    await navigator.clipboard.writeText(`background: ${cssValue};`);
    setCssCopied(true);
    setTimeout(() => setCssCopied(false), 1500);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      {/* Live preview */}
      <div className="h-40 rounded-2xl overflow-hidden" style={{ background: cssValue, border: '1px solid rgba(255,255,255,0.08)' }} />

      {/* Type selector */}
      <div className="flex gap-2">
        {['linear', 'radial', 'conic'].map((t) => (
          <button key={t} type="button" onClick={() => setGradType(t)}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${gradType === t ? 'text-white shadow-lg' : 'text-surface-300 hover:bg-white/5'}`}
            style={gradType === t ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Angle slider (linear & conic) */}
      {gradType !== 'radial' && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-surface-300">Angle</span>
            <span className="text-sm font-mono text-surface-100">{angle}°</span>
          </div>
          <input type="range" min="0" max="360" value={angle} onChange={(e) => setAngle(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary-500"
            style={{ background: 'rgba(255,255,255,0.1)' }} />
        </Card>
      )}

      {/* Color stops */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-surface-400 uppercase">Color Stops</span>
          {stops.length < 5 && (
            <motion.button type="button" onClick={addStop} whileTap={{ scale: 0.95 }}
              className="min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-500 bg-primary-500/10 hover:bg-primary-500/20 transition-colors">
              + Add Stop
            </motion.button>
          )}
        </div>
        {stops.map((stop, i) => (
          <div key={i} className="flex items-center gap-3">
            <input type="color" value={stop.color} onChange={(e) => updateStop(i, 'color', e.target.value)}
              className="w-10 h-10 rounded-xl cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-lg"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
            <input type="text" value={stop.color} onChange={(e) => updateStop(i, 'color', e.target.value)}
              className="w-24 min-h-[44px] px-3 py-2 rounded-xl text-sm font-mono text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            <input type="range" min="0" max="100" value={stop.pos} onChange={(e) => updateStop(i, 'pos', Number(e.target.value))}
              className="flex-1 h-2 rounded-full appearance-none cursor-pointer accent-primary-500"
              style={{ background: 'rgba(255,255,255,0.1)' }} />
            <span className="text-xs font-mono text-surface-400 w-10 text-right">{stop.pos}%</span>
            {stops.length > 2 && (
              <motion.button type="button" onClick={() => removeStop(i)} whileTap={{ scale: 0.9 }}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors text-sm">
                ✕
              </motion.button>
            )}
          </div>
        ))}
      </Card>

      {/* CSS output */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-surface-400 uppercase">CSS Output</span>
          <motion.button type="button" onClick={copyCSS} whileTap={{ scale: 0.95 }}
            className="min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-500 bg-primary-500/10 hover:bg-primary-500/20 transition-colors">
            {cssCopied ? '✓ Copied' : '📋 Copy CSS'}
          </motion.button>
        </div>
        <code className="block text-sm font-mono text-surface-100 break-all select-all">
          background: {cssValue};
        </code>
      </Card>

      {/* Presets */}
      <Card>
        <p className="text-xs font-bold text-surface-400 uppercase mb-3">Presets</p>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {GRADIENT_PRESETS.map((preset) => (
            <motion.button key={preset.name} type="button" onClick={() => applyPreset(preset)}
              whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
              className="group relative h-12 rounded-xl overflow-hidden"
              style={{ background: buildGradientCSS('linear', 135, preset.stops), border: '1px solid rgba(255,255,255,0.08)' }}
              aria-label={preset.name}>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 backdrop-blur-sm transition-opacity">
                <span className="text-[10px] font-bold text-white">{preset.name}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}


// ─── Blindness Tab ──────────────────────────────────────────────────────────

function BlindnessTab({ color, setColor }) {
  const simulations = useMemo(() => {
    try {
      return BLINDNESS_TYPES.map((type) => ({
        type,
        label: BLINDNESS_LABELS[type],
        hex: simulateColorBlindness(color, type),
      }));
    } catch {
      return [];
    }
  }, [color]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
          className="w-16 h-16 rounded-2xl cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-xl"
          style={{ border: '2px solid rgba(255,255,255,0.1)' }} />
        <input type="text" value={color} onChange={(e) => setColor(e.target.value)}
          className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-mono text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          placeholder="#6366f1" />
      </div>

      {/* Original + simulations grid */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {/* Original */}
        <Card className="flex flex-col items-center gap-2">
          <div className="w-full h-20 rounded-xl" style={{ backgroundColor: color }} />
          <span className="text-xs font-bold text-surface-300">Original</span>
          <div className="flex items-center gap-1">
            <code className="text-xs font-mono text-surface-100">{color.toUpperCase()}</code>
            <CopyBtn text={color} small />
          </div>
        </Card>

        {/* Simulated */}
        {simulations.map((sim) => (
          <Card key={sim.type} className="flex flex-col items-center gap-2">
            <div className="w-full h-20 rounded-xl" style={{ backgroundColor: sim.hex }} />
            <span className="text-xs font-bold text-surface-300 text-center leading-tight">{sim.label}</span>
            <div className="flex items-center gap-1">
              <code className="text-xs font-mono text-surface-100">{sim.hex.toUpperCase()}</code>
              <CopyBtn text={sim.hex} small />
            </div>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Extract Tab ────────────────────────────────────────────────────────────

function ExtractTab() {
  const [extractedColors, setExtractedColors] = useState([]);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const processImage = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setPreview(e.target.result);
        const colors = extractColorsFromImage(img);
        setExtractedColors(colors);
        setLoading(false);
      };
      img.onerror = () => setLoading(false);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    processImage(file);
  }, [processImage]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    processImage(file);
  }, [processImage]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      {/* Drop zone */}
      <motion.div
        onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        animate={isDragging ? { scale: 1.02, borderColor: 'rgba(99,102,241,0.6)' } : { scale: 1 }}
        className={`relative flex flex-col items-center justify-center gap-3 p-8 rounded-2xl cursor-pointer transition-all ${isDragging ? 'bg-primary-500/10' : 'hover:bg-white/5'}`}
        style={{ border: '2px dashed rgba(255,255,255,0.15)', minHeight: '160px' }}>
        {preview ? (
          <img src={preview} alt="Uploaded" className="max-h-40 rounded-xl object-contain" />
        ) : (
          <>
            <motion.span animate={isDragging ? { y: -4, scale: 1.2 } : { y: 0, scale: 1 }} className="text-4xl">🖼</motion.span>
            <p className="text-sm text-surface-300 text-center">
              Drop an image here or click to upload
            </p>
            <p className="text-xs text-surface-500">PNG, JPG, WebP</p>
          </>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-4">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full" />
          <span className="text-sm text-surface-300">Extracting colors…</span>
        </div>
      )}

      {/* Extracted colors */}
      {extractedColors.length > 0 && !loading && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-surface-400 uppercase">Extracted Colors</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {extractedColors.map((hex, i) => (
              <ColorSwatch key={`ext-${hex}-${i}`} hex={hex} compact />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
