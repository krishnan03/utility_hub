import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const CURRENCIES = [
  { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' }, { code: 'GBP', symbol: '£' },
  { code: 'INR', symbol: '₹' }, { code: 'AUD', symbol: 'A$' }, { code: 'CAD', symbol: 'C$' },
  { code: 'JPY', symbol: '¥' }, { code: 'SGD', symbol: 'S$' },
];

const PIE_COLORS = ['#3B82F6', '#22C55E', '#FF9F43'];

function fmt(val, symbol) {
  return `${symbol}${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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

const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.03) return null;
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

const cardStyle = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };

export default function DividendCalculator() {
  const [stockPrice, setStockPrice] = useState('');
  const [annualDividend, setAnnualDividend] = useState('');
  const [shares, setShares] = useState('');
  const [growthRate, setGrowthRate] = useState('');
  const [projectionYears, setProjectionYears] = useState('5');
  const [currency, setCurrency] = useState('USD');
  const [tableOpen, setTableOpen] = useState(false);

  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '$';
  const SP = Number(stockPrice) || 0;
  const AD = Number(annualDividend) || 0;
  const N = Number(shares) || 0;
  const GR = (Number(growthRate) || 0) / 100;
  const PY = Math.min(30, Math.max(1, Number(projectionYears) || 5));

  const dividendYield = SP > 0 ? (AD / SP) * 100 : 0;
  const annualIncome = AD * N;
  const monthlyIncome = annualIncome / 12;

  const yearlyData = [];
  if (AD > 0 && N > 0) {
    let cumulative = 0;
    for (let y = 1; y <= PY; y++) {
      const divPerShare = AD * Math.pow(1 + GR, y - 1);
      const income = divPerShare * N;
      cumulative += income;
      yearlyData.push({ year: y, divPerShare, income, cumulative });
    }
  }

  const fiveYearTotal = yearlyData.slice(0, 5).reduce((s, d) => s + d.income, 0);

  const chartData = yearlyData.map(d => ({
    year: d.year, 'Annual Income': d.income, 'Cumulative': d.cumulative,
  }));

  const investmentValue = SP * N;
  const pieData = annualIncome > 0 && investmentValue > 0 ? [
    { name: 'Investment Value', value: investmentValue },
    { name: 'Annual Dividend', value: annualIncome },
  ] : [];

  const handleExport = () => {
    let report = '=== Dividend Calculator Report ===\n\n';
    report += `Currency: ${currency}\nStock Price: ${fmt(SP, sym)}\nAnnual Dividend/Share: ${fmt(AD, sym)}\nShares: ${N}\n`;
    report += `Growth Rate: ${growthRate || 0}%\nProjection: ${PY} years\n\n`;
    report += `--- Results ---\nDividend Yield: ${dividendYield.toFixed(2)}%\nAnnual Income: ${fmt(annualIncome, sym)}\nMonthly Income: ${fmt(monthlyIncome, sym)}\n5-Year Total: ${fmt(fiveYearTotal, sym)}\n\n`;
    report += `--- Projection ---\n`;
    yearlyData.forEach(d => {
      report += `Year ${d.year}: Div/Share ${fmt(d.divPerShare, sym)}, Income ${fmt(d.income, sym)}, Cumulative ${fmt(d.cumulative, sym)}\n`;
    });
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'dividend-calculator-report.txt'; a.click();
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
            <label className="text-sm font-medium text-surface-300 block mb-1">Stock Price</label>
            <input type="number" value={stockPrice} onChange={e => setStockPrice(e.target.value)} placeholder="e.g. 150"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Annual Dividend per Share</label>
            <input type="number" value={annualDividend} onChange={e => setAnnualDividend(e.target.value)} placeholder="e.g. 4.50"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Number of Shares</label>
            <input type="number" value={shares} onChange={e => setShares(e.target.value)} placeholder="e.g. 100"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Dividend Growth Rate (% / year)</label>
            <input type="number" value={growthRate} onChange={e => setGrowthRate(e.target.value)} placeholder="e.g. 5 (optional)"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Projection Years</label>
            <input type="number" value={projectionYears} onChange={e => setProjectionYears(e.target.value)} placeholder="5"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>
      </div>

      {annualIncome > 0 && (
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
              { label: 'Dividend Yield', value: `${dividendYield.toFixed(2)}%`, highlight: true },
              { label: 'Annual Income', value: fmt(annualIncome, sym) },
              { label: 'Monthly Income', value: fmt(monthlyIncome, sym) },
              { label: '5-Year Total', value: fmt(fiveYearTotal, sym) },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
                <p className="text-sm text-surface-400 mb-1">{item.label}</p>
                <p className={`font-bold ${item.highlight ? 'text-2xl text-primary-400' : 'text-xl text-surface-200'}`}>{item.value}</p>
              </div>
            ))}
          </motion.div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="lg:col-span-2 rounded-2xl p-6" style={cardStyle}>
              <h3 className="text-lg font-semibold text-surface-100 mb-4">Dividend Growth Projection</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradDivIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gradDivCum" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="year" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickFormatter={v => v >= 10000000 ? `${(v / 10000000).toFixed(1)}Cr` : v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                  <Tooltip content={<CustomTooltip sym={sym} />} />
                  <Area type="monotone" dataKey="Cumulative" stroke="#3B82F6" fill="url(#gradDivCum)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Annual Income" stroke="#22C55E" fill="url(#gradDivIncome)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-2xl p-6 flex flex-col items-center justify-center" style={cardStyle}>
              <h3 className="text-lg font-semibold text-surface-100 mb-2">Yield Breakdown</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}
                    dataKey="value" labelLine={false} label={PieLabel}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Legend verticalAlign="bottom" iconType="circle"
                    formatter={(value) => <span className="text-xs text-surface-300">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Collapsible Table */}
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <button onClick={() => setTableOpen(v => !v)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors">
              <h3 className="text-lg font-semibold text-surface-100">Year-by-Year Projection</h3>
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
                            <th className="text-left py-2 pr-4">Year</th>
                            <th className="text-right py-2 pr-4">Div/Share</th>
                            <th className="text-right py-2 pr-4">Annual Income</th>
                            <th className="text-right py-2">Cumulative</th>
                          </tr>
                        </thead>
                        <tbody>
                          {yearlyData.map(row => (
                            <tr key={row.year} className="border-b hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                              <td className="py-2 pr-4 text-surface-300">{row.year}</td>
                              <td className="py-2 pr-4 text-right font-mono text-surface-300">{fmt(row.divPerShare, sym)}</td>
                              <td className="py-2 pr-4 text-right text-green-400 font-medium">{fmt(row.income, sym)}</td>
                              <td className="py-2 text-right text-primary-400">{fmt(row.cumulative, sym)}</td>
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
