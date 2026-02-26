import { useState } from 'react';
import { motion } from 'framer-motion';

const QUICK_REF = Array.from({ length: 16 }, (_, i) => ({
  dec: i, hex: i.toString(16).toUpperCase(), bin: i.toString(2).padStart(4, '0'), oct: i.toString(8),
}));

export default function BinaryConverter() {
  const [values, setValues] = useState({ bin: '', dec: '', hex: '', oct: '' });

  const update = (type, raw) => {
    const val = raw.trim();
    let n;
    try {
      if (type === 'bin') n = parseInt(val, 2);
      else if (type === 'dec') n = parseInt(val, 10);
      else if (type === 'hex') n = parseInt(val, 16);
      else if (type === 'oct') n = parseInt(val, 8);
    } catch { n = NaN; }
    if (!val) { setValues({ bin: '', dec: '', hex: '', oct: '' }); return; }
    if (isNaN(n)) { setValues(p => ({ ...p, [type]: val })); return; }
    setValues({
      bin: n.toString(2),
      dec: n.toString(10),
      hex: n.toString(16).toUpperCase(),
      oct: n.toString(8),
      _n: n,
    });
  };

  const ascii = values._n >= 32 && values._n <= 126 ? String.fromCharCode(values._n) : null;

  const field = (label, key, placeholder) => (
    <div>
      <label className="text-sm font-medium text-surface-300 block mb-1">{label}</label>
      <input value={values[key] || ''} onChange={e => update(key, e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-lg" />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('Binary', 'bin', '1010')}
          {field('Decimal', 'dec', '10')}
          {field('Hexadecimal', 'hex', 'A')}
          {field('Octal', 'oct', '12')}
        </div>
        {ascii && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-3 text-sm">
            <span className="text-primary-400 font-medium">ASCII character: </span>
            <span className="font-mono text-2xl text-blue-700 dark:text-blue-300 ml-2">{ascii}</span>
          </div>
        )}
        <div>
          <div className="text-sm font-medium text-surface-300 mb-2">Quick Reference (0–15)</div>
          <div className="overflow-auto">
            <table className="w-full text-xs font-mono border-collapse">
              <thead>
                <tr className="text-surface-400 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <th className="py-1 pr-3 text-left">Dec</th>
                  <th className="py-1 pr-3 text-left">Hex</th>
                  <th className="py-1 pr-3 text-left">Binary</th>
                  <th className="py-1 text-left">Oct</th>
                </tr>
              </thead>
              <tbody>
                {QUICK_REF.map(r => (
                  <tr key={r.dec} className="border-b hover:bg-white/5 cursor-pointer" style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                    onClick={() => update('dec', String(r.dec))}>
                    <td className="py-0.5 pr-3 text-surface-300">{r.dec}</td>
                    <td className="py-0.5 pr-3 text-primary-400">{r.hex}</td>
                    <td className="py-0.5 pr-3 text-green-600 dark:text-green-400">{r.bin}</td>
                    <td className="py-0.5 text-orange-600 dark:text-orange-400">{r.oct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
