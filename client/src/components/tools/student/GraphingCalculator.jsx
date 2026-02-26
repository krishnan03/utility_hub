import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#FF6363', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

const PRESETS = [
  { label: 'Parabola', expr: 'x^2' },
  { label: 'Sine', expr: 'sin(x)' },
  { label: 'Exponential', expr: 'exp(x)' },
  { label: 'Log', expr: 'ln(x)' },
  { label: 'Circle+', expr: 'sqrt(1-x^2)' },
  { label: 'Circle−', expr: '-sqrt(1-x^2)' },
];

function evaluate(expr, x) {
  let e = expr
    .replace(/\bpi\b/gi, String(Math.PI))
    .replace(/\be\b/g, String(Math.E))
    .replace(/\bsin\b/g, 'Math.sin')
    .replace(/\bcos\b/g, 'Math.cos')
    .replace(/\btan\b/g, 'Math.tan')
    .replace(/\bsqrt\b/g, 'Math.sqrt')
    .replace(/\babs\b/g, 'Math.abs')
    .replace(/\blog\b/g, 'Math.log10')
    .replace(/\bln\b/g, 'Math.log')
    .replace(/\bexp\b/g, 'Math.exp')
    .replace(/\bfloor\b/g, 'Math.floor')
    .replace(/\bceil\b/g, 'Math.ceil')
    .replace(/\^/g, '**')
    .replace(/\bx\b/g, `(${x})`);
  try {
    return new Function('return ' + e)();
  } catch {
    return NaN;
  }
}

function cleanExpr(raw) {
  let s = raw.trim();
  if (/^y\s*=\s*/i.test(s)) s = s.replace(/^y\s*=\s*/i, '');
  if (/^f\s*\(\s*x\s*\)\s*=\s*/i.test(s)) s = s.replace(/^f\s*\(\s*x\s*\)\s*=\s*/i, '');
  return s;
}

const DEFAULT_VIEW = { xMin: -10, xMax: 10, yMin: -7, yMax: 7 };

