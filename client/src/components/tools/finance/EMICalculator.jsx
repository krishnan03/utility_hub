import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts';

const CURRENCIES = [
  { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' }, { code: 'GBP', symbol: '£' },
  { code: 'INR', symbol: '₹' }, { code: 'AUD', symbol: 'A$' }, { code: 'CAD', symbol: 'C$' },
  { code: 'JPY', symbol: '¥' }, { code: 'SGD', symbol: 'S$' },
];

const PIE_COLORS = ['#22C55E', '#FF6363'];

function fmt(val, symbol) {
  return `${symbol}${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtShort(val) {
  if (val >= 10000000) return `${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `${(val / 100000).toFixed(1)}L`;
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
  return val.toFixed(0);
}

function computeAmortization(P, r, n, emiVal) {
  const schedule = [];
  let balance = P;
  for (let i = 1; i <= n; i++) {
    const interest = balance * r;
    const principalPart = emiVal - interest;
    balance -= principalPart;
    schedule.push({ month: i, emi: emiVal, principal: principalPart, interest, balance: Math.max(0, balance) });
  }
  return schedule;
}

function computePrepaymentSchedule(P, r, emiVal, extraMonthly) {
  const schedule = [];
  let balance = P;
  let month = 0;
  while (balance > 0.01) {
    month++;
    const interest = balance * r;
    const totalPayment = Math.min(emiVal + extraMonthly, balance + interest);
    const principalPart = totalPayment - interest;
    balance -= principalPart;
    schedule.push({ month, emi: totalPayment, principal: principalPart, interest, balance: Math.max(0, balance) });
    if (month > 600) break; // safety cap at 50 years
  }
  return schedule;
}

const cardStyle = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };
const inputCls = "w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40";
const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' };

const CustomTooltip = ({ active, payload, label, sym }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(28,28,30,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <p className="font-bold text-surface-100 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmt(p.value, sym)}</p>
      ))}
    </div>
  );
};

