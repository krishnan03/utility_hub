import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip,
} from 'recharts';

const CURRENCIES = [
  { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' }, { code: 'GBP', symbol: '£' },
  { code: 'INR', symbol: '₹' }, { code: 'AUD', symbol: 'A$' }, { code: 'CAD', symbol: 'C$' },
  { code: 'JPY', symbol: '¥' }, { code: 'SGD', symbol: 'S$' },
];

const PIE_COLORS = ['#22C55E', '#FF6363', '#FF9F43', '#3B82F6'];

function fmt(val, symbol) {
  return `${symbol}${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(28,28,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
      <p className="font-bold text-surface-100 mb-1">{payload[0]?.name}</p>
      <p style={{ color: payload[0]?.payload?.fill }}>{payload[0]?.value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const cardStyle = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };

export default function RentalYieldCalculator() {
  const [propertyValue, setPropertyValue] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [annualExpenses, setAnnualExpenses] = useState('');
  const [vacancyRate, setVacancyRate] = useState('5');
  const [currency, setCurrency] = useState('USD');
  const [tableOpen, setTableOpen] = useState(false);

  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '$';
  const PV = Number(propertyValue) || 0;
  const MR = Number(monthlyRent) || 0;
  const AE = Number(annualExpenses) || 0;
  const VR = (Number(vacancyRate) || 0) / 100;

  const annualRent = MR * 12;
  const effectiveRent = annualRent * (1 - VR);
  const grossYield = PV > 0 ? (annualRent / PV) * 100 : 0;
  const netYield = PV > 0 ? ((effectiveRent - AE) / PV) * 100 : 0;
  const annualCashFlow = effectiveRent - AE;
  const monthlyCashFlow = annualCashFlow / 12;
  const cashOnCash = PV > 0 ? (annualCashFlow / PV) * 100 : 0;

  const hasResult = PV > 0 && MR > 0;

  const pieData = hasResult ? [
    { name: 'Net Income', value: Math.max(0, annualCashFlow) },
    { name: 'Vacancy Loss', value: annualRent * VR },
    { name: 'Expenses', value: AE },
  ].filter(d => d.value > 0) : [];

  const handleExport = () => {
    let report = '=== Rental Yield Calculator Report ===\n\n';
    report += `Currency: ${currency}\nProperty Value: ${fmt(PV, sym)}\nMonthly Rent: ${fmt(MR, sym)}\nAnnual Expenses: ${fmt(AE, sym)}\nVacancy Rate: ${vacancyRate}%\n\n`;
    report += `--- Results ---\nGross Yield: ${grossYield.toFixed(2)}%\nNet Yield: ${netYield.toFixed(2)}%\nCash-on-Cash: ${cashOnCash.toFixed(2)}%\n`;
    report += `Annual Cash Flow: ${fmt(annualCashFlow, sym)}\nMonthly Cash Flow: ${fmt(monthlyCashFlow, sym)}\nEffective Annual Rent: ${fmt(effectiveRent, sym)}\n`;
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'rental-yield-report.txt'; a.click();
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
            <label className="text-sm font-medium text-surface-300 block mb-1">Property Value</label>
            <input type="number" value={propertyValue} onChange={e => setPropertyValue(e.target.value)} placeholder="e.g. 300000"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Monthly Rent</label>
            <input type="number" value={monthlyRent} onChange={e => setMonthlyRent(e.target.value)} placeholder="e.g. 1500"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Annual Expenses (maintenance, insurance, taxes)</label>
            <input type="number" value={annualExpenses} onChange={e => setAnnualExpenses(e.target.value)} placeholder="e.g. 3000"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Vacancy Rate (%)</label>
            <input type="number" value={vacancyRate} onChange={e => setVacancyRate(e.target.value)} placeholder="e.g. 5"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>
      </div>

      {hasResult && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
          <div className="flex justify-end">
            <button onClick={handleExport}
              className="px-4 py-2 rounded-xl text-sm font-medium text-surface-300 hover:text-surface-100 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              📄 Export
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Gross Yield', value: `${grossYield.toFixed(2)}%`, highlight: true },
              { label: 'Net Yield', value: `${netYield.toFixed(2)}%`, highlight: true },
              { label: 'Cash-on-Cash Return', value: `${cashOnCash.toFixed(2)}%` },
              { label: 'Annual Cash Flow', value: fmt(annualCashFlow, sym) },
              { label: 'Monthly Cash Flow', value: fmt(monthlyCashFlow, sym) },
              { label: 'Effective Annual Rent', value: fmt(effectiveRent, sym) },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
                <p className="text-sm text-surface-400 mb-1">{item.label}</p>
                <p className={`font-bold ${item.highlight ? 'text-2xl text-primary-400' : 'text-xl text-surface-200'}`}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Pie Chart */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="rounded-2xl p-6" style={cardStyle}>
            <h3 className="text-lg font-semibold text-surface-100 mb-4">Rental Income vs Expenses</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={4}
                  dataKey="value" labelLine={false} label={PieLabel}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" iconType="circle"
                  formatter={(value) => <span className="text-xs text-surface-300">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Collapsible Breakdown */}
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <button onClick={() => setTableOpen(v => !v)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors">
              <h3 className="text-lg font-semibold text-surface-100">Expense Breakdown</h3>
              <motion.span animate={{ rotate: tableOpen ? 180 : 0 }} transition={{ duration: 0.2 }}
                className="text-surface-400 text-xl">▾</motion.span>
            </button>
            <AnimatePresence>
              {tableOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="px-6 pb-6 space-y-3">
                    {[
                      { label: 'Gross Annual Rent', value: annualRent, color: 'bg-green-500' },
                      { label: `Vacancy Loss (${vacancyRate}%)`, value: -(annualRent * VR), color: 'bg-red-400' },
                      { label: 'Annual Expenses', value: -AE, color: 'bg-orange-400' },
                      { label: 'Net Cash Flow', value: annualCashFlow, color: 'bg-blue-500' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${item.color}`} />
                          <span className="text-sm text-surface-300">{item.label}</span>
                        </div>
                        <span className={`text-sm font-medium ${item.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.value >= 0 ? fmt(item.value, sym) : `-${fmt(Math.abs(item.value), sym)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
