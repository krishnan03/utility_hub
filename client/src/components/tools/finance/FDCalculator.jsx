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

const COMPOUND_OPTIONS = [
  { label: 'Simple', value: 'simple' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Annually', value: 'annually' },
];

const PIE_COLORS = ['#3B82F6', '#22C55E'];

function fmt(val, symbol) {
  return `${symbol}${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CustomTooltip = ({ active, payload, label, sym }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(28,28,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
      <p className="font-bold text-surface-100 mb-1">Quarter {label}</p>
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
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

const cardStyle = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };

export default function FDCalculator() {
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [tenure, setTenure] = useState('');
  const [compounding, setCompounding] = useState('quarterly');
  const [currency, setCurrency] = useState('INR');
  const [tableOpen, setTableOpen] = useState(false);

  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '₹';
  const P = Number(principal) || 0;
  const r = (Number(rate) || 0) / 100;
  const months = Number(tenure) || 0;
  const years = months / 12;

  let maturity = 0, interest = 0, ear = 0;
  if (P > 0 && r > 0 && months > 0) {
    if (compounding === 'simple') {
      interest = P * r * years;
      maturity = P + interest;
      ear = r;
    } else {
      const n = compounding === 'monthly' ? 12 : compounding === 'quarterly' ? 4 : 1;
      maturity = P * Math.pow(1 + r / n, n * years);
      interest = maturity - P;
      ear = Math.pow(1 + r / n, n) - 1;
    }
  }

  const quarterlyBreakdown = [];
  if (P > 0 && r > 0 && months > 0) {
    const n = compounding === 'simple' ? 1 : compounding === 'monthly' ? 12 : compounding === 'quarterly' ? 4 : 1;
    const quarters = Math.min(4, Math.ceil(months / 3));
    for (let q = 1; q <= quarters; q++) {
      let qEnd;
      if (compounding === 'simple') {
        qEnd = P + P * r * (q * 3 / 12);
      } else {
        qEnd = P * Math.pow(1 + r / n, n * (q * 3 / 12));
      }
      quarterlyBreakdown.push({ quarter: q, balance: qEnd, interest: qEnd - P });
    }
  }

  // Growth chart data (monthly)
  const growthData = [];
  if (P > 0 && r > 0 && months > 0) {
    const n = compounding === 'simple' ? 1 : compounding === 'monthly' ? 12 : compounding === 'quarterly' ? 4 : 1;
    const step = Math.max(1, Math.floor(months / 12));
    for (let m = step; m <= months; m += step) {
      let val;
      if (compounding === 'simple') {
        val = P + P * r * (m / 12);
      } else {
        val = P * Math.pow(1 + r / n, n * (m / 12));
      }
      growthData.push({ month: m, balance: val, principal: P, interest: val - P });
    }
  }

  const pieData = maturity > 0 ? [
    { name: 'Principal', value: P },
    { name: 'Interest', value: interest },
  ] : [];

  const handleExport = () => {
    let report = '=== FD Calculator Report ===\n\n';
    report += `Currency: ${currency}\n`;
    report += `Principal: ${fmt(P, sym)}\n`;
    report += `Rate: ${rate}%\n`;
    report += `Tenure: ${tenure} months\n`;
    report += `Compounding: ${compounding}\n\n`;
    report += `--- Results ---\n`;
    report += `Maturity Amount: ${fmt(maturity, sym)}\n`;
    report += `Interest Earned: ${fmt(interest, sym)}\n`;
    report += `Effective Annual Rate: ${(ear * 100).toFixed(2)}%\n\n`;
    if (quarterlyBreakdown.length > 0) {
      report += `--- Quarterly Breakdown ---\n`;
      quarterlyBreakdown.forEach(row => {
        report += `Q${row.quarter}: Balance ${fmt(row.balance, sym)}, Interest ${fmt(row.interest, sym)}\n`;
      });
    }
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'fd-calculator-report.txt'; a.click();
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
            <label className="text-sm font-medium text-surface-300 block mb-1">Principal Amount</label>
            <input type="number" value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="e.g. 100000"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Annual Interest Rate (%)</label>
            <input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="e.g. 7.5"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Tenure (months)</label>
            <input type="number" value={tenure} onChange={e => setTenure(e.target.value)} placeholder="e.g. 12"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-surface-300 block mb-2">Compounding</label>
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              {COMPOUND_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setCompounding(opt.value)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${compounding === opt.value ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`}
                  style={compounding === opt.value ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {maturity > 0 && (
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
              { label: 'Maturity Amount', value: fmt(maturity, sym), highlight: true },
              { label: 'Interest Earned', value: fmt(interest, sym) },
              { label: 'Effective Annual Rate', value: `${(ear * 100).toFixed(2)}%` },
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
              <h3 className="text-lg font-semibold text-surface-100 mb-4">FD Growth Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={growthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradFdBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6363" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#FF6363" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gradFdPrincipal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} label={{ value: 'Month', position: 'insideBottom', offset: -2, fill: '#9CA3AF', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickFormatter={v => v >= 10000000 ? `${(v / 10000000).toFixed(1)}Cr` : v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                  <Tooltip content={<CustomTooltip sym={sym} />} />
                  <Area type="monotone" dataKey="balance" stroke="#FF6363" fill="url(#gradFdBalance)" strokeWidth={2} name="Balance" />
                  <Area type="monotone" dataKey="principal" stroke="#3B82F6" fill="url(#gradFdPrincipal)" strokeWidth={2} name="Principal" />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-2xl p-6 flex flex-col items-center justify-center" style={cardStyle}>
              <h3 className="text-lg font-semibold text-surface-100 mb-2">Principal vs Interest</h3>
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
          {quarterlyBreakdown.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
              <button onClick={() => setTableOpen(v => !v)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors">
                <h3 className="text-lg font-semibold text-surface-100">First Year Quarterly Breakdown</h3>
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
                              <th className="text-left py-2 pr-4">Quarter</th>
                              <th className="text-right py-2 pr-4">Balance</th>
                              <th className="text-right py-2">Interest Accrued</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quarterlyBreakdown.map(row => (
                              <tr key={row.quarter} className="border-b hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                <td className="py-2 pr-4 text-surface-300">Q{row.quarter}</td>
                                <td className="py-2 pr-4 text-right text-primary-400 font-medium">{fmt(row.balance, sym)}</td>
                                <td className="py-2 text-right text-green-400">{fmt(row.interest, sym)}</td>
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
          )}
        </>
      )}
    </motion.div>
  );
}
