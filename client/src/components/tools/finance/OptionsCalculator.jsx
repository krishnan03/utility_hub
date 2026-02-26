import { useState } from 'react';
import { motion } from 'framer-motion';

const CURRENCIES = [
  { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' }, { code: 'GBP', symbol: '£' },
  { code: 'INR', symbol: '₹' }, { code: 'AUD', symbol: 'A$' }, { code: 'CAD', symbol: 'C$' },
  { code: 'JPY', symbol: '¥' }, { code: 'SGD', symbol: 'S$' },
];

function fmt(val, symbol) {
  const abs = Math.abs(val);
  const str = `${symbol}${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return val < 0 ? `-${str}` : str;
}

function calcPnL(type, position, strike, premium, price, contracts) {
  const multiplier = contracts * 100;
  let pnl = 0;
  if (type === 'call') {
    const intrinsic = Math.max(0, price - strike);
    pnl = position === 'long' ? (intrinsic - premium) * multiplier : (premium - intrinsic) * multiplier;
  } else {
    const intrinsic = Math.max(0, strike - price);
    pnl = position === 'long' ? (intrinsic - premium) * multiplier : (premium - intrinsic) * multiplier;
  }
  return pnl;
}

export default function OptionsCalculator() {
  const [optType, setOptType] = useState('call');
  const [position, setPosition] = useState('long');
  const [strike, setStrike] = useState('');
  const [premium, setPremium] = useState('');
  const [expiry, setExpiry] = useState('');
  const [contracts, setContracts] = useState('1');
  const [currency, setCurrency] = useState('USD');

  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '$';
  const S = Number(strike) || 0;
  const P = Number(premium) || 0;
  const E = Number(expiry) || 0;
  const C = Number(contracts) || 1;
  const multiplier = C * 100;

  let pnl = 0, breakEven = 0, maxGain = '', maxLoss = '';
  if (S > 0 && P > 0 && E > 0) {
    pnl = calcPnL(optType, position, S, P, E, C);
    if (optType === 'call') {
      breakEven = S + P;
      if (position === 'long') { maxGain = 'Unlimited'; maxLoss = fmt(-P * multiplier, sym); }
      else { maxGain = fmt(P * multiplier, sym); maxLoss = 'Unlimited'; }
    } else {
      breakEven = S - P;
      if (position === 'long') { maxGain = fmt((S - P) * multiplier, sym); maxLoss = fmt(-P * multiplier, sym); }
      else { maxGain = fmt(P * multiplier, sym); maxLoss = fmt(-(S - P) * multiplier, sym); }
    }
  }

  const priceRange = S > 0 ? Array.from({ length: 9 }, (_, i) => {
    const pct = (i - 4) * 5;
    const price = S * (1 + pct / 100);
    return { pct, price, pnl: calcPnL(optType, position, S, P, price, C) };
  }) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>

        <div className="flex flex-wrap gap-3">
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Option Type</label>
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              {['call', 'put'].map(t => (
                <button key={t} onClick={() => setOptType(t)}
                  className={`px-5 py-2 text-sm font-medium capitalize transition-colors ${optType === t ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`}
                  style={optType === t ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Position</label>
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              {['long', 'short'].map(p => (
                <button key={p} onClick={() => setPosition(p)}
                  className={`px-5 py-2 text-sm font-medium capitalize transition-colors ${position === p ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`}
                  style={position === p ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Strike Price</label>
            <input type="number" value={strike} onChange={e => setStrike(e.target.value)} placeholder="e.g. 150"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Premium Paid (per share)</label>
            <input type="number" value={premium} onChange={e => setPremium(e.target.value)} placeholder="e.g. 5"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Underlying Price at Expiry</label>
            <input type="number" value={expiry} onChange={e => setExpiry(e.target.value)} placeholder="e.g. 160"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Number of Contracts</label>
            <input type="number" value={contracts} onChange={e => setContracts(e.target.value)} placeholder="1"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>
      </div>

      {S > 0 && P > 0 && E > 0 && (
        <>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'P&L', value: fmt(pnl, sym), color: pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400' },
              { label: 'Break-even', value: `${sym}${breakEven.toFixed(2)}` },
              { label: 'Max Gain', value: maxGain },
              { label: 'Max Loss', value: maxLoss },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
                <p className="text-sm text-surface-400 mb-1">{item.label}</p>
                <p className={`text-xl font-bold ${item.color || 'text-surface-200'}`}>{item.value}</p>
              </div>
            ))}
          </motion.div>

          <div className="rounded-2xl p-6" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-lg font-semibold text-surface-100 mb-4">P&L at Different Prices (±20%)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-surface-400 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <th className="text-left py-2 pr-4">Price Change</th>
                    <th className="text-right py-2 pr-4">Underlying Price</th>
                    <th className="text-right py-2">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {priceRange.map(row => (
                    <tr key={row.pct} className="border-b hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      <td className="py-2 pr-4 text-surface-300">{row.pct > 0 ? '+' : ''}{row.pct}%</td>
                      <td className="py-2 pr-4 text-right text-surface-300">{sym}{row.price.toFixed(2)}</td>
                      <td className={`py-2 text-right font-medium ${row.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{fmt(row.pnl, sym)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
