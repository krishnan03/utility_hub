import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line, ReferenceLine,
} from 'recharts';

const CURRENCIES = [
  { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' }, { code: 'GBP', symbol: '£' },
  { code: 'INR', symbol: '₹' }, { code: 'AUD', symbol: 'A$' }, { code: 'CAD', symbol: 'C$' },
  { code: 'JPY', symbol: '¥' }, { code: 'SGD', symbol: 'S$' },
];

const PIE_COLORS = ['#22C55E', '#FF6363'];
const DEPLETION_COLOR = '#FF9F43';

function fmt(val, symbol) {
  return `${symbol}${Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtShort(val) {
  if (val >= 10000000) return `${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `${(val / 100000).toFixed(1)}L`;
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
  return val.toFixed(0);
}

function parseParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    currentAge: p.get('age') || '',
    retireAge: p.get('retireAge') || '60',
    currentSavings: p.get('savings') || '',
    monthlyContrib: p.get('monthly') || '',
    returnRate: p.get('rate') || '8',
    inflationRate: p.get('inflation') || '6',
    monthlyExpenses: p.get('expenses') || '',
    currency: p.get('currency') || 'USD',
    lifeExpectancy: p.get('life') || '85',
  };
}

const CustomTooltip = ({ active, payload, label, sym }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(28,28,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
      <p className="font-bold text-surface-100 mb-1">Age {label}</p>
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

function InputField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-sm font-medium text-surface-300 block mb-1">{label}</label>
      <input type="number" value={value} onChange={onChange} placeholder={placeholder}
        className={inputCls} style={inputStyle} />
    </div>
  );
}

function ReadinessGauge({ score }) {
  const color = score >= 75 ? '#22C55E' : score >= 45 ? '#FF9F43' : '#FF6363';
  const label = score >= 75 ? 'On Track' : score >= 45 ? 'Needs Attention' : 'At Risk';
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
        <circle cx="70" cy="70" r="54" fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x="70" y="64" textAnchor="middle" fill={color} className="text-2xl font-extrabold" fontSize="28" fontWeight="800">{score}</text>
        <text x="70" y="84" textAnchor="middle" fill="#9CA3AF" fontSize="11">/ 100</text>
      </svg>
      <p className="text-sm font-semibold mt-1" style={{ color }}>{label}</p>
    </div>
  );
}

