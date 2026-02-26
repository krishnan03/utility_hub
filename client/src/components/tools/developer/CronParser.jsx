import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

const EXAMPLES = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Daily midnight', value: '0 0 * * *' },
  { label: 'Weekly Monday', value: '0 0 * * 1' },
  { label: 'Monthly 1st', value: '0 0 1 * *' },
];

function matchField(val, field) {
  if (field === '*') return true;
  if (field.includes('/')) {
    const [range, step] = field.split('/');
    const s = parseInt(step);
    if (range === '*') return val % s === 0;
    const [start] = range.split('-').map(Number);
    return val >= start && (val - start) % s === 0;
  }
  if (field.includes('-')) {
    const [a, b] = field.split('-').map(Number);
    return val >= a && val <= b;
  }
  if (field.includes(',')) return field.split(',').map(Number).includes(val);
  return parseInt(field) === val;
}

function getNextRuns(expr, count = 10) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return [];
  const [min, hr, dom, mon, dow] = parts;
  const runs = [];
  const now = new Date();
  now.setSeconds(0, 0);
  now.setMinutes(now.getMinutes() + 1);
  let d = new Date(now);
  let attempts = 0;
  while (runs.length < count && attempts < 100000) {
    attempts++;
    const mo = d.getMonth() + 1;
    const dy = d.getDate();
    const h = d.getHours();
    const mi = d.getMinutes();
    const wd = d.getDay();
    if (matchField(mo, mon) && matchField(dy, dom) && matchField(wd, dow) && matchField(h, hr) && matchField(mi, min)) {
      runs.push(new Date(d));
    }
    d.setMinutes(d.getMinutes() + 1);
  }
  return runs;
}

function describe(expr) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return 'Invalid expression';
  const [min, hr, dom, mon, dow] = parts;
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let desc = 'Runs ';
  if (min === '*' && hr === '*') desc += 'every minute';
  else if (min === '*') desc += `every minute of hour ${hr}`;
  else if (hr === '*') desc += `at minute ${min} of every hour`;
  else desc += `at ${hr.padStart(2,'0')}:${min.padStart(2,'0')}`;
  if (dom !== '*') desc += `, on day ${dom} of the month`;
  if (mon !== '*') desc += `, in ${months[(parseInt(mon)-1)] || mon}`;
  if (dow !== '*') desc += `, on ${days[parseInt(dow)] || dow}`;
  return desc;
}

const FIELDS = ['Minute','Hour','Day','Month','Weekday'];

export default function CronParser() {
  const [expr, setExpr] = useState('0 9 * * 1-5');

  const runs = useMemo(() => { try { return getNextRuns(expr); } catch { return []; } }, [expr]);
  const desc = useMemo(() => { try { return describe(expr); } catch { return 'Invalid'; } }, [expr]);
  const parts = expr.trim().split(/\s+/);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map(ex => (
            <button key={ex.label} onClick={() => setExpr(ex.value)}
              className="px-3 py-1 text-xs hover:bg-primary-500/10/30 rounded-lg transition-colors text-surface-300">
              {ex.label}
            </button>
          ))}
        </div>
        <div>
          <label className="text-sm font-medium text-surface-300 block mb-1">Cron Expression</label>
          <input value={expr} onChange={e => setExpr(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-lg" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FIELDS.map((f, i) => (
            <div key={f} className="flex-1 min-w-[80px] rounded-xl p-2 text-center">
              <div className="text-xs text-surface-400">{f}</div>
              <div className="font-mono font-bold text-primary-400">{parts[i] || '?'}</div>
            </div>
          ))}
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-3 text-sm text-blue-700 dark:text-blue-300 font-medium">{desc}</div>
        {runs.length > 0 && (
          <div>
            <div className="text-sm font-medium text-surface-300 mb-2">Next 10 executions</div>
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
