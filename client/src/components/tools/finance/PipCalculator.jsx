import { useState } from 'react';
import { motion } from 'framer-motion';

const PAIRS = [
  { pair: 'EUR/USD', pipSize: 0.0001, quote: 'USD' },
  { pair: 'GBP/USD', pipSize: 0.0001, quote: 'USD' },
  { pair: 'AUD/USD', pipSize: 0.0001, quote: 'USD' },
  { pair: 'NZD/USD', pipSize: 0.0001, quote: 'USD' },
  { pair: 'USD/JPY', pipSize: 0.01, quote: 'JPY' },
  { pair: 'USD/CHF', pipSize: 0.0001, quote: 'CHF' },
  { pair: 'USD/CAD', pipSize: 0.0001, quote: 'CAD' },
  { pair: 'EUR/GBP', pipSize: 0.0001, quote: 'GBP' },
  { pair: 'EUR/JPY', pipSize: 0.01, quote: 'JPY' },
  { pair: 'GBP/JPY', pipSize: 0.01, quote: 'JPY' },
];

const LOT_SIZES = [
  { label: 'Standard (100k)', value: 100000 },
  { label: 'Mini (10k)', value: 10000 },
  { label: 'Micro (1k)', value: 1000 },
];

const ACCOUNT_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'];

// Approximate exchange rates to USD for pip value conversion
const TO_USD = { USD: 1, EUR: 1.08, GBP: 1.27, JPY: 0.0067, AUD: 0.65, CAD: 0.74, CHF: 1.12, NZD: 0.61 };

export default function PipCalculator() {
  const [selectedPair, setSelectedPair] = useState('EUR/USD');
  const [accountCurrency, setAccountCurrency] = useState('USD');
  const [lotType, setLotType] = useState(100000);
  const [customLot, setCustomLot] = useState('');
  const [useCustomLot, setUseCustomLot] = useState(false);
  const [pips, setPips] = useState('');

  const pairInfo = PAIRS.find(p => p.pair === selectedPair) || PAIRS[0];
  const lotSize = useCustomLot ? (Number(customLot) || 0) : lotType;
  const pipsNum = Number(pips) || 0;

  const pipValueInQuote = pairInfo.pipSize * lotSize;
  const quoteToUSD = TO_USD[pairInfo.quote] || 1;
  const pipValueUSD = pipValueInQuote * quoteToUSD;
  const acctToUSD = TO_USD[accountCurrency] || 1;
  const pipValueAccount = pipValueUSD / acctToUSD;
  const totalPipValue = pipValueAccount * pipsNum;
  const positionValue = lotSize * (pairInfo.quote === 'USD' ? 1 : quoteToUSD);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-xs text-orange-300 rounded-lg px-3 py-2">
          ⚠️ Uses approximate exchange rates. Use live rates for actual trading decisions.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Currency Pair</label>
            <select value={selectedPair} onChange={e => setSelectedPair(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {PAIRS.map(p => <option key={p.pair} value={p.pair}>{p.pair}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Account Currency</label>
            <select value={accountCurrency} onChange={e => setAccountCurrency(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {ACCOUNT_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-2">Lot Size</label>
            <div className="flex flex-wrap gap-2">
              {LOT_SIZES.map(l => (
                <button key={l.value} onClick={() => { setLotType(l.value); setUseCustomLot(false); }}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${!useCustomLot && lotType === l.value ? 'text-white' : ' text-surface-300 hover:bg-white/5'}`}>
                  {l.label}
                </button>
              ))}
              <input type="number" value={customLot} onChange={e => { setCustomLot(e.target.value); setUseCustomLot(true); }}
                placeholder="Custom"
                className={`w-24 px-3 py-2 rounded-xl border text-xs transition-all ${useCustomLot ? 'border-primary-500 ring-2 ring-primary-500/40' : ''} text-surface-100 focus:outline-none`} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Number of Pips</label>
            <input type="number" value={pips} onChange={e => setPips(e.target.value)} placeholder="e.g. 50"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}/>
          </div>
        </div>
      </div>

      {lotSize > 0 && (
        <>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: `Pip Value (${accountCurrency})`, value: `${accountCurrency === 'JPY' ? '¥' : '$'}${pipValueAccount.toFixed(4)}`, highlight: true },
              { label: pipsNum > 0 ? `${pipsNum} Pips Value` : 'Position Value', value: pipsNum > 0 ? `${accountCurrency === 'JPY' ? '¥' : '$'}${totalPipValue.toFixed(2)}` : `$${positionValue.toFixed(0)}` },
              { label: 'Pip Size', value: pairInfo.pipSize.toString() },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
                <p className="text-sm text-surface-400 mb-1">{item.label}</p>
                <p className={`font-bold font-mono ${item.highlight ? 'text-2xl text-primary-400' : 'text-xl text-surface-200'}`}>{item.value}</p>
              </div>
            ))}
          </motion.div>

          <div className="rounded-2xl p-6" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-lg font-semibold text-surface-100 mb-4">Common Pairs Reference (Standard Lot, USD account)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-surface-400 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <th className="text-left py-2 pr-4">Pair</th>
                    <th className="text-right py-2 pr-4">Pip Size</th>
                    <th className="text-right py-2">Pip Value (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {PAIRS.map(p => {
                    const pv = p.pipSize * 100000 * (TO_USD[p.quote] || 1);
                    return (
                      <tr key={p.pair} className={`border-b hover:bg-white/5 ${p.pair === selectedPair ? 'bg-primary-500/5' : ''}`}>
                        <td className="py-2 pr-4 font-mono text-surface-300">{p.pair}</td>
                        <td className="py-2 pr-4 text-right font-mono text-surface-400">{p.pipSize}</td>
                        <td className="py-2 text-right font-mono text-primary-400">≈${pv.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
