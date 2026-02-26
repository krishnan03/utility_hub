import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const BREAKPOINTS = [
  { name: 'xs (mobile)', min: 0, max: 639 },
  { name: 'sm', min: 640, max: 767 },
  { name: 'md', min: 768, max: 1023 },
  { name: 'lg', min: 1024, max: 1279 },
  { name: 'xl', min: 1280, max: 1535 },
  { name: '2xl', min: 1536, max: Infinity },
];

const DEVICES = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 14', width: 390, height: 844 },
  { name: 'iPad', width: 768, height: 1024 },
  { name: 'MacBook', width: 1280, height: 800 },
  { name: '1080p', width: 1920, height: 1080 },
  { name: '4K', width: 3840, height: 2160 },
];

export default function ScreenResolutionTester() {
  const [screen, setScreen] = useState({ w: 0, h: 0, vw: 0, vh: 0, dpr: 1 });
  const [previewWidth, setPreviewWidth] = useState(375);

  useEffect(() => {
    const update = () => setScreen({
      w: window.screen.width, h: window.screen.height,
      vw: window.innerWidth, vh: window.innerHeight,
      dpr: window.devicePixelRatio || 1,
    });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const activeBreakpoint = BREAKPOINTS.find(b => screen.vw >= b.min && screen.vw <= b.max);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="font-semibold text-surface-100">Your Display</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            ['Screen', `${screen.w} × ${screen.h}`],
            ['Viewport', `${screen.vw} × ${screen.vh}`],
            ['Pixel Ratio', `${screen.dpr}x`],
            ['Breakpoint', activeBreakpoint?.name || '—'],
          ].map(([label, val]) => (
            <div key={label} className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
              <div className="text-lg font-bold font-mono text-primary-400">{val}</div>
              <div className="text-xs text-surface-400 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-6 space-y-3" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="font-semibold text-surface-100">Tailwind Breakpoints</h3>
        <div className="space-y-2">
          {BREAKPOINTS.map(bp => {
            const active = screen.vw >= bp.min && screen.vw <= bp.max;
            return (
              <div key={bp.name} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors ${active ? 'bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700' : ''}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                <span className="font-mono font-semibold text-surface-100 w-28">{bp.name}</span>
                <span className="text-surface-400">{bp.max === Infinity ? `≥ ${bp.min}px` : `${bp.min}–${bp.max}px`}</span>
                {active && <span className="ml-auto text-xs text-green-600 dark:text-green-400 font-semibold">Active</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="font-semibold text-surface-100">Device Preview</h3>
        <div className="flex flex-wrap gap-2">
          {DEVICES.map(d => (
            <button key={d.name} onClick={() => setPreviewWidth(d.width)}
              className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-colors ${previewWidth === d.width ? 'text-white' : ' text-surface-300 hover:bg-white/5'}`}>
              {d.name} ({d.width}px)
            </button>
          ))}
        </div>
        <div>
          <label className="block text-sm text-surface-400 mb-1">Custom width: {previewWidth}px</label>
          <input type="range" min={320} max={1920} value={previewWidth} onChange={e => setPreviewWidth(Number(e.target.value))}
            className="w-full accent-blue-500" />
        </div>
        <div className="overflow-x-auto">
          <div style={{ width: `${Math.min(previewWidth, 800)}px`, minWidth: '200px' }}
            className="border-2 border-blue-400 rounded-xl overflow-hidden transition-all">
            <div className="px-3 py-2 text-xs text-surface-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="ml-2">{previewWidth}px viewport</span>
            </div>
            <div className="p-4 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 rounded w-full" />
              <div className="h-3 rounded w-5/6" />
              <div className="h-8 bg-blue-100 dark:bg-blue-900/30 rounded mt-3" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