export default function GraphingCalculator() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [functions, setFunctions] = useState([{ expr: 'sin(x)', color: COLORS[0] }]);
  const [view, setView] = useState({ ...DEFAULT_VIEW });
  const [showGrid, setShowGrid] = useState(true);
  const [hoverCoord, setHoverCoord] = useState(null);
  const [dragState, setDragState] = useState(null);
  const debounceRef = useRef(null);

  const addFunction = useCallback(() => {
    if (functions.length >= 5) return;
    setFunctions((prev) => [...prev, { expr: '', color: COLORS[prev.length % COLORS.length] }]);
  }, [functions.length]);

  const removeFunction = useCallback((idx) => {
    setFunctions((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateExpr = useCallback((idx, val) => {
    setFunctions((prev) => prev.map((f, i) => (i === idx ? { ...f, expr: val } : f)));
  }, []);

  const loadPreset = useCallback((expr) => {
    const emptyIdx = functions.findIndex((f) => !f.expr.trim());
    if (emptyIdx >= 0) {
      setFunctions((prev) => prev.map((f, i) => (i === emptyIdx ? { ...f, expr } : f)));
    } else if (functions.length < 5) {
      setFunctions((prev) => [...prev, { expr, color: COLORS[prev.length % COLORS.length] }]);
    } else {
      setFunctions((prev) => prev.map((f, i) => (i === 0 ? { ...f, expr } : f)));
    }
  }, [functions]);

  // Drawing
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    const { xMin, xMax, yMin, yMax } = view;
    const toCanvasX = (x) => ((x - xMin) / (xMax - xMin)) * W;
    const toCanvasY = (y) => H - ((y - yMin) / (yMax - yMin)) * H;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    // Grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      const xStep = niceStep(xMax - xMin);
      const yStep = niceStep(yMax - yMin);
      ctx.beginPath();
      for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
        const cx = toCanvasX(x);
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, H);
      }
      for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
        const cy = toCanvasY(y);
        ctx.moveTo(0, cy);
        ctx.lineTo(W, cy);
      }
      ctx.stroke();

      // Axis labels
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
        if (Math.abs(x) < xStep * 0.01) continue;
        const cx = toCanvasX(x);
        const cy = toCanvasY(0);
        const labelY = Math.min(Math.max(cy + 14, 14), H - 4);
        ctx.fillText(formatNum(x), cx, labelY);
      }
      ctx.textAlign = 'right';
      for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
        if (Math.abs(y) < yStep * 0.01) continue;
        const cy = toCanvasY(y);
        const cx = toCanvasX(0);
        const labelX = Math.min(Math.max(cx - 6, 30), W - 4);
        ctx.fillText(formatNum(y), labelX, cy + 4);
      }
    }

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const ax = toCanvasX(0);
    const ay = toCanvasY(0);
    if (ax >= 0 && ax <= W) { ctx.moveTo(ax, 0); ctx.lineTo(ax, H); }
    if (ay >= 0 && ay <= H) { ctx.moveTo(0, ay); ctx.lineTo(W, ay); }
    ctx.stroke();

    // Plot functions
    const samples = Math.max(W * 2, 1000);
    functions.forEach(({ expr, color }) => {
      const cleaned = cleanExpr(expr);
      if (!cleaned) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let penDown = false;
      for (let i = 0; i <= samples; i++) {
        const x = xMin + (i / samples) * (xMax - xMin);
        const y = evaluate(cleaned, x);
        if (!isFinite(y) || isNaN(y)) { penDown = false; continue; }
        const cx = toCanvasX(x);
        const cy = toCanvasY(y);
        if (cy < -1000 || cy > H + 1000) { penDown = false; continue; }
        if (!penDown) { ctx.moveTo(cx, cy); penDown = true; }
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    });
  }, [view, functions, showGrid]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(draw, 200);
    return () => clearTimeout(debounceRef.current);
  }, [draw]);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  // Mouse hover for coordinates
  const handleMouseMove = useCallback((e) => {
    if (dragState) {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      const rect = canvasRef.current.getBoundingClientRect();
      const xRange = dragState.xMax - dragState.xMin;
      const yRange = dragState.yMax - dragState.yMin;
      setView({
        xMin: dragState.xMin - (dx / rect.width) * xRange,
        xMax: dragState.xMax - (dx / rect.width) * xRange,
        yMin: dragState.yMin + (dy / rect.height) * yRange,
        yMax: dragState.yMax + (dy / rect.height) * yRange,
      });
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const x = view.xMin + (px / rect.width) * (view.xMax - view.xMin);
    const y = view.yMax - (py / rect.height) * (view.yMax - view.yMin);
    setHoverCoord({ x, y });
  }, [view, dragState]);

  const handleMouseDown = useCallback((e) => {
    setDragState({ startX: e.clientX, startY: e.clientY, ...view });
  }, [view]);

  const handleMouseUp = useCallback(() => setDragState(null), []);
  const handleMouseLeave = useCallback(() => { setDragState(null); setHoverCoord(null); }, []);

  // Wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.15 : 0.87;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setView((v) => {
      const cx = v.xMin + px * (v.xMax - v.xMin);
      const cy = v.yMax - py * (v.yMax - v.yMin);
      const nw = (v.xMax - v.xMin) * factor;
      const nh = (v.yMax - v.yMin) * factor;
      return { xMin: cx - px * nw, xMax: cx + (1 - px) * nw, yMin: cy - (1 - py) * nh, yMax: cy + py * nh };
    });
  }, []);

  const zoom = useCallback((dir) => {
    const factor = dir === 'in' ? 0.75 : 1.33;
    setView((v) => {
      const cx = (v.xMin + v.xMax) / 2;
      const cy = (v.yMin + v.yMax) / 2;
      const hw = ((v.xMax - v.xMin) / 2) * factor;
      const hh = ((v.yMax - v.yMin) / 2) * factor;
      return { xMin: cx - hw, xMax: cx + hw, yMin: cy - hh, yMax: cy + hh };
    });
  }, []);

  const resetView = useCallback(() => setView({ ...DEFAULT_VIEW }), []);

  const handleRangeChange = useCallback((key, val) => {
    const n = parseFloat(val);
    if (!isNaN(n)) setView((v) => ({ ...v, [key]: n }));
  }, []);

  // Touch support
  const touchRef = useRef(null);
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      setDragState({ startX: t.clientX, startY: t.clientY, ...view });
    } else if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      touchRef.current = { dist: d, view: { ...view } };
    }
  }, [view]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    if (e.touches.length === 1 && dragState) {
      const t = e.touches[0];
      const dx = t.clientX - dragState.startX;
      const dy = t.clientY - dragState.startY;
      const rect = canvasRef.current.getBoundingClientRect();
      const xRange = dragState.xMax - dragState.xMin;
      const yRange = dragState.yMax - dragState.yMin;
      setView({
        xMin: dragState.xMin - (dx / rect.width) * xRange,
        xMax: dragState.xMax - (dx / rect.width) * xRange,
        yMin: dragState.yMin + (dy / rect.height) * yRange,
        yMax: dragState.yMax + (dy / rect.height) * yRange,
      });
    } else if (e.touches.length === 2 && touchRef.current) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const scale = touchRef.current.dist / d;
      const v = touchRef.current.view;
      const cx = (v.xMin + v.xMax) / 2;
      const cy = (v.yMin + v.yMax) / 2;
      const hw = ((v.xMax - v.xMin) / 2) * scale;
      const hh = ((v.yMax - v.yMin) / 2) * scale;
      setView({ xMin: cx - hw, xMax: cx + hw, yMin: cy - hh, yMax: cy + hh });
    }
  }, [dragState]);

  const handleTouchEnd = useCallback(() => { setDragState(null); touchRef.current = null; }, []);

  return (
    <div className="space-y-6">
      {/* Function inputs */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <AnimatePresence mode="popLayout">
          {functions.map((fn, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-3"
            >
              <span
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: fn.color }}
                aria-label={`Function ${idx + 1} color`}
              />
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 text-sm font-mono pointer-events-none">
                  y =
                </span>
                <input
                  type="text"
                  value={fn.expr}
                  onChange={(e) => updateExpr(idx, e.target.value)}
                  placeholder="e.g. sin(x), x^2 + 2x - 1"
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-surface-50 font-mono text-sm placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-all"
                  aria-label={`Function ${idx + 1} expression`}
                />
              </div>
              {functions.length > 1 && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => removeFunction(idx)}
                  className="p-2 rounded-lg hover:bg-white/10 text-surface-500 hover:text-red-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={`Remove function ${idx + 1}`}
                >
                  ✕
                </motion.button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {functions.length < 5 && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={addFunction}
            className="text-sm text-primary-400 hover:text-primary-300 font-medium transition-colors py-2 px-3 rounded-lg hover:bg-white/5 min-h-[44px]"
          >
            + Add Function
          </motion.button>
        )}
      </motion.div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <motion.button
            key={p.label}
            whileTap={{ scale: 0.95 }}
            onClick={() => loadPreset(p.expr)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-surface-300 hover:bg-white/10 hover:text-surface-100 transition-all min-h-[44px] min-w-[44px]"
          >
            {p.label}
          </motion.button>
        ))}
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative rounded-xl overflow-hidden border border-white/10" style={{ minHeight: 400 }}>
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair"
          style={{ height: 450, display: 'block' }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          role="img"
          aria-label="Function graph canvas"
        />
        {hoverCoord && !dragState && (
          <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm text-xs font-mono text-surface-200 pointer-events-none">
            ({hoverCoord.x.toFixed(2)}, {hoverCoord.y.toFixed(2)})
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <motion.button whileTap={{ scale: 0.93 }} onClick={() => zoom('in')} className="ctrl-btn" aria-label="Zoom in">
          🔍+
        </motion.button>
        <motion.button whileTap={{ scale: 0.93 }} onClick={() => zoom('out')} className="ctrl-btn" aria-label="Zoom out">
          🔍−
        </motion.button>
        <motion.button whileTap={{ scale: 0.93 }} onClick={resetView} className="ctrl-btn" aria-label="Reset view">
          ↺ Reset
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => setShowGrid((g) => !g)}
          className={`ctrl-btn ${showGrid ? 'ring-1 ring-primary-500/50' : ''}`}
          aria-label="Toggle grid"
          aria-pressed={showGrid}
        >
          # Grid
        </motion.button>
      </div>

      {/* Range inputs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: 'xMin', label: 'X min' },
          { key: 'xMax', label: 'X max' },
          { key: 'yMin', label: 'Y min' },
          { key: 'yMax', label: 'Y max' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="text-xs text-surface-500 mb-1 block">{label}</label>
            <input
              type="number"
              value={view[key]}
              onChange={(e) => handleRangeChange(key, e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-surface-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              aria-label={label}
              step="1"
            />
          </div>
        ))}
      </div>

      <style>{`
        .ctrl-btn {
          padding: 8px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: #d1d5db;
          min-height: 44px;
          min-width: 44px;
          transition: all 0.15s;
          cursor: pointer;
        }
        .ctrl-btn:hover {
          background: rgba(255,255,255,0.12);
          color: #f5f5f7;
        }
      `}</style>
    </div>
  );
}

function niceStep(range) {
  const rough = range / 10;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / pow;
  if (norm < 1.5) return pow;
  if (norm < 3.5) return 2 * pow;
  if (norm < 7.5) return 5 * pow;
  return 10 * pow;
}

function formatNum(n) {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, '');
}
