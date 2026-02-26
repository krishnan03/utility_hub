import { useState, useEffect, useCallback } from 'react';
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

const FREQ_OPTIONS = [
  { label: 'Daily', value: 365 },
  { label: 'Monthly', value: 12 },
  { label: 'Quarterly', value: 4 },
  { label: 'Annually', value: 1 },
];

const PIE_COLORS = ['#FF6363', '#FF9F43'];

function fmt(val, symbol) {
  return `${symbol}${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function computeYearlyData(P, r, n, t, PMT) {
  const data = [];
  if (P >= 0 && r >= 0 && t > 0) {
    for (let y = 1; y <= t; y++) {
      const compounded = P * Math.pow(1 + r / n, n * y);
      const contribFV = PMT > 0 && r > 0 ? PMT * ((Math.pow(1 + r / n, n * y) - 1) / (r / n)) : PMT * n * y;
      const total = compounded + contribFV;
      const invested = P + PMT * 12 * y;
      data.push({ year: y, total, invested, interest: total - invested });
    }
  }
  return data;
}

function parseParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    principal: params.get('principal') || '',
    rate: params.get('rate') || '',
    years: params.get('years') || '',
    contribution: params.get('contribution') || '',
    freq: params.get('freq') ? Number(params.get('freq')) : 12,
    currency: params.get('currency') || 'USD',
    compareEnabled: params.get('compare') === '1',
    principalB: params.get('principalB') || '',
    rateB: params.get('rateB') || '',
    yearsB: params.get('yearsB') || '',
    contributionB: params.get('contributionB') || '',
    freqB: params.get('freqB') ? Number(params.get('freqB')) : 12,
    goalMode: params.get('goal') === '1',
    goalTarget: params.get('goalTarget') || '',
    goalYears: params.get('goalYears') || '',
    goalRate: params.get('goalRate') || '',
    goalSolve: params.get('goalSolve') || 'contribution',
  };
}


const CustomTooltip = ({ active, payload, label, sym }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(28,28,30,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
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

function InputField({ label, value, onChange, placeholder, type = 'number' }) {
  return (
    <div>
      <label className="text-sm font-medium text-surface-300 block mb-1">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className={inputCls} style={inputStyle} />
    </div>
  );
}

function FreqSelector({ freq, setFreq }) {
  return (
    <div>
      <label className="text-sm font-medium text-surface-300 block mb-1">Compounding Frequency</label>
      <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
        {FREQ_OPTIONS.map(f => (
          <button key={f.value} onClick={() => setFreq(f.value)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${freq === f.value ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`}
            style={freq === f.value ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}


