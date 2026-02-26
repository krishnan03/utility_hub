import { useState } from 'react';
import { motion } from 'framer-motion';

const ROMAN_MAP = [
  [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],
  [50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I'],
];

function toRoman(n) {
  if (n < 1 || n > 3999) return '';
  let result = '';
  for (const [val, sym] of ROMAN_MAP) {
    while (n >= val) { result += sym; n -= val; }
  }
  return result;
}

function fromRoman(s) {
  const map = { I:1, V:5, X:10, L:50, C:100, D:500, M:1000 };
  const str = s.toUpperCase().trim();
  if (!/^[IVXLCDM]+$/.test(str)) return NaN;
  let total = 0;
  for (let i = 0; i < str.length; i++) {
    const cur = map[str[i]], next = map[str[i+1]];
    if (next && cur < next) total -= cur;
    else total += cur;
  }
  if (toRoman(total) !== str) return NaN;
  return total;
}

const TABLE = [['I',1],['V',5],['X',10],['L',50],['C',100],['D',500],['M',1000]];

export default function RomanNumeralConverter() {
  const [decimal, setDecimal] = useState('');
  const [roman, setRoman] = useState('');
  const [error, setError] = useState('');

  const onDecimalChange = (v) => {
    setDecimal(v);
    setError('');
    const n = parseInt(v, 10);
    if (!v) { setRoman(''); return; }
    if (isNaN(n) || n < 1 || n > 3999) { setRoman(''); setError('Enter a number between 1 and 3999'); return; }
    setRoman(toRoman(n));
  };

  const onRomanChange = (v) => {
    setRoman(v.toUpperCase());
    setError('');
    if (!v) { setDecimal(''); return; }
    const n = fromRoman(v);
    if (isNaN(n)) { setDecimal(''); setError('Invalid Roman numeral'); return; }
    setDecimal(String(n));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Decimal (1–3999)</label>
            <input type="number" value={decimal} onChange={e => onDecimalChange(e.target.value)} placeholder="e.g. 2024"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div className="flex items-center justify-center text-2xl text-surface-500 hidden sm:flex">⇄</div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Roman Numeral</label>
            <input value={roman} onChange={e => onRomanChange(e.target.value)} placeholder="e.g. MMXXIV"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono uppercase"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      <div className="rounded-2xl p-6" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="text-sm font-semibold text-surface-300 mb-3">Reference Table</h3>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {TABLE.map(([sym, val]) => (
            <div key={sym} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="text-lg font-bold font-mono text-primary-400">{sym}</div>
              <div className="text-xs text-surface-400">{val}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
