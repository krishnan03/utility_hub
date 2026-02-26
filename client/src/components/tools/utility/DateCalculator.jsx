import { useState } from 'react';
import { motion } from 'framer-motion';

function businessDays(start, end) {
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export default function DateCalculator() {
  const today = new Date().toISOString().split('T')[0];
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [addDate, setAddDate] = useState(today);
  const [addDays, setAddDays] = useState(0);

  const s = new Date(start), e = new Date(end);
  const totalDays = Math.round((e - s) / 86400000);
  const absDays = Math.abs(totalDays);
  const weeks = (absDays / 7).toFixed(2);
  const months = (absDays / 30.44).toFixed(2);
  const years = (absDays / 365.25).toFixed(2);
  const bDays = s <= e ? businessDays(s, e) : businessDays(e, s);

  const resultDate = new Date(addDate);
  resultDate.setDate(resultDate.getDate() + Number(addDays));
  const resultStr = resultDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="font-semibold text-surface-100">Date Difference</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Start Date</label>
            <input type="date" value={start} onChange={e => setStart(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">End Date</label>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[['Days', absDays.toLocaleString()], ['Weeks', weeks], ['Months', months], ['Years', years]].map(([label, val]) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,99,99,0.08)', border: '1px solid rgba(255,99,99,0.2)' }}>
              <div className="text-xl font-bold text-primary-400">{val}</div>
              <div className="text-xs text-surface-400">{label}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-xl px-4 py-2 text-sm" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <span className="text-surface-400">Business Days</span>
          <span className="font-semibold text-surface-100">{bDays}</span>
        </div>
        {totalDays < 0 && <p className="text-xs text-amber-400">Note: End date is before start date — showing absolute difference.</p>}
      </div>

      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="font-semibold text-surface-100">Add / Subtract Days</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Base Date</label>
            <input type="date" value={addDate} onChange={e => setAddDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Days (negative to subtract)</label>
            <input type="number" value={addDays} onChange={e => setAddDays(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,99,99,0.08)', border: '1px solid rgba(255,99,99,0.2)' }}>
          <div className="text-sm text-surface-400 mb-1">Result</div>
          <div className="text-lg font-semibold text-surface-100">{resultStr}</div>
        </div>
      </div>
    </motion.div>
  );
}