export default function CompoundInterestCalculator() {
  const init = parseParams();
  const [principal, setPrincipal] = useState(init.principal);
  const [rate, setRate] = useState(init.rate);
  const [freq, setFreq] = useState(init.freq);
  const [years, setYears] = useState(init.years);
  const [contribution, setContribution] = useState(init.contribution);
  const [currency, setCurrency] = useState(init.currency);

  // Compare mode
  const [compareEnabled, setCompareEnabled] = useState(init.compareEnabled);
  const [principalB, setPrincipalB] = useState(init.principalB);
  const [rateB, setRateB] = useState(init.rateB);
  const [yearsB, setYearsB] = useState(init.yearsB);
  const [contributionB, setContributionB] = useState(init.contributionB);
  const [freqB, setFreqB] = useState(init.freqB);

  // Goal mode
  const [goalMode, setGoalMode] = useState(init.goalMode);
  const [goalTarget, setGoalTarget] = useState(init.goalTarget);
  const [goalYears, setGoalYears] = useState(init.goalYears);
  const [goalRate, setGoalRate] = useState(init.goalRate);
  const [goalSolve, setGoalSolve] = useState(init.goalSolve);

  const [tableOpen, setTableOpen] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '$';

  // --- Build shareable URL (only on Share click, not on every input change) ---
  const buildShareURL = useCallback(() => {
    const params = new URLSearchParams();
    if (principal) params.set('principal', principal);
    if (rate) params.set('rate', rate);
    if (years) params.set('years', years);
    if (contribution) params.set('contribution', contribution);
    if (freq !== 12) params.set('freq', freq);
    if (currency !== 'USD') params.set('currency', currency);
    if (compareEnabled) {
      params.set('compare', '1');
      if (principalB) params.set('principalB', principalB);
      if (rateB) params.set('rateB', rateB);
      if (yearsB) params.set('yearsB', yearsB);
      if (contributionB) params.set('contributionB', contributionB);
      if (freqB !== 12) params.set('freqB', freqB);
    }
    if (goalMode) {
      params.set('goal', '1');
      if (goalTarget) params.set('goalTarget', goalTarget);
      if (goalYears) params.set('goalYears', goalYears);
      if (goalRate) params.set('goalRate', goalRate);
      params.set('goalSolve', goalSolve);
    }
    const qs = params.toString();
    return qs ? `${window.location.origin}${window.location.pathname}?${qs}` : `${window.location.origin}${window.location.pathname}`;
  }, [principal, rate, years, contribution, freq, currency, compareEnabled, principalB, rateB, yearsB, contributionB, freqB, goalMode, goalTarget, goalYears, goalRate, goalSolve]);

  // --- Scenario A calculations ---
  const P = Number(principal) || 0;
  const r = Number(rate) / 100;
  const n = freq;
  const t = Number(years) || 0;
  const PMT = Number(contribution) || 0;
  const yearlyData = computeYearlyData(P, r, n, t, PMT);
  const finalAmount = yearlyData[yearlyData.length - 1]?.total || 0;
  const totalContributions = P + PMT * 12 * t;
  const totalInterest = finalAmount - totalContributions;

  // --- Scenario B calculations ---
  const PB = Number(principalB) || 0;
  const rB = Number(rateB) / 100;
  const nB = freqB;
  const tB = Number(yearsB) || 0;
  const PMTB = Number(contributionB) || 0;
  const yearlyDataB = compareEnabled ? computeYearlyData(PB, rB, nB, tB, PMTB) : [];
  const finalAmountB = yearlyDataB[yearlyDataB.length - 1]?.total || 0;
  const totalContributionsB = PB + PMTB * 12 * tB;
  const totalInterestB = finalAmountB - totalContributionsB;

  // --- Chart data (merged for comparison) ---
  const maxYears = compareEnabled ? Math.max(t, tB) : t;
  const chartData = [];
  for (let y = 1; y <= maxYears; y++) {
    const a = yearlyData.find(d => d.year === y);
    const b = yearlyDataB.find(d => d.year === y);
    const entry = { year: y };
    if (a) { entry['Invested (A)'] = a.invested; entry['Interest (A)'] = a.interest; }
    if (b) { entry['Invested (B)'] = b.invested; entry['Interest (B)'] = b.interest; }
    if (!compareEnabled && a) { entry['Invested'] = a.invested; entry['Interest Earned'] = a.interest; }
    chartData.push(entry);
  }

  // --- Pie data ---
  const pieData = finalAmount > 0 ? [
    { name: 'Contributions', value: totalContributions },
    { name: 'Interest Earned', value: totalInterest },
  ] : [];


  // --- Goal mode calculation ---
  let goalResult = null;
  const GT = Number(goalTarget) || 0;
  const GY = Number(goalYears) || 0;
  const GR = Number(goalRate) / 100;
  if (goalMode && GT > 0 && GY > 0) {
    if (goalSolve === 'contribution' && GR > 0) {
      // Solve for monthly contribution: FV = PMT * ((1+r/n)^(n*t) - 1) / (r/n)
      // PMT = FV / (((1+r/n)^(n*t) - 1) / (r/n))
      const gn = 12;
      const factor = (Math.pow(1 + GR / gn, gn * GY) - 1) / (GR / gn);
      const requiredPMT = GT / factor;
      goalResult = { type: 'contribution', value: requiredPMT };
    } else if (goalSolve === 'rate') {
      // Solve for rate numerically (Newton's method)
      // FV = PMT * ((1+r/12)^(12*t) - 1) / (r/12), solve for r given PMT from contribution field
      // Simpler: assume monthly contributions, binary search for rate
      const gPMT = Number(contribution) || 500;
      let lo = 0, hi = 1; // 0% to 100%
      for (let i = 0; i < 100; i++) {
        const mid = (lo + hi) / 2;
        const gn = 12;
        const fv = mid > 0 ? gPMT * ((Math.pow(1 + mid / gn, gn * GY) - 1) / (mid / gn)) : gPMT * gn * GY;
        if (fv < GT) lo = mid; else hi = mid;
      }
      goalResult = { type: 'rate', value: ((lo + hi) / 2) * 100 };
    }
  }

  // --- Share handler (only updates URL when user clicks Share) ---
  const handleShare = () => {
    const shareUrl = buildShareURL();
    window.history.replaceState(null, '', shareUrl.replace(window.location.origin, ''));
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    });
  };

  // --- Export handler ---
  const handleExport = () => {
    let report = '=== Compound Interest Report ===\n\n';
    report += `Currency: ${currency}\n`;
    report += `Principal: ${fmt(P, sym)}\n`;
    report += `Annual Rate: ${rate}%\n`;
    report += `Time: ${years} years\n`;
    report += `Monthly Contribution: ${fmt(PMT, sym)}\n`;
    report += `Compounding: ${FREQ_OPTIONS.find(f => f.value === freq)?.label}\n\n`;
    report += `--- Results ---\n`;
    report += `Final Amount: ${fmt(finalAmount, sym)}\n`;
    report += `Total Contributions: ${fmt(totalContributions, sym)}\n`;
    report += `Interest Earned: ${fmt(totalInterest, sym)}\n\n`;
    report += `--- Year-by-Year ---\n`;
    report += `${'Year'.padEnd(6)}${'Total'.padStart(18)}${'Invested'.padStart(18)}${'Interest'.padStart(18)}\n`;
    yearlyData.forEach(d => {
      report += `${String(d.year).padEnd(6)}${fmt(d.total, sym).padStart(18)}${fmt(d.invested, sym).padStart(18)}${fmt(d.interest, sym).padStart(18)}\n`;
    });
    if (compareEnabled && yearlyDataB.length > 0) {
      report += `\n--- Scenario B ---\n`;
      report += `Principal: ${fmt(PB, sym)}, Rate: ${rateB}%, Years: ${yearsB}, Monthly: ${fmt(PMTB, sym)}\n`;
      report += `Final: ${fmt(finalAmountB, sym)}, Contributions: ${fmt(totalContributionsB, sym)}, Interest: ${fmt(totalInterestB, sym)}\n`;
    }
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compound-interest-report.txt';
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
        {finalAmount > 0 && (
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
            <h3 className="text-lg font-semibold text-surface-100">🎯 Goal-Based Calculator</h3>
            <p className="text-sm text-surface-400">Enter your target and we'll calculate what you need.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="Target Amount" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} placeholder="e.g. 1000000" />
              <InputField label="Time Horizon (Years)" value={goalYears} onChange={e => setGoalYears(e.target.value)} placeholder="e.g. 20" />
              {goalSolve === 'contribution' && (
                <InputField label="Expected Annual Rate (%)" value={goalRate} onChange={e => setGoalRate(e.target.value)} placeholder="e.g. 8" />
              )}
              {goalSolve === 'rate' && (
                <InputField label="Monthly Contribution" value={contribution} onChange={e => setContribution(e.target.value)} placeholder="e.g. 500" />
              )}
              <div>
                <label className="text-sm font-medium text-surface-300 block mb-1">Solve For</label>
                <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  {[{ label: 'Monthly Contribution', value: 'contribution' }, { label: 'Required Rate', value: 'rate' }].map(o => (
                    <button key={o.value} onClick={() => setGoalSolve(o.value)}
                      className={`flex-1 py-2 text-xs font-medium transition-colors ${goalSolve === o.value ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`}
                      style={goalSolve === o.value ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {goalResult && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl p-4 mt-2"
                style={{ background: 'rgba(255,99,99,0.08)', border: '1px solid rgba(255,99,99,0.2)' }}>
                {goalResult.type === 'contribution' ? (
                  <p className="text-surface-100">
                    To reach <span className="font-bold text-primary-400">{fmt(GT, sym)}</span> in {GY} years at {goalRate}% annual return, you need to invest{' '}
                    <span className="font-bold text-primary-400">{fmt(goalResult.value, sym)}/month</span>.
                  </p>
                ) : (
                  <p className="text-surface-100">
                    To reach <span className="font-bold text-primary-400">{fmt(GT, sym)}</span> in {GY} years with {fmt(Number(contribution) || 0, sym)}/month, you need an annual return of{' '}
                    <span className="font-bold text-primary-400">{goalResult.value.toFixed(2)}%</span>.
                  </p>
                )}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-surface-300 block mb-1">Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className={inputCls} style={inputStyle}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
              </select>
            </div>
            <InputField label="Principal Amount" value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="e.g. 10000" />
            <InputField label="Annual Interest Rate (%)" value={rate} onChange={e => setRate(e.target.value)} placeholder="e.g. 8" />
            <InputField label="Time Period (Years)" value={years} onChange={e => setYears(e.target.value)} placeholder="e.g. 10" />
            <InputField label="Monthly Contribution" value={contribution} onChange={e => setContribution(e.target.value)} placeholder="e.g. 500 (optional)" />
            <FreqSelector freq={freq} setFreq={setFreq} />
          </div>
        </div>

        {/* Scenario B */}
        <AnimatePresence>
          {compareEnabled && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Scenario B</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Principal Amount" value={principalB} onChange={e => setPrincipalB(e.target.value)} placeholder="e.g. 5000" />
                <InputField label="Annual Interest Rate (%)" value={rateB} onChange={e => setRateB(e.target.value)} placeholder="e.g. 10" />
                <InputField label="Time Period (Years)" value={yearsB} onChange={e => setYearsB(e.target.value)} placeholder="e.g. 15" />
                <InputField label="Monthly Contribution" value={contributionB} onChange={e => setContributionB(e.target.value)} placeholder="e.g. 300" />
                <FreqSelector freq={freqB} setFreq={setFreqB} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      {/* Stat cards */}
      {finalAmount > 0 && (
        <>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Final Amount', value: fmt(finalAmount, sym), highlight: true },
              { label: 'Total Contributions', value: fmt(totalContributions, sym) },
              { label: 'Interest Earned', value: fmt(totalInterest, sym) },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
                <p className="text-sm text-surface-400 mb-1">{item.label}</p>
                <p className={`font-bold ${item.highlight ? 'text-2xl text-primary-400' : 'text-xl text-surface-200'}`}>{item.value}</p>
              </div>
            ))}
          </motion.div>

          {/* Comparison table */}
          {compareEnabled && finalAmountB > 0 && (
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
                      ['Final Amount', fmt(finalAmount, sym), fmt(finalAmountB, sym)],
                      ['Total Contributions', fmt(totalContributions, sym), fmt(totalContributionsB, sym)],
                      ['Interest Earned', fmt(totalInterest, sym), fmt(totalInterestB, sym)],
                      ['Interest %', `${totalContributions > 0 ? ((totalInterest / totalContributions) * 100).toFixed(1) : 0}%`, `${totalContributionsB > 0 ? ((totalInterestB / totalContributionsB) * 100).toFixed(1) : 0}%`],
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
                      <linearGradient id="gradInvested" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="gradInterest" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF9F43" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#FF9F43" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="year" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                    <Tooltip content={<CustomTooltip sym={sym} />} />
                    <Area type="monotone" dataKey="Invested" stackId="1" stroke="#3B82F6" fill="url(#gradInvested)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Interest Earned" stackId="1" stroke="#FF9F43" fill="url(#gradInterest)" strokeWidth={2} />
                  </AreaChart>
                ) : (
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF6363" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#FF6363" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="year" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                    <Tooltip content={<CustomTooltip sym={sym} />} />
                    <Area type="monotone" dataKey="Invested (A)" stackId="a" stroke="#FF6363" fill="url(#gradA)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Interest (A)" stackId="a" stroke="#FF9F43" fill="url(#gradA)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Invested (B)" stackId="b" stroke="#3B82F6" fill="url(#gradB)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Interest (B)" stackId="b" stroke="#60A5FA" fill="url(#gradB)" strokeWidth={2} />
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
                            <th className="text-right py-2 px-4">Total</th>
                            <th className="text-right py-2 px-4">Invested</th>
                            <th className="text-right py-2 pl-4">Interest</th>
                          </tr>
                        </thead>
                        <tbody>
                          {yearlyData.map(d => (
                            <tr key={d.year} className="border-b border-white/5 text-surface-200">
                              <td className="py-2 pr-4 text-surface-400">{d.year}</td>
                              <td className="py-2 px-4 text-right font-mono">{fmt(d.total, sym)}</td>
                              <td className="py-2 px-4 text-right font-mono">{fmt(d.invested, sym)}</td>
                              <td className="py-2 pl-4 text-right font-mono text-primary-400">{fmt(d.interest, sym)}</td>
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
