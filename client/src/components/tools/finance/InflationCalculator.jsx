import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

const CURRENCIES = [
  { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' }, { code: 'GBP', symbol: '£' },
  { code: 'INR', symbol: '₹' }, { code: 'AUD', symbol: 'A$' }, { code: 'CAD', symbol: 'C$' },
  { code: 'JPY', symbol: '¥' }, { code: 'SGD', symbol: 'S$' },
];

function fmt(val, symbol) {
  return `${symbol}${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const cardStyle = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };

const CustomTooltip = ({ active, payload, label, sym }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(28,28,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
      <p className="font-bold text-surface-100 mb-1">Year {label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmt(p.value, sym)}</p>
      ))}
    </div>
  );
};

export default function InflationCalculator() {
  const [amount, setAmount] = useState('');
  const [inflationRate, setInflationRate] = useState('6');
  const [years, setYears] = useState('');
  const [direction, setDirection] = useState('future');
  const [currency, setCurrency] = useState('USD');
  const [tableOpen, setTableOpen] = useState(false);

  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '$';
  const A = Number(amount) || 0;
  const r = (Number(inflationRate) || 0) / 100;
  const n = Number(years) || 0;

  let resultValue = 0, purchasingPowerChange = 0;
  if (A > 0 && n > 0) {
    if (direction === 'future') {
      resultValue = A * Math.pow(1 + r, n);
      purchasingPowerChange = ((resultValue - A) / A) * 100;
    } else {
      resultValue = A / Math.pow(1 + r, n);
      purchasingPowerChange = ((resultValue - A) / A) * 100;
    }
  }

  const yearlyData = [];
  if (A > 0 && n > 0) {
    for (let y = 0; y <= Math.min(n, 30); y++) {
      const val = direction === 'future'
        ? A * Math.pow(1 + r, y)
        : A / Math.pow(1 + r, y);
      yearlyData.push({ year: y, value: val, purchasingPower: A / Math.pow(1 + r, y) });
    }
  }

  const chartData = yearlyData.map(d => ({
    year: d.year,
    'Purchasing Power': d.purchasingPower,
    ...(direction === 'future' ? { 'Nominal Value': d.value } : { 'Real Value': d.value }),
  }));

  const handleExport = () => {
    let report = '=== Inflation Calculator Report ===\n\n';
    report += `Currency: ${currency}\nInitial Amount: ${fmt(A, sym)}\nInflation Rate: ${inflationRate}%\nYears: ${n}\nDirection: ${direction}\n\n`;
    report += `--- Results ---\n${direction === 'future' ? 'Future' : 'Past'} Value: ${fmt(resultValue, sym)}\nChange: ${Math.abs(purchasingPowerChange).toFixed(1)}%\n\n`;
    report += `--- Year-by-Year ---\n`;
    yearlyData.filter(d => d.year > 0).forEach(d => {
      report += `Year ${d.year}: ${fmt(d.value, sym)} (${(((d.value - A) / A) * 100).toFixed(1)}%)\n`;
    });
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'inflation-calculator-report.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <div>
          <label className="text-sm font-medium text-surface-300 block mb-2">Direction</label>
          <div className="flex rounded-xl overflow-hidden w-fit" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            {[{ value: 'future', label: 'Future Value' }, { value: 'past', label: 'Past Value' }].map(d => (
              <button key={d.value} onClick={() => setDirection(d.value)}
                className={`px-5 py-2 text-sm font-medium transition-colors ${direction === d.value ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`}
                style={direction === d.value ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                {d.label}
              </button>
            ))}
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
            <label className="text-sm font-medium text-surface-300 block mb-1">Initial Amount</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1000"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Annual Inflation Rate (%)</label>
            <input type="number" value={inflationRate} onChange={e => setInflationRate(e.target.value)} placeholder="6"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Number of Years</label>
            <input type="number" value={years} onChange={e => setYears(e.target.value)} placeholder="e.g. 10"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>
      </div>

      {resultValue > 0 && (
        <>
          <div className="flex justify-end">
            <button onClick={handleExport}
              className="px-4 py-2 rounded-xl text-sm font-medium text-surface-300 hover:text-surface-100 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              📄 Export
            </button>
          </div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: direction === 'future' ? 'Future Value' : 'Past Value', value: fmt(resultValue, sym), highlight: true },
              { label: 'Initial Amount', value: fmt(A, sym) },
              { label: direction === 'future' ? 'Purchasing Power Loss' : 'Real Value Gain', value: `${Math.abs(purchasingPowerChange).toFixed(1)}%`, color: direction === 'future' ? 'text-xl text-red-400' : 'text-xl text-green-400' },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
                <p className="text-sm text-surface-400 mb-1">{item.label}</p>
                <p className={`font-bold ${item.color || (item.highlight ? 'text-2xl text-primary-400' : 'text-xl text-surface-200')}`}>{item.value}</p>
              </div>
            ))}
          </motion.div>

          {/* Line Chart */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="rounded-2xl p-6" style={cardStyle}>
            <h3 className="text-lg font-semibold text-surface-100 mb-4">Purchasing Power Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="year" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickFormatter={v => v >= 10000000 ? `${(v / 10000000).toFixed(1)}Cr` : v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip content={<CustomTooltip sym={sym} />} />
                <Line type="monotone" dataKey="Purchasing Power" stroke="#FF6363" strokeWidth={2} dot={false} />
                {direction === 'future' && <Line type="monotone" dataKey="Nominal Value" stroke="#22C55E" strokeWidth={2} dot={false} strokeDasharray="5 5" />}
                {direction !== 'future' && <Line type="monotone" dataKey="Real Value" stroke="#3B82F6" strokeWidth={2} dot={false} />}
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Collapsible Table */}
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <button onClick={() => setTableOpen(v => !v)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors">
              <h3 className="text-lg font-semibold text-surface-100">Year-by-Year Table</h3>
              <motion.span animate={{ rotate: tableOpen ? 180 : 0 }} transition={{ duration: 0.2 }}
                className="text-surface-400 text-xl">▾</motion.span>
            </button>
            <AnimatePresence>
              {tableOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="px-6 pb-6">
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0" style={{ background: 'rgba(44,44,46,0.95)' }}>
                          <tr className="text-surface-400 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                            <th className="text-left py-2 pr-4">Year</th>
                            <th className="text-right py-2 pr-4">Value</th>
                            <th className="text-right py-2">Change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {yearlyData.filter(d => d.year > 0).map(row => (
                            <tr key={row.year} className="border-b hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                              <td className="py-2 pr-4 text-surface-300">{row.year}</td>
                              <td className="py-2 pr-4 text-right text-primary-400 font-medium">{fmt(row.value, sym)}</td>
                              <td className={`py-2 text-right ${direction === 'future' ? 'text-red-400' : 'text-green-400'}`}>
                                {direction === 'future' ? '+' : ''}{(((row.value - A) / A) * 100).toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </motion.div>
  );
}
