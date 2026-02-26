import { useState } from 'react';
import { motion } from 'framer-motion';

// Hardcoded approximate rates in USD — for illustration only
const RATES_USD = {
  BTC: 67000, ETH: 3500, BNB: 580, SOL: 175, USDT: 1,
  USD: 1, EUR: 1.08, GBP: 1.27, INR: 0.012, AUD: 0.65,
  CAD: 0.74, JPY: 0.0067, SGD: 0.74,
};

const CURRENCIES = [
  { code: 'BTC', name: 'Bitcoin', type: 'crypto' },
  { code: 'ETH', name: 'Ethereum', type: 'crypto' },
  { code: 'BNB', name: 'BNB', type: 'crypto' },
  { code: 'SOL', name: 'Solana', type: 'crypto' },
  { code: 'USDT', name: 'Tether', type: 'crypto' },
  { code: 'USD', name: 'US Dollar', type: 'fiat' },
  { code: 'EUR', name: 'Euro', type: 'fiat' },
  { code: 'GBP', name: 'British Pound', type: 'fiat' },
  { code: 'INR', name: 'Indian Rupee', type: 'fiat' },
  { code: 'AUD', name: 'Australian Dollar', type: 'fiat' },
  { code: 'CAD', name: 'Canadian Dollar', type: 'fiat' },
  { code: 'JPY', name: 'Japanese Yen', type: 'fiat' },
  { code: 'SGD', name: 'Singapore Dollar', type: 'fiat' },
];

const QUICK_PAIRS = [
  { from: 'BTC', to: 'USD' }, { from: 'ETH', to: 'USD' },
  { from: 'BTC', to: 'EUR' }, { from: 'ETH', to: 'EUR' },
  { from: 'BTC', to: 'INR' }, { from: 'SOL', to: 'USD' },
  { from: 'BNB', to: 'USD' }, { from: 'BTC', to: 'GBP' },
];

function formatAmount(val, code) {
  if (['BTC', 'ETH', 'BNB', 'SOL'].includes(code)) {
    return Number(val).toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 8 });
  }
  if (code === 'JPY' || code === 'INR') {
    return Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function getSymbol(code) {
  const map = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$', CAD: 'C$', JPY: '¥', SGD: 'S$', BTC: '₿', ETH: 'Ξ', BNB: 'BNB ', SOL: 'SOL ', USDT: '₮' };
  return map[code] || code + ' ';
}

export default function CryptoConverter() {
  const [amount, setAmount] = useState('1');
  const [fromCurrency, setFromCurrency] = useState('BTC');
  const [toCurrency, setToCurrency] = useState('USD');

  const amountNum = Number(amount) || 0;
  const fromRate = RATES_USD[fromCurrency] || 1;
  const toRate = RATES_USD[toCurrency] || 1;
  const converted = amountNum * (fromRate / toRate);

  const swap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="p-3 rounded-xl text-orange-300" style={{ background: 'rgba(255,159,67,0.08)', border: '1px solid rgba(255,159,67,0.2)' }}>
          <p className="text-xs">
            ⚠️ Rates are illustrative approximations only. Use a live exchange for actual trading decisions.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Amount</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="1"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-lg" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium text-surface-300 block mb-1">From</label>
              <select value={fromCurrency} onChange={e => setFromCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <optgroup label="Crypto">
                  {CURRENCIES.filter(c => c.type === 'crypto').map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                </optgroup>
                <optgroup label="Fiat">
                  {CURRENCIES.filter(c => c.type === 'fiat').map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                </optgroup>
              </select>
            </div>

            <button onClick={swap}
              className="mt-6 p-2 rounded-xl text-surface-400 hover:bg-white/5 hover:scale-110 transition-all" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)' }}>
              ⇄
            </button>

            <div className="flex-1">
              <label className="text-sm font-medium text-surface-300 block mb-1">To</label>
              <select value={toCurrency} onChange={e => setToCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <optgroup label="Crypto">
                  {CURRENCIES.filter(c => c.type === 'crypto').map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                </optgroup>
                <optgroup label="Fiat">
                  {CURRENCIES.filter(c => c.type === 'fiat').map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                </optgroup>
              </select>
            </div>
          </div>
        </div>
      </div>

      {amountNum > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="rounded-xl p-6" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
            <p className="text-sm text-surface-400 mb-2">
              {formatAmount(amountNum, fromCurrency)} {fromCurrency} =
            </p>
            <p className="text-3xl font-bold text-primary-400 font-mono">
              {getSymbol(toCurrency)}{formatAmount(converted, toCurrency)}
            </p>
            <p className="text-sm text-surface-400 mt-2">
              1 {fromCurrency} ≈ {getSymbol(toCurrency)}{formatAmount(fromRate / toRate, toCurrency)} {toCurrency}
            </p>
          </div>
        </motion.div>
      )}

      <div className="rounded-2xl p-6" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="text-lg font-semibold text-surface-100 mb-4">Quick Reference (approximate)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-surface-400 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <th className="text-left py-2 pr-4">Pair</th>
                <th className="text-right py-2">Rate</th>
              </tr>
            </thead>
            <tbody>
              {QUICK_PAIRS.map(pair => {
                const rate = RATES_USD[pair.from] / RATES_USD[pair.to];
                return (
                  <tr key={`${pair.from}-${pair.to}`}
                    onClick={() => { setFromCurrency(pair.from); setToCurrency(pair.to); }}
                    className="border-b hover:bg-white/5 cursor-pointer" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <td className="py-2 pr-4 font-mono text-surface-300">1 {pair.from} → {pair.to}</td>
                    <td className="py-2 text-right font-mono text-primary-400">
                      {getSymbol(pair.to)}{formatAmount(rate, pair.to)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-surface-500 mt-3">Click any row to select that pair. All rates are static approximations.</p>
      </div>
    </motion.div>
  );
}
