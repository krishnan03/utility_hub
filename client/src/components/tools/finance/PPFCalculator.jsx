import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const PIE_COLORS = ['#3B82F6', '#22C55E'];

function fmt(val) {
  return `₹${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(28,28,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
      <p className="font-bold text-surface-100 mb-1">Year {label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
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

export default function PPFCalculator() {
  const [annualContrib, setAnnualContrib] = useState('');
  const [ppfRate, setPpfRate] = useState('7.1');
  const [period, setPeriod] = useState('15');
  const [tableOpen, setTableOpen] = useState(false);

  const P = Number(annualContrib) || 0;
  const r = (Number(ppfRate) || 7.1) / 100;
  const years = Math.min(50, Math.max(15, Number(period) || 15));

  const yearlyData = [];
  let balance = 0, totalInvested = 0;

  for (let y = 1; y <= years; y++) {
    balance = (balance + P) * (1 + r);
    totalInvested += P;
    yearlyData.push({ year: y, invested: totalInvested, balance, interest: balance - totalInvested });
  }

  const totalInterest = balance - totalInvested;

  const chartData = yearlyData.map(d => ({
    year: d.year, Invested: d.invested, Returns: d.interest,
  }));

  const pieData = balance > 0 ? [
    { name: 'Invested', value: totalInvested },
    { name: 'Interest', value: totalInterest },
  ] : [];

  const handleExport = () => {
    let report = '=== PPF Calculator Report ===\n\n';
    report += `Annual Contribution: ${fmt(P)}\n`;
    report += `PPF Rate: ${ppfRate}%\n`;
    report += `Period: ${period} years\n\n`;
    report += `--- Results ---\n`;
    report += `Maturity Amount: ${fmt(balance)}\n`;
    report += `Total Invested: ${fmt(totalInvested)}\n`;
    report += `Total Interest: ${fmt(totalInterest)}\n\n`;
    report += `--- Year-by-Year ---\n`;
    report += `${'Year'.padEnd(6)}${'Invested'.padStart(16)}${'Balance'.padStart(16)}${'Interest'.padStart(16)}\n`;
    yearlyData.forEach(d => {
      report += `${String(d.year).padEnd(6)}${fmt(d.invested).padStart(16)}${fmt(d.balance).padStart(16)}${fmt(d.interest).padStart(16)}\n`;
    });
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ppf-calculator-report.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-surface-400 mt-1">Public Provident Fund — India</p>
          </div>
          <span className="text-xs bg-green-900/30 text-green-400 px-3 py-1 rounded-full font-medium">Tax-Free</span>
        </div>

        <div className="p-3 rounded-xl" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
          <p className="text-xs text-primary-400">💡 PPF interest is tax-free under Section 80C. Contributions up to ₹1.5L/year are deductible.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Annual Contribution (₹)</label>
            <input type="number" value={annualContrib} onChange={e => setAnnualContrib(e.target.value)} placeholder="e.g. 150000"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            <p className="text-xs text-surface-500 mt-1">Max: ₹1,50,000/year</p>
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Current PPF Rate (%)</label>
            <input type="number" value={ppfRate} onChange={e => setPpfRate(e.target.value)} step="0.1" placeholder="7.1"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Investment Period (years)</label>
            <input type="number" value={period} onChange={e => setPeriod(e.target.value)} min="15" max="50" placeholder="15"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            <p className="text-xs text-surface-500 mt-1">Min 15 years, extendable in 5-year blocks</p>
          </div>
        </div>
      </div>

      {balance > 0 && (
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
              { label: 'Maturity Amount', value: fmt(balance), highlight: true },
              { label: 'Total Invested', value: fmt(totalInvested) },
              { label: 'Total Interest', value: fmt(totalInterest) },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
                <p className="text-sm text-surface-400 mb-1">{item.label}</p>
                <p className={`font-bold ${item.highlight ? 'text-2xl text-primary-400' : 'text-xl text-surface-100'}`}>{item.value}</p>
              </div>
            ))}
          </motion.div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="lg:col-span-2 rounded-2xl p-6" style={cardStyle}>
              <h3 className="text-lg font-semibold text-surface-100 mb-4">PPF Growth Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradPpfInvested" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gradPpfReturns" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="year" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickFormatter={v => v >= 10000000 ? `${(v / 10000000).toFixed(1)}Cr` : v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="Invested" stackId="1" stroke="#3B82F6" fill="url(#gradPpfInvested)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Returns" stackId="1" stroke="#22C55E" fill="url(#gradPpfReturns)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-2xl p-6 flex flex-col items-center justify-center" style={cardStyle}>
              <h3 className="text-lg font-semibold text-surface-100 mb-2">Invested vs Interest</h3>
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
              <h3 className="text-lg font-semibold text-surface-100">Year-by-Year Table</h3>
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
                            <th className="text-right py-2 pr-4">Invested</th>
                            <th className="text-right py-2 pr-4">Balance</th>
                            <th className="text-right py-2">Interest</th>
                          </tr>
                        </thead>
                        <tbody>
                          {yearlyData.map(row => (
                            <tr key={row.year} className="border-b hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                              <td className="py-2 pr-4 text-surface-300">{row.year}</td>
                              <td className="py-2 pr-4 text-right text-surface-300">{fmt(row.invested)}</td>
                              <td className="py-2 pr-4 text-right text-primary-400 font-medium">{fmt(row.balance)}</td>
                              <td className="py-2 text-right text-green-400">{fmt(row.interest)}</td>
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
