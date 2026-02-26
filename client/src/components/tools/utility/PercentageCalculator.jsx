import { useState } from 'react';
import { motion } from 'framer-motion';

const MODES = [
  { id: 0, label: 'What is X% of Y?' },
  { id: 1, label: 'X is what % of Y?' },
  { id: 2, label: '% change from X to Y' },
];

export default function PercentageCalculator() {
  const [mode, setMode] = useState(0);
  const [x, setX] = useState('');
  const [y, setY] = useState('');

  const xn = parseFloat(x), yn = parseFloat(y);
  let result = null, formula = '';

  if (!isNaN(xn) && !isNaN(yn)) {
    if (mode === 0) {
      result = (xn / 100) * yn;
      formula = `${xn}% × ${yn} = ${result.toFixed(4)}`;
    } else if (mode === 1) {
      result = yn !== 0 ? (xn / yn) * 100 : null;
      formula = result !== null ? `(${xn} ÷ ${yn}) × 100 = ${result.toFixed(4)}%` : 'Division by zero';
    } else {
      result = xn !== 0 ? ((yn - xn) / Math.abs(xn)) * 100 : null;
      formula = result !== null
        ? `((${yn} − ${xn}) ÷ |${xn}|) × 100 = ${result.toFixed(4)}%`
        : 'Division by zero';
    }
  }

  const labels = [
    ['X (%)', 'Y (number)'],
    ['X (part)', 'Y (whole)'],
    ['X (original)', 'Y (new)'],
  ][mode];

  const resultLabel = mode === 0 ? '' : '%';
  const changeType = mode === 2 && result !== null ? (result >= 0 ? 'increase' : 'decrease') : '';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex flex-wrap gap-2">
          {MODES.map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); setX(''); setY(''); }}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${mode === m.id ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`}
              style={mode === m.id ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
              {m.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[0, 1].map(i => (
            <div key={i}>
              <label className="block text-sm font-medium text-surface-300 mb-1">{labels[i]}</label>
              <input type="number" value={i === 0 ? x : y} onChange={e => i === 0 ? setX(e.target.value) : setY(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
          ))}
        </div>
      </div>

      {result !== null && (
        <div className="rounded-2xl p-6 space-y-3" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-center">
            <div className={`text-4xl font-bold mb-1 ${mode === 2 ? (result >= 0 ? 'text-green-500' : 'text-red-500') : 'text-primary-400'}`}>
              {result.toFixed(2)}{resultLabel}
            </div>
            {changeType && <div className="text-sm text-surface-400 capitalize">{changeType}</div>}
          </div>
          <div className="rounded-xl px-4 py-3 text-sm font-mono text-surface-300 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {formula}
          </div>
        </div>
      )}
    </motion.div>
  );
}
