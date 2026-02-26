import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts';

const CURRENCIES = [
  { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' }, { code: 'GBP', symbol: '£' },
  { code: 'INR', symbol: '₹' }, { code: 'AUD', symbol: 'A$' }, { code: 'CAD', symbol: 'C$' },
  { code: 'JPY', symbol: '¥' }, { code: 'SGD', symbol: 'S$' },
];

const PIE_COLORS = ['#FF6363', '#22C55E'];

function fmt(val, symbol) {
  return `${symbol}${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function computeSIP(P, annualRate, years, stepUpRate) {
  const r = annualRate / 100 / 12;
  const data = [];
  let totalInvested = 0;
  let cumulative = 0;
  let currentMonthly = P;

  if (P > 0 && years > 0) {
    for (let y = 1; y <= years; y++) {
      for (let m = 1; m <= 12; m++) {
        cumulative = (cumulative + currentMonthly) * (1 + r);
        totalInvested += currentMonthly;
      }
      data.push({
        year: y,
        invested: totalInvested,
        value: cumulative,
        returns: cumulative - totalInvested,
        monthlyAmount: currentMonthly,
      });
      if (stepUpRate > 0) currentMonthly *= (1 + stepUpRate / 100);
    }
  }
  return { data, totalInvested, maturityValue: cumulative };
}

function parseParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    monthly: params.get('monthly') || '',
    rate: params.get('rate') || '',
    period: params.get('period') || '',
    stepUp: params.get('stepUp') || '',
    currency: params.get('currency') || 'USD',
    compareEnabled: params.get('compare') === '1',
    monthlyB: params.get('monthlyB') || '',
    rateB: params.get('rateB') || '',
    periodB: params.get('periodB') || '',
    stepUpB: params.get('stepUpB') || '',
    goalMode: params.get('goal') === '1',
    goalTarget: params.get('goalTarget') || '',
    goalYears: params.get('goalYears') || '',
    goalRate: params.get('goalRate') || '',
  };
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
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

const inputCls = "w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40";
const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' };
const cardStyle = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };

function ToggleButton({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${active ? 'text-white shadow-lg' : 'text-surface-300 hover:bg-white/5'}`}
      style={active ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
      {children}
    </button>
  );
}

function InputField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-sm font-medium text-surface-300 block mb-1">{label}</label>
      <input type="number" value={value} onChange={onChange} placeholder={placeholder}
        className={inputCls} style={inputStyle} />
    </div>
  );
}

