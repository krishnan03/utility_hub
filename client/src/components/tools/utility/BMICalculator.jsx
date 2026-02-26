import { useState } from 'react';
import { motion } from 'framer-motion';

const CATEGORIES = [
  { label: 'Underweight', range: [0, 18.5], color: 'text-blue-500', bg: 'bg-blue-500' },
  { label: 'Normal weight', range: [18.5, 25], color: 'text-green-500', bg: 'bg-green-500' },
  { label: 'Overweight', range: [25, 30], color: 'text-yellow-500', bg: 'bg-yellow-500' },
  { label: 'Obese', range: [30, 100], color: 'text-red-500', bg: 'bg-red-500' },
];

function getCategory(bmi) {
  return CATEGORIES.find(c => bmi >= c.range[0] && bmi < c.range[1]) || CATEGORIES[3];
}

export default function BMICalculator() {
  const [unit, setUnit] = useState('metric');
  const [weight, setWeight] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');

  let bmi = null, heightM = null;
  const w = parseFloat(weight);

  if (unit === 'metric') {
    const h = parseFloat(heightCm) / 100;
    if (w > 0 && h > 0) { heightM = h; bmi = w / (h * h); }
  } else {
    const totalIn = parseFloat(heightFt || 0) * 12 + parseFloat(heightIn || 0);
    const lbs = w;
    if (lbs > 0 && totalIn > 0) { heightM = totalIn * 0.0254; bmi = (lbs / (totalIn * totalIn)) * 703; }
  }

  const cat = bmi ? getCategory(bmi) : null;
  const barPct = bmi ? Math.min((bmi / 40) * 100, 100) : 0;

  let minW = null, maxW = null;
  if (heightM) {
    if (unit === 'metric') {
      minW = `${(18.5 * heightM * heightM).toFixed(1)} kg`;
      maxW = `${(24.9 * heightM * heightM).toFixed(1)} kg`;
    } else {
      const inH = heightM / 0.0254;
      minW = `${((18.5 * inH * inH) / 703).toFixed(1)} lbs`;
      maxW = `${((24.9 * inH * inH) / 703).toFixed(1)} lbs`;
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex gap-2">
          {['metric', 'imperial'].map(u => (
            <button key={u} onClick={() => setUnit(u)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${unit === u ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`}
              style={unit === u ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
              {u === 'metric' ? 'Metric (kg/cm)' : 'Imperial (lbs/ft)'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">
              Weight ({unit === 'metric' ? 'kg' : 'lbs'})
            </label>
            <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="0"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          {unit === 'metric' ? (
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">Height (cm)</label>
              <input type="number" value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="0"
                className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-surface-300 mb-1">Feet</label>
                <input type="number" value={heightFt} onChange={e => setHeightFt(e.target.value)} placeholder="0"
                  className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-surface-300 mb-1">Inches</label>
                <input type="number" value={heightIn} onChange={e => setHeightIn(e.target.value)} placeholder="0"
                  className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {bmi && cat && (
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-center">
            <div className={`text-5xl font-bold ${cat.color}`}>{bmi.toFixed(1)}</div>
            <div className={`text-lg font-semibold mt-1 ${cat.color}`}>{cat.label}</div>
          </div>

          <div className="space-y-2">
            <div className="flex text-xs text-surface-500 justify-between"><span>0</span><span>18.5</span><span>25</span><span>30</span><span>40+</span></div>
            <div className="relative h-3 rounded-full overflow-hidden flex">
              <div className="flex-1 bg-blue-400" />
              <div className="flex-1 bg-green-400" />
              <div className="flex-1 bg-yellow-400" />
              <div className="flex-1 bg-red-400" />
              <div className="absolute top-0 bottom-0 w-1 rounded-full shadow-lg transition-all" style={{ left: `${barPct}%`, background: '#1c1c1e' }} />
            </div>
            <div className="flex text-xs justify-between text-surface-500">
              <span>Underweight</span><span>Normal</span><span>Overweight</span><span>Obese</span>
            </div>
          </div>

          {minW && maxW && (
            <div className="rounded-xl px-4 py-3 text-sm text-center" style={{ background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.2)' }}>
              <span className="text-surface-400">Healthy weight range: </span>
              <span className="font-semibold text-accent-green">{minW} – {maxW}</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
