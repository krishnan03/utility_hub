import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

const PRESETS = [
  { label: '@hourly', value: '0 * * * *' },
  { label: '@daily', value: '0 0 * * *' },
  { label: '@weekly', value: '0 0 * * 0' },
  { label: '@monthly', value: '0 0 1 * *' },
  { label: '@yearly', value: '0 0 1 1 *' },
];

const FIELD_PRESETS = {
  minute: ['*', '0', '*/5', '*/15', '*/30', '0,30'],
  hour: ['*', '0', '9', '12', '18', '*/2', '9-17'],
  dom: ['*', '1', '15', '1,15', 'L'],
  month: ['*', '1', '6', '12', '1-6'],
  dow: ['*', '0', '1', '1-5', '6,0'],
};

const FIELD_NAMES = ['minute', 'hour', 'dom', 'month', 'dow'];
const FIELD_LABELS = ['Minute', 'Hour', 'Day of Month', 'Month', 'Day of Week'];

function matchField(val, field) {
  if (field === '*' || field === 'L') return true;
  if (field.includes('/')) {
    const [range, step] = field.split('/');
    const s = parseInt(step);
    if (range === '*') return val % s === 0;
    const start = parseInt(range);
    return val >= start && (val - start) % s === 0;
  }
  if (field.includes('-')) { const [a, b] = field.split('-').map(Number); return val >= a && val <= b; }
  if (field.includes(',')) return field.split(',').map(Number).includes(val);
  return parseInt(field) === val;
}

function getNextRuns(parts, count = 5) {
  if (parts.length < 5) return [];
  const [min, hr, dom, mon, dow] = parts;
  const runs = [];
  const d = new Date(); d.setSeconds(0, 0); d.setMinutes(d.getMinutes() + 1);
  let attempts = 0;
  while (runs.length < count && attempts < 100000) {
    attempts++;
    if (matchField(d.getMonth()+1, mon) && matchField(d.getDate(), dom) && matchField(d.getDay(), dow) && matchField(d.getHours(), hr) && matchField(d.getMinutes(), min))
      runs.push(new Date(d));
    d.setMinutes(d.getMinutes() + 1);
  }
  return runs;
}

function describe(parts) {
  if (parts.length < 5) return 'Invalid';
  const [min, hr, dom, mon, dow] = parts;
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let s = 'Runs ';
  if (min === '*' && hr === '*') s += 'every minute';
  else if (min === '*') s += `every minute of hour ${hr}`;
  else if (hr === '*') s += `at minute ${min} of every hour`;
  else s += `at ${hr.padStart(2,'0')}:${min.padStart(2,'0')}`;
  if (dom !== '*') s += `, on day ${dom}`;
  if (mon !== '*') s += `, month ${mon}`;
  if (dow !== '*') s += `, on ${days[parseInt(dow)] || dow}`;
  return s;
}

export default function CrontabGuru() {
  const [fields, setFields] = useState({ minute: '*', hour: '*', dom: '*', month: '*', dow: '*' });

  const expr = FIELD_NAMES.map(f => fields[f]).join(' ');
  const parts = FIELD_NAMES.map(f => fields[f]);
  const runs = useMemo(() => { try { return getNextRuns(parts); } catch { return []; } }, [expr]);
  const desc = useMemo(() => describe(parts), [expr]);

  const setPreset = (val) => {
    const p = val.split(' ');
    if (p.length === 5) setFields({ minute: p[0], hour: p[1], dom: p[2], month: p[3], dow: p[4] });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => setPreset(p.value)}
              className="px-3 py-1 text-xs hover:bg-primary-500/10/30 rounded-lg transition-colors text-surface-300 font-mono">
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {FIELD_NAMES.map((f, i) => (
            <div key={f}>
              <label className="text-xs font-medium text-surface-400 block mb-1">{FIELD_LABELS[i]}</label>
              <input value={fields[f]} onChange={e => setFields(p => ({ ...p, [f]: e.target.value }))}
                className="w-full px-2 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-center text-sm" />
              <select onChange={e => { if (e.target.value) setFields(p => ({ ...p, [f]: e.target.value })); e.target.value = ''; }}
                className="w-full mt-1 px-1 py-1 rounded-lg text-surface-300 text-xs focus:outline-none" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <option value="">preset</option>
                {FIELD_PRESETS[f].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="bg-gray-900 dark:bg-gray-950 rounded-xl px-4 py-3 font-mono text-xl text-blue-400 text-center tracking-widest">{expr}</div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-3 text-sm text-blue-700 dark:text-blue-300">{desc}</div>
        {runs.length > 0 && (
          <div>
            <div className="text-sm font-medium text-surface-300 mb-2">Next 5 runs</div>
            <div className="space-y-1">
              {runs.map((r, i) => (
                <div key={i} className="font-mono text-sm rounded-lg px-3 py-1.5 text-surface-300">
                  {r.toLocaleString()}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
