import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

const CURRENCIES = [
  { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' }, { code: 'GBP', symbol: '£' },
  { code: 'INR', symbol: '₹' }, { code: 'AUD', symbol: 'A$' }, { code: 'CAD', symbol: 'C$' },
  { code: 'JPY', symbol: '¥' }, { code: 'SGD', symbol: 'S$' },
];

const BAR_COLORS = ['#FF6363', '#3B82F6', '#22C55E'];

function fmt(val, symbol) {
  return `${symbol}${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CustomTooltip = ({ active, payload, sym }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(28,28,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
      <p className="font-bold text-surface-100 mb-1">{payload[0]?.payload?.name}</p>
      <p style={{ color: payload[0]?.payload?.fill }}>{fmt(payload[0]?.value, sym)}</p>
    </div>
  );
};

const cardStyle = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };

export default function MarginCalculator() {
  const [mode, setMode] = useState('cost-price');
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState('');
  const [margin, setMargin] = useState('');
  const [currency, setCurrency] = useState('USD');

  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '$';
  const C = Number(cost) || 0;
  const P = Number(price) || 0;
  const M = Number(margin) || 0;

  let sellPrice = 0, grossProfit = 0, marginPct = 0, markupPct = 0;

  if (mode === 'cost-price') {
    if (C > 0 && P > 0) {
      sellPrice = P;
      grossProfit = P - C;
      marginPct = (grossProfit / P) * 100;
      markupPct = (grossProfit / C) * 100;
    }
  } else {
    if (C > 0 && M > 0 && M < 100) {
      sellPrice = C / (1 - M / 100);
      grossProfit = sellPrice - C;
      marginPct = M;
      markupPct = (grossProfit / C) * 100;
    }
  }

  const barData = sellPrice > 0 ? [
    { name: 'Cost', value: C, fill: BAR_COLORS[0] },
    { name: 'Revenue', value: sellPrice, fill: BAR_COLORS[1] },
    { name: 'Profit', value: grossProfit, fill: BAR_COLORS[2] },
  ] : [];

  const handleExport = () => {
    let report = '=== Margin Calculator Report ===\n\n';
    report += `Currency: ${currency}\nMode: ${mode}\nCost: ${fmt(C, sym)}\n`;
    report += `Selling Price: ${fmt(sellPrice, sym)}\nGross Profit: ${fmt(grossProfit, sym)}\n`;
    report += `Margin: ${marginPct.toFixed(2)}%\nMarkup: ${markupPct.toFixed(2)}%\n`;
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'margin-calculator-report.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <div>
          <label className="text-sm font-medium text-surface-300 block mb-2">Calculation Mode</label>
          <div className="flex rounded-xl overflow-hidden w-fit" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            {[
              { value: 'cost-price', label: 'Cost + Price' },
              { value: 'cost-margin', label: 'Cost + Margin %' },
            ].map(m => (
              <button key={m.value} onClick={() => setMode(m.value)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${mode === m.value ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`}
                style={mode === m.value ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                {m.label}
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
            <label className="text-sm font-medium text-surface-300 block mb-1">Cost Price</label>
            <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="e.g. 80"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          {mode === 'cost-price' ? (
            <div>
              <label className="text-sm font-medium text-surface-300 block mb-1">Selling Price</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 100"
                className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-surface-300 block mb-1">Desired Margin (%)</label>
              <input type="number" value={margin} onChange={e => setMargin(e.target.value)} placeholder="e.g. 20"
                className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
          )}
        </div>
      </div>

      {sellPrice > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
          <div className="flex justify-end">
            <button onClick={handleExport}
              className="px-4 py-2 rounded-xl text-sm font-medium text-surface-300 hover:text-surface-100 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              📄 Export
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Selling Price', value: fmt(sellPrice, sym), highlight: true },
              { label: 'Gross Profit', value: fmt(grossProfit, sym) },
              { label: 'Profit Margin', value: `${marginPct.toFixed(2)}%` },
              { label: 'Markup %', value: `${markupPct.toFixed(2)}%` },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
                <p className="text-sm text-surface-400 mb-1">{item.label}</p>
                <p className={`font-bold ${item.highlight ? 'text-2xl text-primary-400' : 'text-xl text-surface-200'}`}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Bar Chart */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="rounded-2xl p-6" style={cardStyle}>
            <h3 className="text-lg font-semibold text-surface-100 mb-4">Cost vs Revenue vs Profit</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip content={<CustomTooltip sym={sym} />} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <div className="rounded-2xl p-6" style={cardStyle}>
            <div className="space-y-3">
              {[
                { label: 'Cost Price', value: C, pct: (C / sellPrice) * 100, color: 'bg-red-400' },
                { label: 'Gross Profit', value: grossProfit, pct: marginPct, color: 'bg-green-500' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-surface-300">{item.label}</span>
                    <span className="font-medium text-surface-200">{fmt(item.value, sym)} ({item.pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className={`h-full rounded-full ${item.color} transition-all duration-500`}
                      style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-xl text-sm text-surface-400" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <p><span className="font-medium">Margin</span> = Profit / Revenue × 100 (what % of revenue is profit)</p>
              <p className="mt-1"><span className="font-medium">Markup</span> = Profit / Cost × 100 (how much above cost you charge)</p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
