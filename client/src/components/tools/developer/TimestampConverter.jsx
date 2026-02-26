import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

function relativeTime(ms) {
  const diff = Date.now() - ms;
  const abs = Math.abs(diff);
  const future = diff < 0;
  if (abs < 60000) return 'just now';
  if (abs < 3600000) return `${Math.floor(abs / 60000)} min${future ? ' from now' : ' ago'}`;
  if (abs < 86400000) return `${Math.floor(abs / 3600000)} hr${future ? ' from now' : ' ago'}`;
  return `${Math.floor(abs / 86400000)} day${future ? 's from now' : 's ago'}`;
}

export default function TimestampConverter() {
  const [tsInput, setTsInput] = useState('');
  const [dtInput, setDtInput] = useState('');
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const fromTs = (val) => {
    setTsInput(val);
    const n = Number(val);
    if (!val || isNaN(n)) { setResult(null); return; }
    const ms = n > 1e10 ? n : n * 1000;
    const d = new Date(ms);
    setResult(d);
    setDtInput(d.toISOString().slice(0, 16));
  };

  const fromDt = (val) => {
    setDtInput(val);
    if (!val) { setResult(null); return; }
    const d = new Date(val);
    if (isNaN(d)) { setResult(null); return; }
    setResult(d);
    setTsInput(Math.floor(d.getTime() / 1000).toString());
  };

  const setQuick = (ms) => {
    const d = new Date(ms);
    setResult(d);
    setTsInput(Math.floor(ms / 1000).toString());
    setDtInput(d.toISOString().slice(0, 16));
  };

  const startOfToday = () => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); };
  const startOfWeek = () => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return d.getTime(); };
  const startOfMonth = () => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(1); return d.getTime(); };

  const row = (label, val) => (
    <div key={label} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <span className="text-sm text-surface-400">{label}</span>
      <span className="font-mono text-sm text-surface-100">{val}</span>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.2)' }}>
          <span className="text-sm text-primary-300 font-medium">Current Unix timestamp</span>
          <span className="font-mono text-primary-400 font-bold">{Math.floor(now / 1000)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[['Now', Date.now()], ['Start of today', startOfToday()], ['Start of week', startOfWeek()], ['Start of month', startOfMonth()]].map(([l, v]) => (
            <button key={l} onClick={() => setQuick(v)}
              className="px-3 py-1 text-xs rounded-lg transition-colors text-surface-300 hover:bg-white/5"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              {l}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Unix Timestamp</label>
            <input value={tsInput} onChange={e => fromTs(e.target.value)} placeholder="e.g. 1700000000"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Date / Time</label>
            <input type="datetime-local" value={dtInput} onChange={e => fromDt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>
        {result && !isNaN(result) && (
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {row('UTC', result.toUTCString())}
            {row('Local', result.toLocaleString())}
            {row('ISO 8601', result.toISOString())}
            {row('Relative', relativeTime(result.getTime()))}
            {row('Unix (s)', Math.floor(result.getTime() / 1000))}
            {row('Unix (ms)', result.getTime())}
          </div>
        )}
      </div>
    </motion.div>
  );
}