const BalanceTooltip = ({ active, payload, label, sym }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(28,28,30,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <p className="font-bold text-surface-100 mb-1">{label}</p>
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

export default function EMICalculator() {
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [tenure, setTenure] = useState('');
  const [tenureUnit, setTenureUnit] = useState('months');
  const [currency, setCurrency] = useState('USD');
  const [extraPayment, setExtraPayment] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'yearly'

  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '$';
  const months = tenureUnit === 'years' ? Number(tenure) * 12 : Number(tenure);
  const r = Number(rate) / 100 / 12;
  const P = Number(principal);
  const n = months;

  let emi = 0, totalPayment = 0, totalInterest = 0;
  if (P > 0 && r > 0 && n > 0) {
    emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    totalPayment = emi * n;
    totalInterest = totalPayment - P;
  } else if (P > 0 && r === 0 && n > 0) {
    emi = P / n;
    totalPayment = P;
    totalInterest = 0;
  }

  const amortization = useMemo(() => {
    if (emi > 0 && n > 0) return computeAmortization(P, r, n, emi);
    return [];
  }, [P, r, n, emi]);

  // Prepayment calculations
  const extraMonthly = Number(extraPayment) || 0;
  const prepaySchedule = useMemo(() => {
    if (emi > 0 && extraMonthly > 0 && P > 0 && r >= 0) {
      return computePrepaymentSchedule(P, r, emi, extraMonthly);
    }
    return [];
  }, [P, r, emi, extraMonthly]);

  const prepayTotalInterest = prepaySchedule.reduce((sum, row) => sum + row.interest, 0);
  const interestSaved = totalInterest - prepayTotalInterest;
  const monthsSaved = n - prepaySchedule.length;

  // Chart data: stacked area (principal vs interest per month)
  const areaChartData = useMemo(() => {
    if (amortization.length === 0) return [];
    const useYears = n > 60;
    if (useYears) {
      const yearMap = {};
      amortization.forEach(row => {
        const yr = Math.ceil(row.month / 12);
        if (!yearMap[yr]) yearMap[yr] = { label: `Year ${yr}`, Principal: 0, Interest: 0 };
        yearMap[yr].Principal += row.principal;
        yearMap[yr].Interest += row.interest;
      });
      return Object.values(yearMap);
    }
    return amortization.map(row => ({
      label: `M${row.month}`,
      Principal: row.principal,
      Interest: row.interest,
    }));
  }, [amortization, n]);

  // Pie data
  const pieData = totalPayment > 0 ? [
    { name: 'Principal', value: P },
    { name: 'Total Interest', value: totalInterest },
  ] : [];

  // Balance decline chart data
  const balanceChartData = useMemo(() => {
    if (amortization.length === 0) return [];
    const useYears = n > 60;
    if (useYears) {
      return amortization
        .filter(row => row.month % 12 === 0 || row.month === 1 || row.month === n)
        .map(row => ({ label: row.month === 1 ? 'M1' : `Year ${Math.ceil(row.month / 12)}`, Balance: row.balance }));
    }
    return amortization.map(row => ({ label: `M${row.month}`, Balance: row.balance }));
  }, [amortization, n]);

  // Yearly summary for amortization table
  const yearlySummary = useMemo(() => {
    const map = {};
    amortization.forEach(row => {
      const yr = Math.ceil(row.month / 12);
      if (!map[yr]) map[yr] = { year: yr, principal: 0, interest: 0, emi: 0, endBalance: 0 };
      map[yr].principal += row.principal;
      map[yr].interest += row.interest;
      map[yr].emi += row.emi;
      map[yr].endBalance = row.balance;
    });
    return Object.values(map);
  }, [amortization]);

  // Export report
  const handleExport = () => {
    let report = '=== EMI Calculator Report ===\n\n';
    report += `Currency: ${currency}\n`;
    report += `Loan Amount: ${fmt(P, sym)}\n`;
    report += `Annual Interest Rate: ${rate}%\n`;
    report += `Tenure: ${tenure} ${tenureUnit} (${n} months)\n\n`;
    report += `--- Results ---\n`;
    report += `Monthly EMI: ${fmt(emi, sym)}\n`;
    report += `Total Interest: ${fmt(totalInterest, sym)}\n`;
    report += `Total Payment: ${fmt(totalPayment, sym)}\n\n`;
    if (extraMonthly > 0 && prepaySchedule.length > 0) {
      report += `--- Prepayment Analysis ---\n`;
      report += `Extra Monthly Payment: ${fmt(extraMonthly, sym)}\n`;
      report += `New Tenure: ${prepaySchedule.length} months (saved ${monthsSaved} months)\n`;
      report += `Interest Saved: ${fmt(interestSaved, sym)}\n`;
      report += `New Total Interest: ${fmt(prepayTotalInterest, sym)}\n\n`;
    }
    report += `--- Amortization Schedule ---\n`;
    report += `${'Month'.padEnd(8)}${'EMI'.padStart(16)}${'Principal'.padStart(16)}${'Interest'.padStart(16)}${'Balance'.padStart(16)}\n`;
    amortization.forEach(d => {
      report += `${String(d.month).padEnd(8)}${fmt(d.emi, sym).padStart(16)}${fmt(d.principal, sym).padStart(16)}${fmt(d.interest, sym).padStart(16)}${fmt(d.balance, sym).padStart(16)}\n`;
    });
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'emi-report.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">

      {/* Input Form */}
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className={inputCls} style={inputStyle}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Principal Amount</label>
            <input type="number" value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="e.g. 500000"
              className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Annual Interest Rate (%)</label>
            <input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="e.g. 8.5"
              className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Loan Tenure</label>
            <div className="flex gap-2">
              <input type="number" value={tenure} onChange={e => setTenure(e.target.value)} placeholder="e.g. 24"
                className={`flex-1 px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40`} style={inputStyle} />
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                {['months', 'years'].map(u => (
                  <button key={u} onClick={() => setTenureUnit(u)}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${tenureUnit === u ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`}
                    style={tenureUnit === u ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards + Export */}
      {emi > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
          <div className="flex justify-end">
            <button onClick={handleExport}
              className="px-4 py-2 rounded-xl text-sm font-medium text-surface-300 hover:text-surface-100 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              📄 Export Report
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Monthly EMI', value: fmt(emi, sym), highlight: true },
              { label: 'Total Interest', value: fmt(totalInterest, sym) },
              { label: 'Total Payment', value: fmt(totalPayment, sym) },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
                <p className="text-sm text-surface-400 mb-1">{item.label}</p>
                <p className={`font-bold ${item.highlight ? 'text-2xl text-primary-400' : 'text-xl text-surface-200'}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Charts Section */}
      {amortization.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">

          {/* Stacked Area Chart + Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl p-6" style={cardStyle}>
              <h3 className="text-lg font-semibold text-surface-100 mb-4">Principal vs Interest Breakdown</h3>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradPrincipal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gradInterest" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6363" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#FF6363" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    interval={Math.max(0, Math.floor(areaChartData.length / 12) - 1)} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickFormatter={fmtShort} />
                  <Tooltip content={<CustomTooltip sym={sym} />} />
                  <Area type="monotone" dataKey="Principal" stackId="1" stroke="#22C55E" fill="url(#gradPrincipal)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Interest" stackId="1" stroke="#FF6363" fill="url(#gradInterest)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Donut Pie Chart */}
            <div className="rounded-2xl p-6 flex flex-col items-center justify-center" style={cardStyle}>
              <h3 className="text-lg font-semibold text-surface-100 mb-2">Payment Split</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4}
                    dataKey="value" labelLine={false} label={PieLabel}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Legend verticalAlign="bottom" iconType="circle"
                    formatter={(value) => <span className="text-xs text-surface-300">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center mt-2 space-y-1">
                <p className="text-xs text-surface-400">Principal: <span className="text-green-400 font-semibold">{fmt(P, sym)}</span></p>
                <p className="text-xs text-surface-400">Interest: <span className="text-red-400 font-semibold">{fmt(totalInterest, sym)}</span></p>
              </div>
            </div>
          </div>

          {/* Balance Decline Line Chart */}
          <div className="rounded-2xl p-6" style={cardStyle}>
            <h3 className="text-lg font-semibold text-surface-100 mb-4">Balance Over Time</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={balanceChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  interval={Math.max(0, Math.floor(balanceChartData.length / 12) - 1)} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickFormatter={fmtShort} />
                <Tooltip content={<BalanceTooltip sym={sym} />} />
                <Line type="monotone" dataKey="Balance" stroke="#8B5CF6" strokeWidth={2.5} dot={false}
                  fill="url(#gradBalance)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Prepayment Analysis */}
      {emi > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <h3 className="text-lg font-semibold text-surface-100">💰 Prepayment Analysis</h3>
          <p className="text-sm text-surface-400">See how extra monthly payments can reduce your loan tenure and total interest.</p>
          <div className="max-w-sm">
            <label className="text-sm font-medium text-surface-300 block mb-1">Extra Monthly Payment</label>
            <input type="number" value={extraPayment} onChange={e => setExtraPayment(e.target.value)} placeholder="e.g. 5000"
              className={inputCls} style={inputStyle} />
          </div>

          {extraMonthly > 0 && prepaySchedule.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Without Prepayment</p>
                <div className="space-y-2">
                  <p className="text-sm text-surface-300">Tenure: <span className="font-bold text-surface-100">{n} months</span></p>
                  <p className="text-sm text-surface-300">Total Interest: <span className="font-bold text-red-400">{fmt(totalInterest, sym)}</span></p>
                  <p className="text-sm text-surface-300">Total Payment: <span className="font-bold text-surface-100">{fmt(totalPayment, sym)}</span></p>
                </div>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-3">With Prepayment</p>
                <div className="space-y-2">
                  <p className="text-sm text-surface-300">Tenure: <span className="font-bold text-green-400">{prepaySchedule.length} months</span></p>
                  <p className="text-sm text-surface-300">Total Interest: <span className="font-bold text-green-400">{fmt(prepayTotalInterest, sym)}</span></p>
                  <p className="text-sm text-surface-300">Total Payment: <span className="font-bold text-surface-100">{fmt(P + prepayTotalInterest, sym)}</span></p>
                </div>
              </div>
              <div className="md:col-span-2 rounded-xl p-4" style={{ background: 'rgba(255,159,67,0.06)', border: '1px solid rgba(255,159,67,0.2)' }}>
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-xs text-surface-400 mb-1">Time Saved</p>
                    <p className="text-xl font-bold text-primary-400">{monthsSaved} months {monthsSaved >= 12 && <span className="text-sm font-normal text-surface-400">({(monthsSaved / 12).toFixed(1)} years)</span>}</p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-400 mb-1">Interest Saved</p>
                    <p className="text-xl font-bold text-green-400">{fmt(interestSaved, sym)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Collapsible Amortization Schedule */}
      {amortization.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <button onClick={() => setScheduleOpen(v => !v)}
            className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors">
            <h3 className="text-lg font-semibold text-surface-100">Amortization Schedule</h3>
            <motion.span animate={{ rotate: scheduleOpen ? 180 : 0 }} transition={{ duration: 0.2 }}
              className="text-surface-400 text-xl">▾</motion.span>
          </button>
          <AnimatePresence>
            {scheduleOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="px-6 pb-6 space-y-4">
                  {/* View mode toggle */}
                  <div className="flex rounded-xl overflow-hidden w-fit" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                    {[{ label: 'Monthly', value: 'monthly' }, { label: 'Yearly Summary', value: 'yearly' }].map(opt => (
                      <button key={opt.value} onClick={() => setViewMode(opt.value)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === opt.value ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`}
                        style={viewMode === opt.value ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="overflow-x-auto">
                    {viewMode === 'monthly' ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-surface-400 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                            <th className="text-left py-2 pr-4">Month</th>
                            <th className="text-right py-2 pr-4">EMI</th>
                            <th className="text-right py-2 pr-4">Principal</th>
                            <th className="text-right py-2 pr-4">Interest</th>
                            <th className="text-right py-2">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {amortization.map(row => (
                            <tr key={row.month} className="border-b hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                              <td className="py-2 pr-4 text-surface-300">{row.month}</td>
                              <td className="py-2 pr-4 text-right text-surface-300 font-mono">{fmt(row.emi, sym)}</td>
                              <td className="py-2 pr-4 text-right text-green-400 font-mono">{fmt(row.principal, sym)}</td>
                              <td className="py-2 pr-4 text-right text-red-400 font-mono">{fmt(row.interest, sym)}</td>
                              <td className="py-2 text-right text-surface-300 font-mono">{fmt(row.balance, sym)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-surface-400 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                            <th className="text-left py-2 pr-4">Year</th>
                            <th className="text-right py-2 pr-4">Total EMI</th>
                            <th className="text-right py-2 pr-4">Principal Paid</th>
                            <th className="text-right py-2 pr-4">Interest Paid</th>
                            <th className="text-right py-2">End Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {yearlySummary.map(row => (
                            <tr key={row.year} className="border-b hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                              <td className="py-2 pr-4 text-surface-300">{row.year}</td>
                              <td className="py-2 pr-4 text-right text-surface-300 font-mono">{fmt(row.emi, sym)}</td>
                              <td className="py-2 pr-4 text-right text-green-400 font-mono">{fmt(row.principal, sym)}</td>
                              <td className="py-2 pr-4 text-right text-red-400 font-mono">{fmt(row.interest, sym)}</td>
                              <td className="py-2 text-right text-surface-300 font-mono">{fmt(row.endBalance, sym)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

    </motion.div>
  );
}
