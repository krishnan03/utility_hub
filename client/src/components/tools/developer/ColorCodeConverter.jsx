import { useState } from 'react';
import { motion } from 'framer-motion';

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c+c).join('') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function rgbToHsl({ r, g, b }) {
  const rn = r/255, gn = g/255, bn = b/255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
      case gn: h = ((bn - rn) / d + 2) / 6; break;
      default: h = ((rn - gn) / d + 4) / 6;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function rgbToHsv({ r, g, b }) {
  const rn = r/255, gn = g/255, bn = b/255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), d = max - min;
  let h = 0, s = max === 0 ? 0 : d / max, v = max;
  if (d !== 0) {
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
      case gn: h = ((bn - rn) / d + 2) / 6; break;
      default: h = ((rn - gn) / d + 4) / 6;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
}

function parseInput(raw) {
  const s = raw.trim();
  if (/^#?[0-9a-fA-F]{3,6}$/.test(s)) {
    const hex = s.startsWith('#') ? s : '#' + s;
    return hexToRgb(hex);
  }
  const rgb = s.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgb) return { r: +rgb[1], g: +rgb[2], b: +rgb[3] };
  const hsl = s.match(/hsl\s*\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?\s*\)/i);
  if (hsl) {
    const h = +hsl[1]/360, sl = +hsl[2]/100, l = +hsl[3]/100;
    if (sl === 0) { const v = Math.round(l*255); return { r: v, g: v, b: v }; }
    const q = l < 0.5 ? l*(1+sl) : l+sl-l*sl, p = 2*l-q;
    const hue2rgb = (p, q, t) => { if (t<0) t+=1; if (t>1) t-=1; if (t<1/6) return p+(q-p)*6*t; if (t<1/2) return q; if (t<2/3) return p+(q-p)*(2/3-t)*6; return p; };
    return { r: Math.round(hue2rgb(p,q,h+1/3)*255), g: Math.round(hue2rgb(p,q,h)*255), b: Math.round(hue2rgb(p,q,h-1/3)*255) };
  }
  return null;
}

export default function ColorCodeConverter() {
  const [input, setInput] = useState('#3B82F6');
  const [copied, setCopied] = useState('');

  const rgb = parseInput(input);
  const hex = rgb ? rgbToHex(rgb) : null;
  const hsl = rgb ? rgbToHsl(rgb) : null;
  const hsv = rgb ? rgbToHsv(rgb) : null;

  const copy = (val, key) => { navigator.clipboard.writeText(val); setCopied(key); setTimeout(() => setCopied(''), 1500); };

  const row = (label, val, key) => val && (
    <div key={key} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <span className="text-sm text-surface-400 w-16">{label}</span>
      <span className="font-mono text-sm text-surface-100 flex-1 mx-3">{val}</span>
      <button onClick={() => copy(val, key)} className="text-xs px-2 py-1 hover:bg-white/5 rounded-lg transition-colors">
        {copied === key ? '✓' : 'Copy'}
      </button>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-surface-300 block mb-1">Color Input (HEX, RGB, HSL)</label>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="#3B82F6 or rgb(59,130,246) or hsl(217,91%,60%)"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono" />
          </div>
          {hex && (
            <div className="w-16 h-12 rounded-xl shadow-inner flex-shrink-0"
              style={{ backgroundColor: hex }} />
          )}
        </div>
        {!rgb && input && <p className="text-red-500 text-sm">Could not parse color — try #hex, rgb(r,g,b), or hsl(h,s%,l%)</p>}
        {rgb && (
          <div className="rounded-xl p-4">
            {row('HEX', hex, 'hex')}
            {row('RGB', `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, 'rgb')}
            {row('HSL', `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, 'hsl')}
            {row('HSV', `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`, 'hsv')}
            {row('CSS var', `--color: ${hex};`, 'css')}
          </div>
        )}
        {hex && (
          <div className="grid grid-cols-5 gap-2">
            {[100,80,60,40,20].map(l => (
              <div key={l} className="rounded-xl h-10"
                style={{ backgroundColor: `hsl(${hsl.h}, ${hsl.s}%, ${l}%)` }}
                title={`hsl(${hsl.h}, ${hsl.s}%, ${l}%)`} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
