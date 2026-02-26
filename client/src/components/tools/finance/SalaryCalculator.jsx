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

const PIE_COLORS = ['#22C55E', '#3B82F6', '#A855F7', '#FF6363', '#FF9F43', '#F59E0B', '#6B7280'];

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

function calcIndiaTax(taxable, regime) {
  if (regime === 'new') {
    const slabs = [[300000, 0], [300000, 0.05], [300000, 0.10], [300000, 0.15], [300000, 0.20], [Infinity, 0.30]];
    let tax = 0, rem = Math.max(0, taxable - 300000);
    for (const [limit, rate] of slabs.slice(1)) {
      const chunk = Math.min(rem, limit);
      tax += chunk * rate;
      rem -= chunk;
      if (rem <= 0) break;
    }
    return tax;
  } else {
    const slabs = [[250000, 0], [250000, 0.05], [500000, 0.20], [Infinity, 0.30]];
    let tax = 0, rem = Math.max(0, taxable - 250000);
    for (const [limit, rate] of slabs.slice(1)) {
      const chunk = Math.min(rem, limit);
      tax += chunk * rate;
      rem -= chunk;
      if (rem <= 0) break;
    }
    return tax;
  }
}

export default function SalaryCalculator() {
  const [ctc, setCtc] = useState('');
  const [pfPct, setPfPct] = useState('12');
  const [profTax, setProfTax] = useState('200');
  const [otherDed, setOtherDed] = useState('');
  const [regime, setRegime] = useState('new');
  const [currency, setCurrency] = useState('INR');
  const [tableOpen, setTableOpen] = useState(false);

  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '₹';
  const CTC = Number(ctc) || 0;
  const PF_PCT = (Number(pfPct) || 0) / 100;
  const PROF_TAX_MONTHLY = Number(profTax) || 0;
  const OTHER_DED = Number(otherDed) || 0;

  const basic = CTC * 0.4;
  const hra = CTC * 0.2;
  const special = CTC * 0.4;
  const grossSalary = CTC;

  const pfMonthly = (basic / 12) * PF_PCT;
  const pfAnnual = pfMonthly * 12;
  const profTaxAnnual = PROF_TAX_MONTHLY * 12;

  const standardDed = regime === 'old' ? 50000 : 75000;
  const taxableIncome = Math.max(0, grossSalary - pfAnnual - standardDed - OTHER_DED);
  const incomeTax = calcIndiaTax(taxableIncome, regime);
  const cess = incomeTax * 0.04;
  const totalTax = incomeTax + cess;

  const totalDeductions = pfAnnual + profTaxAnnual + totalTax + OTHER_DED;
  const takeHomeAnnual = grossSalary - totalDeductions;
  const takeHomeMonthly = takeHomeAnnual / 12;

  const rows = [
    { label: 'Basic Salary', annual: basic, monthly: basic / 12, type: 'earning' },
    { label: 'HRA', annual: hra, monthly: hra / 12, type: 'earning' },
    { label: 'Special Allowance', annual: special, monthly: special / 12, type: 'earning' },
    { label: 'Provident Fund', annual: pfAnnual, monthly: pfMonthly, type: 'deduction' },
    { label: 'Professional Tax', annual: profTaxAnnual, monthly: PROF_TAX_MONTHLY, type: 'deduction' },
    { label: 'Income Tax + Cess', annual: totalTax, monthly: totalTax / 12, type: 'deduction' },
    { label: 'Other Deductions', annual: OTHER_DED, monthly: OTHER_DED / 12, type: 'deduction' },
  ];

  const pieData = CTC > 0 ? [
    { name: 'Basic', value: basic },
    { name: 'HRA', value: hra },
    { name: 'Special Allowance', value: special - totalDeductions > 0 ? special - totalDeductions : 0 },
    { name: 'PF', value: pfAnnual },
    { name: 'Tax', value: totalTax },
    { name: 'Prof. Tax', value: profTaxAnnual },
    ...(OTHER_DED > 0 ? [{ name: 'Other Ded.', value: OTHER_DED }] : []),
  ].filter(d => d.value > 0) : [];

  const handleExport = () => {
    let report = '=== Salary Calculator Report ===\n\n';
    report += `Currency: ${currency}\nAnnual CTC: ${fmt(CTC, sym)}\nTax Regime: ${regime}\n\n`;
    report += `--- Results ---\nMonthly Take-Home: ${fmt(takeHomeMonthly, sym)}\nAnnual Take-Home: ${fmt(takeHomeAnnual, sym)}\nTotal Deductions: ${fmt(totalDeductions, sym)}\n\n`;
    report += `--- Breakdown ---\n`;
    report += `${'Component'.padEnd(22)}${'Monthly'.padStart(16)}${'Annual'.padStart(16)}\n`;
    rows.forEach(r => {
      report += `${r.label.padEnd(22)}${fmt(r.monthly, sym).padStart(16)}${fmt(r.annual, sym).padStart(16)}\n`;
    });
    report += `${'Net Take-Home'.padEnd(22)}${fmt(takeHomeMonthly, sym).padStart(16)}${fmt(takeHomeAnnual, sym).padStart(16)}\n`;
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'salary-calculator-report.txt'; a.click();
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
            <label className="text-sm font-medium text-surface-300 block mb-1">Annual CTC</label>
            <input type="number" value={ctc} onChange={e => setCtc(e.target.value)} placeholder="e.g. 1200000"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">PF Contribution (%)</label>
            <input type="number" value={pfPct} onChange={e => setPfPct(e.target.value)} placeholder="12"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Professional Tax (monthly)</label>
            <input type="number" value={profTax} onChange={e => setProfTax(e.target.value)} placeholder="200"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Other Annual Deductions</label>
            <input type="number" value={otherDed} onChange={e => setOtherDed(e.target.value)} placeholder="0"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Tax Regime</label>
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              {[{ value: 'new', label: 'New Regime' }, { value: 'old', label: 'Old Regime' }].map(r => (
                <button key={r.value} onClick={() => setRegime(r.value)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${regime === r.value ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`}
                  style={regime === r.value ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {CTC > 0 && (
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
              { label: 'Monthly Take-Home', value: fmt(takeHomeMonthly, sym), highlight: true },
              { label: 'Annual Take-Home', value: fmt(takeHomeAnnual, sym) },
              { label: 'Total Deductions', value: fmt(totalDeductions, sym) },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
                <p className="text-sm text-surface-400 mb-1">{item.label}</p>
                <p className={`font-bold ${item.highlight ? 'text-2xl text-primary-400' : 'text-xl text-surface-200'}`}>{item.value}</p>
              </div>
            ))}
          </motion.div>

          {/* Pie Chart */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="rounded-2xl p-6" style={cardStyle}>
            <h3 className="text-lg font-semibold text-surface-100 mb-4">Salary Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}
                  dataKey="value" labelLine={false} label={PieLabel}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" iconType="circle"
                  formatter={(value) => <span className="text-xs text-surface-300">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Collapsible Table */}
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <button onClick={() => setTableOpen(v => !v)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors">
              <h3 className="text-lg font-semibold text-surface-100">Detailed Breakdown</h3>
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
                            <th className="text-left py-2 pr-4">Component</th>
                            <th className="text-right py-2 pr-4">Monthly</th>
                            <th className="text-right py-2">Annual</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(row => (
                            <tr key={row.label} className="border-b hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                              <td className="py-2 pr-4 flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${row.type === 'earning' ? 'bg-green-500' : 'bg-red-400'}`} />
                                <span className="text-surface-300">{row.label}</span>
                              </td>
                              <td className={`py-2 pr-4 text-right ${row.type === 'earning' ? 'text-green-400' : 'text-red-400'}`}>{fmt(row.monthly, sym)}</td>
                              <td className={`py-2 text-right ${row.type === 'earning' ? 'text-green-400' : 'text-red-400'}`}>{fmt(row.annual, sym)}</td>
                            </tr>
                          ))}
                          <tr className="font-semibold border-t-2 border-white/20">
                            <td className="py-2 pr-4 text-surface-100">Net Take-Home</td>
                            <td className="py-2 pr-4 text-right text-primary-400">{fmt(takeHomeMonthly, sym)}</td>
                            <td className="py-2 text-right text-primary-400">{fmt(takeHomeAnnual, sym)}</td>
                          </tr>
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
