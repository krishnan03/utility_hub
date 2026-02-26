import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceDot,
} from 'recharts';

const CURRENCIES = [
  { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' }, { code: 'GBP', symbol: '£' },
  { code: 'INR', symbol: '₹' }, { code: 'AUD', symbol: 'A$' }, { code: 'CAD', symbol: 'C$' },
  { code: 'JPY', symbol: '¥' }, { code: 'SGD', symbol: 'S$' },
];

function fmt(val, symbol) {
  return `${symbol}${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CustomTooltip = ({ active, payload, label, sym }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(28,28,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
      <p className="font-bold text-surface-100 mb-1">{label} units</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmt(p.value, sym)}</p>
      ))}
    </div>
  );
};

const cardStyle = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };

export default function BreakEvenCalculator() {
  const [fixedCosts, setFixedCosts] = useState('');
  const [variableCost, setVariableCost] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [tableOpen, setTableOpen] = useState(false);

  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '$';
  const FC = Number(fixedCosts) || 0;
  const VC = Number(variableCost) || 0;
  const SP = Number(sellingPrice) || 0;

  const contributionMargin = SP - VC;
  const contributionMarginPct = SP > 0 ? (contributionMargin / SP) * 100 : 0;
  const breakEvenUnits = contributionMargin > 0 ? FC / contributionMargin : 0;
  const breakEvenRevenue = breakEvenUnits * SP;

  const volumeRows = breakEvenUnits > 0
    ? [0, 0.25, 0.5, 0.75, 1, 1.5].map(pct => {
        const units = Math.round(breakEvenUnits * pct);
        const revenue = units * SP;
        const totalCost = FC + units * VC;
        const profitLoss = revenue - totalCost;
        return { label: pct === 0 ? '0 units' : `${pct * 100}% of BE`, units, revenue, totalCost, profitLoss };
      })
    : [];

  // Chart data: units from 0 to 1.5x break-even
  const chartData = [];
  if (breakEvenUnits > 0) {
    const maxUnits = Math.ceil(breakEvenUnits * 1.6);
    const step = Math.max(1, Math.floor(maxUnits / 20));
    for (let u = 0; u <= maxUnits; u += step) {
      chartData.push({
        units: u,
        Revenue: u * SP,
        'Total Cost': FC + u * VC,
      });
    }
  }

  const handleExport = () => {
    let report = '=== Break-Even Calculator Report ===\n\n';
    report += `Currency: ${currency}\nFixed Costs: ${fmt(FC, sym)}\nVariable Cost/Unit: ${fmt(VC, sym)}\nSelling Price/Unit: ${fmt(SP, sym)}\n\n`;
    report += `--- Results ---\nBreak-Even Units: ${Math.ceil(breakEvenUnits)}\nBreak-Even Revenue: ${fmt(breakEvenRevenue, sym)}\nContribution Margin: ${fmt(contributionMargin, sym)}\nMargin %: ${contributionMarginPct.toFixed(1)}%\n\n`;
    report += `--- Volume Analysis ---\n`;
    volumeRows.forEach(r => {
      report += `${r.label}: ${r.units} units, Revenue ${fmt(r.revenue, sym)}, Cost ${fmt(r.totalCost, sym)}, P&L ${fmt(r.profitLoss, sym)}\n`;
    });
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'breakeven-calculator-report.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Fixed Costs</label>
            <input type="number" value={fixedCosts} onChange={e => setFixedCosts(e.target.value)} placeholder="e.g. 10000"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Variable Cost per Unit</label>
            <input type="number" value={variableCost} onChange={e => setVariableCost(e.target.value)} placeholder="e.g. 25"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Selling Price per Unit</label>
            <input type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} placeholder="e.g. 50"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>
      </div>

      {breakEvenUnits > 0 && (
        <>
          <div className="flex justify-end">
            <button onClick={handleExport}
              className="px-4 py-2 rounded-xl text-sm font-medium text-surface-300 hover:text-surface-100 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              📄 Export
            </button>
          </div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Break-Even Units', value: Math.ceil(breakEvenUnits).toLocaleString(), highlight: true },
              { label: 'Break-Even Revenue', value: fmt(breakEvenRevenue, sym) },
              { label: 'Contribution Margin', value: fmt(contributionMargin, sym) },
              { label: 'Margin %', value: `${contributionMarginPct.toFixed(1)}%` },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
                <p className="text-sm text-surface-400 mb-1">{item.label}</p>
                <p className={`font-bold ${item.highlight ? 'text-2xl text-primary-400' : 'text-xl text-surface-200'}`}>{item.value}</p>
              </div>
            ))}
          </motion.div>

          {/* Line Chart */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="rounded-2xl p-6" style={cardStyle}>
            <h3 className="text-lg font-semibold text-surface-100 mb-4">Revenue vs Total Cost</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="units" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  label={{ value: 'Units', position: 'insideBottom', offset: -2, fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip content={<CustomTooltip sym={sym} />} />
                <Line type="monotone" dataKey="Revenue" stroke="#22C55E" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Total Cost" stroke="#FF6363" strokeWidth={2} dot={false} />
                <ReferenceLine x={Math.round(breakEvenUnits)} stroke="#FF9F43" strokeDasharray="5 5" label={{ value: 'Break-Even', fill: '#FF9F43', fontSize: 11, position: 'top' }} />
                <ReferenceDot x={Math.round(breakEvenUnits)} y={breakEvenRevenue} r={6} fill="#FF9F43" stroke="#fff" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Collapsible Table */}
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <button onClick={() => setTableOpen(v => !v)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors">
              <h3 className="text-lg font-semibold text-surface-100">Profit/Loss at Different Volumes</h3>
              <motion.span animate={{ rotate: tableOpen ? 180 : 0 }} transition={{ duration: 0.2 }}
                className="text-surface-400 text-xl">▾</motion.span>
            </button>
            <AnimatePresence>
              {tableOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="px-6 pb-6">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-surface-400 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                            <th className="text-left py-2 pr-4">Volume</th>
                            <th className="text-right py-2 pr-4">Units</th>
                            <th className="text-right py-2 pr-4">Revenue</th>
                            <th className="text-right py-2 pr-4">Total Cost</th>
                            <th className="text-right py-2">P&L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {volumeRows.map(row => (
                            <tr key={row.label} className={`border-b hover:bg-white/5 ${row.units === Math.round(breakEvenUnits) ? 'bg-primary-500/5' : ''}`} style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                              <td className="py-2 pr-4 text-surface-300 font-medium">{row.label}</td>
                              <td className="py-2 pr-4 text-right text-surface-300">{row.units.toLocaleString()}</td>
                              <td className="py-2 pr-4 text-right text-surface-300">{fmt(row.revenue, sym)}</td>
                              <td className="py-2 pr-4 text-right text-surface-300">{fmt(row.totalCost, sym)}</td>
                              <td className={`py-2 text-right font-medium ${row.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {row.profitLoss >= 0 ? '+' : ''}{fmt(row.profitLoss, sym)}
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