export default function SIPCalculator() {
  const init = parseParams();
  const [monthly, setMonthly] = useState(init.monthly);
  const [rate, setRate] = useState(init.rate);
  const [period, setPeriod] = useState(init.period);
  const [stepUp, setStepUp] = useState(init.stepUp);
  const [currency, setCurrency] = useState(init.currency);

  // Compare mode
  const [compareEnabled, setCompareEnabled] = useState(init.compareEnabled);
  const [monthlyB, setMonthlyB] = useState(init.monthlyB);
  const [rateB, setRateB] = useState(init.rateB);
  const [periodB, setPeriodB] = useState(init.periodB);
  const [stepUpB, setStepUpB] = useState(init.stepUpB);

  // Goal mode
  const [goalMode, setGoalMode] = useState(init.goalMode);
  const [goalTarget, setGoalTarget] = useState(init.goalTarget);
  const [goalYears, setGoalYears] = useState(init.goalYears);
  const [goalRate, setGoalRate] = useState(init.goalRate);

  const [tableOpen, setTableOpen] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '$';

  // --- Shareable URL sync ---
  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    if (monthly) params.set('monthly', monthly);
    if (rate) params.set('rate', rate);
    if (period) params.set('period', period);
    if (stepUp) params.set('stepUp', stepUp);
    if (currency !== 'USD') params.set('currency', currency);
    if (compareEnabled) {
      params.set('compare', '1');
      if (monthlyB) params.set('monthlyB', monthlyB);
      if (rateB) params.set('rateB', rateB);
      if (periodB) params.set('periodB', periodB);
      if (stepUpB) params.set('stepUpB', stepUpB);
    }
    if (goalMode) {
      params.set('goal', '1');
      if (goalTarget) params.set('goalTarget', goalTarget);
      if (goalYears) params.set('goalYears', goalYears);
      if (goalRate) params.set('goalRate', goalRate);
    }
    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [monthly, rate, period, stepUp, currency, compareEnabled, monthlyB, rateB, periodB, stepUpB, goalMode, goalTarget, goalYears, goalRate]);

  useEffect(() => {
    const timer = setTimeout(updateURL, 150);
    return () => clearTimeout(timer);
  }, [updateURL]);

  // --- Scenario A calculations ---
  const P = Number(monthly) || 0;
  const annualRate = Number(rate) || 0;
  const years = Number(period) || 0;
  const stepUpRate = Number(stepUp) || 0;
  const { data: yearlyData, totalInvested, maturityValue } = computeSIP(P, annualRate, years, stepUpRate);
  const totalReturns = maturityValue - totalInvested;

  // --- Scenario B calculations ---
  const PB = Number(monthlyB) || 0;
  const annualRateB = Number(rateB) || 0;
  const yearsB = Number(periodB) || 0;
  const stepUpRateB = Number(stepUpB) || 0;
  const { data: yearlyDataB, totalInvested: totalInvestedB, maturityValue: maturityValueB } = compareEnabled
    ? computeSIP(PB, annualRateB, yearsB, stepUpRateB)
    : { data: [], totalInvested: 0, maturityValue: 0 };
  const totalReturnsB = maturityValueB - totalInvestedB;

  // --- Wealth multiplier ---
  const wealthMultiplier = totalInvested > 0 ? (maturityValue / totalInvested) : 0;

  // --- Chart data (merged for comparison) ---
  const maxYears = compareEnabled ? Math.max(years, yearsB) : years;
  const chartData = [];
  for (let y = 1; y <= maxYears; y++) {
    const a = yearlyData.find(d => d.year === y);
    const b = yearlyDataB.find(d => d.year === y);
    const entry = { year: y };
    if (!compareEnabled && a) {
      entry['Invested'] = a.invested;
      entry['Returns'] = a.returns;
    }
    if (compareEnabled) {
      if (a) { entry['Invested (A)'] = a.invested; entry['Returns (A)'] = a.returns; }
      if (b) { entry['Invested (B)'] = b.invested; entry['Returns (B)'] = b.returns; }
    }
    chartData.push(entry);
  }

  // --- Pie data ---
  const pieData = maturityValue > 0 ? [
    { name: 'Invested', value: totalInvested },
    { name: 'Returns', value: totalReturns },
  ] : [];

  // --- Step-up bar data ---
  const stepUpData = stepUpRate > 0 ? yearlyData.map(d => ({
    year: `Yr ${d.year}`,
    monthly: Math.round(d.monthlyAmount),
  })) : [];

  // --- Goal mode calculation ---
  let goalResult = null;
  const GT = Number(goalTarget) || 0;
  const GY = Number(goalYears) || 0;
  const GR = (Number(goalRate) || 0) / 100;
  if (goalMode && GT > 0 && GY > 0 && GR > 0) {
    const monthlyRate = GR / 12;
    const n = GY * 12;
    const factor = (Math.pow(1 + monthlyRate, n) - 1) / monthlyRate;
    const requiredSIP = GT / factor;
    goalResult = requiredSIP;
  }

  // --- Share handler ---
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    });
  };

  // --- Export handler ---
  const handleExport = () => {
    let report = '=== SIP Calculator Report ===\n\n';
    report += `Currency: ${currency}\n`;
    report += `Monthly Investment: ${fmt(P, sym)}\n`;
    report += `Expected Annual Return: ${rate}%\n`;
    report += `Investment Period: ${period} years\n`;
    if (stepUpRate > 0) report += `Annual Step-up: ${stepUp}%\n`;
    report += `\n--- Results ---\n`;
    report += `Maturity Value: ${fmt(maturityValue, sym)}\n`;
    report += `Total Invested: ${fmt(totalInvested, sym)}\n`;
    report += `Estimated Returns: ${fmt(totalReturns, sym)}\n`;
    report += `Wealth Multiplier: ${wealthMultiplier.toFixed(2)}x\n\n`;
    report += `--- Year-by-Year ---\n`;
    report += `${'Year'.padEnd(6)}${'Value'.padStart(18)}${'Invested'.padStart(18)}${'Returns'.padStart(18)}${'Monthly SIP'.padStart(16)}\n`;
    yearlyData.forEach(d => {
      report += `${String(d.year).padEnd(6)}${fmt(d.value, sym).padStart(18)}${fmt(d.invested, sym).padStart(18)}${fmt(d.returns, sym).padStart(18)}${fmt(d.monthlyAmount, sym).padStart(16)}\n`;
    });
    if (compareEnabled && yearlyDataB.length > 0) {
      report += `\n--- Scenario B ---\n`;
      report += `Monthly: ${fmt(PB, sym)}, Rate: ${rateB}%, Years: ${periodB}`;
      if (stepUpRateB > 0) report += `, Step-up: ${stepUpB}%`;
      report += `\n`;
      report += `Maturity: ${fmt(maturityValueB, sym)}, Invested: ${fmt(totalInvestedB, sym)}, Returns: ${fmt(totalReturnsB, sym)}\n`;
    }
    if (goalResult !== null) {
      report += `\n--- Goal Mode ---\n`;
      report += `Target: ${fmt(GT, sym)} in ${goalYears} years at ${goalRate}%\n`;
      report += `Required Monthly SIP: ${fmt(goalResult, sym)}\n`;
    }
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sip-calculator-report.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">

      {/* Mode toggles + actions */}
      <div className="flex flex-wrap items-center gap-3">
        <ToggleButton active={compareEnabled} onClick={() => setCompareEnabled(v => !v)}>⚖️ Compare</ToggleButton>
        <ToggleButton active={goalMode} onClick={() => setGoalMode(v => !v)}>🎯 Goal Mode</ToggleButton>
        <div className="flex-1" />
        <button onClick={handleShare}
          className="px-4 py-2 rounded-xl text-sm font-medium text-surface-300 hover:text-surface-100 transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          🔗 Share
        </button>
        {maturityValue > 0 && (
          <button onClick={handleExport}
            className="px-4 py-2 rounded-xl text-sm font-medium text-surface-300 hover:text-surface-100 transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            📄 Export
          </button>
        )}
      </div>

      <AnimatePresence>
        {shareToast && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-xl px-4 py-2 text-sm text-green-300 font-medium"
            style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
            ✅ Link copied to clipboard!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goal Mode Panel */}
      <AnimatePresence>
        {goalMode && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(255,159,67,0.06)', border: '1px solid rgba(255,159,67,0.2)' }}>
            <h3 className="text-lg font-semibold text-surface-100">🎯 Reverse SIP — Goal-Based Calculator</h3>
            <p className="text-sm text-surface-400">How much SIP do I need to reach my target corpus?</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <InputField label="Target Corpus" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} placeholder="e.g. 10000000" />
              <InputField label="Time Horizon (Years)" value={goalYears} onChange={e => setGoalYears(e.target.value)} placeholder="e.g. 15" />
              <InputField label="Expected Annual Return (%)" value={goalRate} onChange={e => setGoalRate(e.target.value)} placeholder="e.g. 12" />
            </div>
            {goalResult !== null && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl p-4 mt-2"
                style={{ background: 'rgba(255,99,99,0.08)', border: '1px solid rgba(255,99,99,0.2)' }}>
                <p className="text-surface-100">
                  To reach <span className="font-bold text-primary-400">{fmt(GT, sym)}</span> in {goalYears} years at {goalRate}% annual return, you need a monthly SIP of{' '}
                  <span className="font-bold text-primary-400">{fmt(goalResult, sym)}</span>.
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input form(s) */}
      <div className={compareEnabled ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : ''}>
        {/* Scenario A */}
        <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
          {compareEnabled && <h3 className="text-sm font-bold text-primary-400 uppercase tracking-wider">Scenario A</h3>}
          {!compareEnabled && <p className="text-sm text-surface-400">Systematic Investment Plan — grow wealth through regular investing</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-surface-300 block mb-1">Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className={inputCls} style={inputStyle}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
              </select>
            </div>
            <InputField label="Monthly Investment" value={monthly} onChange={e => setMonthly(e.target.value)} placeholder="e.g. 5000" />
            <InputField label="Expected Annual Return (%)" value={rate} onChange={e => setRate(e.target.value)} placeholder="e.g. 12" />
            <InputField label="Investment Period (Years)" value={period} onChange={e => setPeriod(e.target.value)} placeholder="e.g. 10" />
            <InputField label="Annual Step-up % (optional)" value={stepUp} onChange={e => setStepUp(e.target.value)} placeholder="e.g. 10" />
          </div>
        </div>

        {/* Scenario B */}
        <AnimatePresence>
          {compareEnabled && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Scenario B</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Monthly Investment" value={monthlyB} onChange={e => setMonthlyB(e.target.value)} placeholder="e.g. 10000" />
                <InputField label="Expected Annual Return (%)" value={rateB} onChange={e => setRateB(e.target.value)} placeholder="e.g. 15" />
                <InputField label="Investment Period (Years)" value={periodB} onChange={e => setPeriodB(e.target.value)} placeholder="e.g. 20" />
                <InputField label="Annual Step-up % (optional)" value={stepUpB} onChange={e => setStepUpB(e.target.value)} placeholder="e.g. 5" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results */}
      {maturityValue > 0 && (
        <>
          {/* Stat cards + Wealth Multiplier */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { label: 'Maturity Value', value: fmt(maturityValue, sym), highlight: true },
              { label: 'Total Invested', value: fmt(totalInvested, sym) },
              { label: 'Estimated Returns', value: fmt(totalReturns, sym) },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
                <p className="text-sm text-surface-400 mb-1">{item.label}</p>
                <p className={`font-bold ${item.highlight ? 'text-2xl text-primary-400' : 'text-xl text-surface-200'}`}>{item.value}</p>
              </div>
            ))}
            {/* Wealth Multiplier */}
            <div className="rounded-xl p-4 flex flex-col items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(255,99,99,0.1), rgba(34,197,94,0.1))', border: '1px solid rgba(34,197,94,0.2)' }}>
              <p className="text-sm text-surface-400 mb-1">Wealth Multiplier</p>
              <p className="text-3xl font-extrabold text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(135deg, #FF6363, #22C55E)' }}>
                {wealthMultiplier.toFixed(2)}x
              </p>
              <p className="text-xs text-surface-500 mt-1">Your money grew {wealthMultiplier.toFixed(1)} times</p>
            </div>
          </motion.div>

          {/* Comparison table */}
          {compareEnabled && maturityValueB > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl p-6" style={cardStyle}>
              <h3 className="text-lg font-semibold text-surface-100 mb-4">Scenario Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-surface-400 border-b border-white/10">
                      <th className="text-left py-2 pr-4">Metric</th>
                      <th className="text-right py-2 px-4 text-primary-400">Scenario A</th>
                      <th className="text-right py-2 pl-4 text-blue-400">Scenario B</th>
                    </tr>
                  </thead>
                  <tbody className="text-surface-200">
                    {[
                      ['Monthly SIP', fmt(P, sym), fmt(PB, sym)],
                      ['Annual Return', `${rate}%`, `${rateB}%`],
                      ['Period', `${period} yrs`, `${periodB} yrs`],
                      ['Maturity Value', fmt(maturityValue, sym), fmt(maturityValueB, sym)],
                      ['Total Invested', fmt(totalInvested, sym), fmt(totalInvestedB, sym)],
                      ['Returns', fmt(totalReturns, sym), fmt(totalReturnsB, sym)],
                      ['Wealth Multiplier', `${wealthMultiplier.toFixed(2)}x`, `${totalInvestedB > 0 ? (maturityValueB / totalInvestedB).toFixed(2) : 0}x`],
                    ].map(([label, a, b]) => (
                      <tr key={label} className="border-b border-white/5">
                        <td className="py-2 pr-4 text-surface-400">{label}</td>
                        <td className="py-2 px-4 text-right font-mono">{a}</td>
                        <td className="py-2 pl-4 text-right font-mono">{b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Area Chart + Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="lg:col-span-2 rounded-2xl p-6" style={cardStyle}>
              <h3 className="text-lg font-semibold text-surface-100 mb-4">Growth Over Time</h3>
              <ResponsiveContainer width="100%" height={320}>
                {!compareEnabled ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradSipInvested" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="gradSipReturns" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22C55E" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#22C55E" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="year" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickFormatter={v => v >= 10000000 ? `${(v / 10000000).toFixed(1)}Cr` : v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                    <Tooltip content={<CustomTooltip sym={sym} />} />
                    <Area type="monotone" dataKey="Invested" stackId="1" stroke="#3B82F6" fill="url(#gradSipInvested)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Returns" stackId="1" stroke="#22C55E" fill="url(#gradSipReturns)" strokeWidth={2} />
                  </AreaChart>
                ) : (
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradSipA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF6363" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#FF6363" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gradSipB" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="year" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickFormatter={v => v >= 10000000 ? `${(v / 10000000).toFixed(1)}Cr` : v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                    <Tooltip content={<CustomTooltip sym={sym} />} />
                    <Area type="monotone" dataKey="Invested (A)" stackId="a" stroke="#FF6363" fill="url(#gradSipA)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Returns (A)" stackId="a" stroke="#FF9F43" fill="url(#gradSipA)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Invested (B)" stackId="b" stroke="#3B82F6" fill="url(#gradSipB)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Returns (B)" stackId="b" stroke="#60A5FA" fill="url(#gradSipB)" strokeWidth={2} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </motion.div>

            {/* Pie Chart */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-2xl p-6 flex flex-col items-center justify-center" style={cardStyle}>
              <h3 className="text-lg font-semibold text-surface-100 mb-2">Breakdown</h3>
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

          {/* Step-up Visualization */}
          {stepUpData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="rounded-2xl p-6" style={cardStyle}>
              <h3 className="text-lg font-semibold text-surface-100 mb-1">Monthly SIP Growth (Step-up)</h3>
              <p className="text-sm text-surface-400 mb-4">Your monthly investment increases by {stepUp}% each year</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stepUpData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradStepUp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF9F43" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#FF6363" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="year" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickFormatter={v => v >= 100000 ? `${(v / 1000).toFixed(0)}K` : v.toLocaleString()} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(28,28,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                    labelStyle={{ color: '#F3F4F6', fontWeight: 'bold' }}
                    itemStyle={{ color: '#FF9F43' }}
                    formatter={(value) => [fmt(value, sym), 'Monthly SIP']} />
                  <Bar dataKey="monthly" fill="url(#gradStepUp)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Collapsible Year-by-Year Table */}
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <button onClick={() => setTableOpen(v => !v)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors">
              <h3 className="text-lg font-semibold text-surface-100">Year-by-Year Breakdown</h3>
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
                          <tr className="text-surface-400 border-b border-white/10">
                            <th className="text-left py-2 pr-4">Year</th>
                            <th className="text-right py-2 px-4">Value</th>
                            <th className="text-right py-2 px-4">Invested</th>
                            <th className="text-right py-2 px-4">Returns</th>
                            {stepUpRate > 0 && <th className="text-right py-2 pl-4">Monthly SIP</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {yearlyData.map(d => (
                            <tr key={d.year} className="border-b border-white/5 text-surface-200">
                              <td className="py-2 pr-4 text-surface-400">{d.year}</td>
                              <td className="py-2 px-4 text-right font-mono text-primary-400 font-medium">{fmt(d.value, sym)}</td>
                              <td className="py-2 px-4 text-right font-mono">{fmt(d.invested, sym)}</td>
                              <td className="py-2 px-4 text-right font-mono text-green-400">{fmt(d.returns, sym)}</td>
                              {stepUpRate > 0 && <td className="py-2 pl-4 text-right font-mono text-surface-300">{fmt(d.monthlyAmount, sym)}</td>}
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