export default function RetirementCalculator() {
  const init = parseParams();
  const [currentAge, setCurrentAge] = useState(init.currentAge);
  const [retireAge, setRetireAge] = useState(init.retireAge);
  const [currentSavings, setCurrentSavings] = useState(init.currentSavings);
  const [monthlyContrib, setMonthlyContrib] = useState(init.monthlyContrib);
  const [returnRate, setReturnRate] = useState(init.returnRate);
  const [inflationRate, setInflationRate] = useState(init.inflationRate);
  const [monthlyExpenses, setMonthlyExpenses] = useState(init.monthlyExpenses);
  const [currency, setCurrency] = useState(init.currency);
  const [lifeExpectancy, setLifeExpectancy] = useState(init.lifeExpectancy);

  const [tableOpen, setTableOpen] = useState(false);
  const [withdrawalTableOpen, setWithdrawalTableOpen] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '$';
  const CA = Number(currentAge) || 0;
  const RA = Number(retireAge) || 60;
  const CS = Number(currentSavings) || 0;
  const MC = Number(monthlyContrib) || 0;
  const RR = (Number(returnRate) || 0) / 100;
  const IR = (Number(inflationRate) || 0) / 100;
  const ME = Number(monthlyExpenses) || 0;
  const LE = Number(lifeExpectancy) || 85;

  const yearsToRetire = Math.max(0, RA - CA);
  const monthlyRate = RR / 12;

  // --- Shareable URL sync ---
  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    if (currentAge) params.set('age', currentAge);
    if (retireAge !== '60') params.set('retireAge', retireAge);
    if (currentSavings) params.set('savings', currentSavings);
    if (monthlyContrib) params.set('monthly', monthlyContrib);
    if (returnRate !== '8') params.set('rate', returnRate);
    if (inflationRate !== '6') params.set('inflation', inflationRate);
    if (monthlyExpenses) params.set('expenses', monthlyExpenses);
    if (currency !== 'USD') params.set('currency', currency);
    if (lifeExpectancy !== '85') params.set('life', lifeExpectancy);
    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [currentAge, retireAge, currentSavings, monthlyContrib, returnRate, inflationRate, monthlyExpenses, currency, lifeExpectancy]);

  useEffect(() => {
    const timer = setTimeout(updateURL, 150);
    return () => clearTimeout(timer);
  }, [updateURL]);

  // --- Accumulation phase ---
  let projectedCorpus = 0;
  const yearlyData = [];
  if (yearsToRetire > 0 && CA > 0) {
    let balance = CS;
    for (let y = 1; y <= yearsToRetire; y++) {
      for (let m = 0; m < 12; m++) {
        balance = (balance + MC) * (1 + monthlyRate);
      }
      const realBalance = balance / Math.pow(1 + IR, y);
      yearlyData.push({ age: CA + y, balance, realBalance });
    }
    projectedCorpus = balance;
  }

  // --- Required corpus ---
  const inflatedAnnualExpenses = ME * 12 * Math.pow(1 + IR, yearsToRetire);
  const inflatedMonthlyExpenses = ME * Math.pow(1 + IR, yearsToRetire);
  const realReturn = (RR - IR) / (1 + IR);
  const requiredCorpus = realReturn > 0 ? inflatedAnnualExpenses / realReturn : inflatedAnnualExpenses * 25;
  const shortfall = requiredCorpus - projectedCorpus;

  // --- Withdrawal phase simulation ---
  const retirementYears = Math.max(0, LE - RA);
  const withdrawalData = [];
  let depletionAge = null;
  if (projectedCorpus > 0 && ME > 0 && retirementYears > 0) {
    let corpus = projectedCorpus;
    const postReturnRate = RR * 0.75; // conservative post-retirement return
    const monthlyPostReturn = postReturnRate / 12;
    for (let y = 1; y <= retirementYears; y++) {
      const yearExpense = ME * 12 * Math.pow(1 + IR, yearsToRetire + y);
      const monthlyExp = yearExpense / 12;
      for (let m = 0; m < 12; m++) {
        corpus = (corpus - monthlyExp) * (1 + monthlyPostReturn);
        if (corpus <= 0) { corpus = 0; break; }
      }
      withdrawalData.push({ age: RA + y, corpus: Math.max(0, corpus), annualExpense: yearExpense });
      if (corpus <= 0 && !depletionAge) { depletionAge = RA + y; break; }
    }
  }
  const corpusLastsYears = depletionAge ? depletionAge - RA : retirementYears;

  // --- Readiness score ---
  let readinessScore = 0;
  if (projectedCorpus > 0 && requiredCorpus > 0) {
    const corpusRatio = Math.min(projectedCorpus / requiredCorpus, 1.5);
    const coverageRatio = Math.min(corpusLastsYears / retirementYears, 1);
    const savingsRate = MC > 0 ? Math.min(MC / (MC * 5), 1) : 0; // assume income ~5x contribution
    readinessScore = Math.round(
      Math.min(100, (corpusRatio * 50) + (coverageRatio * 35) + (savingsRate * 15))
    );
  }

  // --- Chart data ---
  const growthChartData = yearlyData.map(d => ({
    age: d.age,
    'Nominal': d.balance,
    'Real (Inflation-Adjusted)': d.realBalance,
  }));

  // --- Pie data ---
  const pieData = projectedCorpus > 0 && requiredCorpus > 0 ? (
    shortfall > 0
      ? [{ name: 'Projected Corpus', value: projectedCorpus }, { name: 'Shortfall', value: shortfall }]
      : [{ name: 'Required Corpus', value: requiredCorpus }, { name: 'Surplus', value: Math.abs(shortfall) }]
  ) : [];

  // --- Share handler ---
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    });
  };

  // --- Export handler ---
  const handleExport = () => {
    let report = '=== Retirement Calculator Report ===\n\n';
    report += `Currency: ${currency}\n`;
    report += `Current Age: ${CA}\n`;
    report += `Retirement Age: ${RA}\n`;
    report += `Life Expectancy: ${LE}\n`;
    report += `Current Savings: ${fmt(CS, sym)}\n`;
    report += `Monthly Contribution: ${fmt(MC, sym)}\n`;
    report += `Expected Return: ${returnRate}%\n`;
    report += `Inflation Rate: ${inflationRate}%\n`;
    report += `Monthly Expenses (today): ${fmt(ME, sym)}\n`;
    report += `\n--- Projections ---\n`;
    report += `Projected Corpus at ${RA}: ${fmt(projectedCorpus, sym)}\n`;
    report += `Required Corpus: ${fmt(requiredCorpus, sym)}\n`;
    report += `${shortfall > 0 ? 'Shortfall' : 'Surplus'}: ${fmt(Math.abs(shortfall), sym)}\n`;
    report += `Retirement Readiness Score: ${readinessScore}/100\n`;
    report += `\n--- Inflation Impact ---\n`;
    report += `Today's ${fmt(ME, sym)}/month = ${fmt(inflatedMonthlyExpenses, sym)}/month at retirement\n`;
    report += `Real purchasing power of corpus: ${fmt(projectedCorpus / Math.pow(1 + IR, yearsToRetire), sym)}\n`;
    report += `\n--- Withdrawal Phase ---\n`;
    report += `Corpus lasts: ${depletionAge ? `${corpusLastsYears} years (depletes at age ${depletionAge})` : `${retirementYears}+ years`}\n`;
    report += `\n--- Savings Growth (Year-by-Year) ---\n`;
    report += `${'Age'.padEnd(6)}${'Nominal'.padStart(18)}${'Real Value'.padStart(18)}\n`;
    yearlyData.forEach(d => {
      report += `${String(d.age).padEnd(6)}${fmt(d.balance, sym).padStart(18)}${fmt(d.realBalance, sym).padStart(18)}\n`;
    });
    if (withdrawalData.length > 0) {
      report += `\n--- Withdrawal Phase ---\n`;
      report += `${'Age'.padEnd(6)}${'Remaining Corpus'.padStart(20)}${'Annual Expense'.padStart(18)}\n`;
      withdrawalData.forEach(d => {
        report += `${String(d.age).padEnd(6)}${fmt(d.corpus, sym).padStart(20)}${fmt(d.annualExpense, sym).padStart(18)}\n`;
      });
    }
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'retirement-calculator-report.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">

      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={handleShare}
          className="px-4 py-2 rounded-xl text-sm font-medium text-surface-300 hover:text-surface-100 transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          🔗 Share
        </button>
        {projectedCorpus > 0 && (
          <button onClick={handleExport}
            className="px-4 py-2 rounded-xl text-sm font-medium text-surface-300 hover:text-surface-100 transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            📄 Export Report
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

      {/* Input form */}
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <p className="text-sm text-surface-400">Plan your retirement — see if your savings will last through your golden years</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)} className={inputCls} style={inputStyle}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
            </select>
          </div>
          <InputField label="Current Age" value={currentAge} onChange={e => setCurrentAge(e.target.value)} placeholder="e.g. 30" />
          <InputField label="Retirement Age" value={retireAge} onChange={e => setRetireAge(e.target.value)} placeholder="60" />
          <InputField label="Life Expectancy" value={lifeExpectancy} onChange={e => setLifeExpectancy(e.target.value)} placeholder="85" />
          <InputField label="Current Savings" value={currentSavings} onChange={e => setCurrentSavings(e.target.value)} placeholder="e.g. 50000" />
          <InputField label="Monthly Contribution" value={monthlyContrib} onChange={e => setMonthlyContrib(e.target.value)} placeholder="e.g. 1000" />
          <InputField label="Expected Return (%)" value={returnRate} onChange={e => setReturnRate(e.target.value)} placeholder="8" />
          <InputField label="Inflation Rate (%)" value={inflationRate} onChange={e => setInflationRate(e.target.value)} placeholder="6" />
          <InputField label="Monthly Expenses (today)" value={monthlyExpenses} onChange={e => setMonthlyExpenses(e.target.value)} placeholder="e.g. 3000" />
        </div>
      </div>

      {/* Results */}
      {projectedCorpus > 0 && (
        <>
          {/* Readiness Score + Stat Cards */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Readiness Gauge */}
            <div className="lg:col-span-1 rounded-2xl p-6 flex flex-col items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(255,99,99,0.06), rgba(34,197,94,0.06))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-sm font-medium text-surface-400 mb-2">Readiness Score</p>
              <ReadinessGauge score={readinessScore} />
            </div>

            {/* Stat cards */}
            <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Projected Corpus', value: fmt(projectedCorpus, sym), highlight: true },
                { label: 'Required Corpus', value: fmt(requiredCorpus, sym) },
                { label: shortfall > 0 ? 'Shortfall' : 'Surplus', value: fmt(Math.abs(shortfall), sym), color: shortfall > 0 ? 'text-xl text-red-400' : 'text-xl text-green-400' },
                { label: 'Corpus Lasts', value: depletionAge ? `${corpusLastsYears} yrs` : `${retirementYears}+ yrs`, color: depletionAge ? 'text-xl text-orange-400' : 'text-xl text-green-400' },
              ].map(item => (
                <div key={item.label} className="rounded-xl p-4" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
                  <p className="text-sm text-surface-400 mb-1">{item.label}</p>
                  <p className={`font-bold ${item.color || (item.highlight ? 'text-2xl text-primary-400' : 'text-xl text-surface-200')}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Inflation Impact Card */}
          {ME > 0 && yearsToRetire > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}
              className="rounded-2xl p-6" style={{ background: 'rgba(255,159,67,0.06)', border: '1px solid rgba(255,159,67,0.2)' }}>
              <h3 className="text-lg font-semibold text-surface-100 mb-3">📊 Inflation Impact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs text-surface-400 mb-1">Today&apos;s Monthly Expenses</p>
                  <p className="text-lg font-bold text-surface-100">{fmt(ME, sym)}</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs text-surface-400 mb-1">At Retirement ({inflationRate}% inflation)</p>
                  <p className="text-lg font-bold text-orange-400">{fmt(inflatedMonthlyExpenses, sym)}/mo</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs text-surface-400 mb-1">Real Purchasing Power of Corpus</p>
                  <p className="text-lg font-bold text-blue-400">{fmt(projectedCorpus / Math.pow(1 + IR, yearsToRetire), sym)}</p>
                </div>
              </div>
              <p className="text-xs text-surface-500 mt-3">Your {fmt(ME, sym)}/month expenses will be {fmt(inflatedMonthlyExpenses, sym)}/month at retirement age {RA}</p>
            </motion.div>
          )}

          {/* Area Chart + Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="lg:col-span-2 rounded-2xl p-6" style={cardStyle}>
              <h3 className="text-lg font-semibold text-surface-100 mb-1">Savings Growth</h3>
              <p className="text-sm text-surface-400 mb-4">Nominal vs inflation-adjusted projections</p>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={growthChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradNominal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="age" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickFormatter={fmtShort} />
                  <Tooltip content={<CustomTooltip sym={sym} />} />
                  <ReferenceLine y={requiredCorpus} stroke="#FF6363" strokeDasharray="6 4" strokeWidth={2}
                    label={{ value: 'Required', fill: '#FF6363', fontSize: 11, position: 'right' }} />
                  <Area type="monotone" dataKey="Nominal" stroke="#22C55E" fill="url(#gradNominal)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Real (Inflation-Adjusted)" stroke="#3B82F6" fill="url(#gradReal)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Pie Chart — Readiness */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-2xl p-6 flex flex-col items-center justify-center" style={cardStyle}>
              <h3 className="text-lg font-semibold text-surface-100 mb-2">
                {shortfall > 0 ? 'Corpus vs Shortfall' : 'Corpus vs Surplus'}
              </h3>
              {pieData.length > 0 && (
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
              )}
            </motion.div>
          </div>

          {/* Withdrawal Phase */}
          {withdrawalData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="rounded-2xl p-6 space-y-4" style={cardStyle}>
              <h3 className="text-lg font-semibold text-surface-100">Post-Retirement: Corpus Depletion</h3>
              <p className="text-sm text-surface-400">
                {depletionAge
                  ? `Your corpus depletes at age ${depletionAge} (${corpusLastsYears} years into retirement)`
                  : `Your corpus survives through age ${LE} — well funded!`}
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={withdrawalData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradDepletion" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={DEPLETION_COLOR} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={DEPLETION_COLOR} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="age" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickFormatter={fmtShort} />
                  <Tooltip content={<CustomTooltip sym={sym} />} />
                  <Line type="monotone" dataKey="corpus" name="Remaining Corpus" stroke={DEPLETION_COLOR} strokeWidth={2.5}
                    dot={false} activeDot={{ r: 4, fill: DEPLETION_COLOR }} />
                  <Line type="monotone" dataKey="annualExpense" name="Annual Expense" stroke="#FF6363" strokeWidth={1.5}
                    strokeDasharray="4 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>

              {/* Collapsible Withdrawal Table */}
              <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={() => setWithdrawalTableOpen(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors">
                  <span className="text-sm font-medium text-surface-300">Year-by-Year Withdrawal</span>
                  <motion.span animate={{ rotate: withdrawalTableOpen ? 180 : 0 }} transition={{ duration: 0.2 }}
                    className="text-surface-400 text-lg">▾</motion.span>
                </button>
                <AnimatePresence>
                  {withdrawalTableOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }} className="overflow-hidden">
                      <div className="px-4 pb-4">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-surface-400 border-b border-white/10">
                                <th className="text-left py-2 pr-4">Age</th>
                                <th className="text-right py-2 px-4">Remaining Corpus</th>
                                <th className="text-right py-2 pl-4">Annual Expense</th>
                              </tr>
                            </thead>
                            <tbody>
                              {withdrawalData.map(d => (
                                <tr key={d.age} className="border-b border-white/5 text-surface-200">
                                  <td className="py-2 pr-4 text-surface-400">{d.age}</td>
                                  <td className={`py-2 px-4 text-right font-mono ${d.corpus <= 0 ? 'text-red-400' : 'text-orange-400'}`}>{fmt(d.corpus, sym)}</td>
                                  <td className="py-2 pl-4 text-right font-mono text-surface-300">{fmt(d.annualExpense, sym)}</td>
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
            </motion.div>
          )}

          {/* Collapsible Savings Growth Table */}
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <button onClick={() => setTableOpen(v => !v)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors">
              <h3 className="text-lg font-semibold text-surface-100">Year-by-Year Savings Growth</h3>
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
                            <th className="text-left py-2 pr-4">Age</th>
                            <th className="text-right py-2 px-4">Nominal Value</th>
                            <th className="text-right py-2 pl-4">Real Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {yearlyData.map(d => (
                            <tr key={d.age} className="border-b border-white/5 text-surface-200">
                              <td className="py-2 pr-4 text-surface-400">{d.age}</td>
                              <td className="py-2 px-4 text-right font-mono text-primary-400 font-medium">{fmt(d.balance, sym)}</td>
                              <td className="py-2 pl-4 text-right font-mono text-blue-400">{fmt(d.realBalance, sym)}</td>
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
