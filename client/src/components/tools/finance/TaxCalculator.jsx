import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts';

// US 2024 federal tax brackets (single)
const US_BRACKETS_SINGLE = [
  { limit: 11600, rate: 0.10 },
  { limit: 47150, rate: 0.12 },
  { limit: 100525, rate: 0.22 },
  { limit: 191950, rate: 0.24 },
  { limit: 243725, rate: 0.32 },
  { limit: 609350, rate: 0.35 },
  { limit: Infinity, rate: 0.37 },
];
const US_BRACKETS_MARRIED = [
  { limit: 23200, rate: 0.10 },
  { limit: 94300, rate: 0.12 },
  { limit: 201050, rate: 0.22 },
  { limit: 383900, rate: 0.24 },
  { limit: 487450, rate: 0.32 },
  { limit: 731200, rate: 0.35 },
  { limit: Infinity, rate: 0.37 },
];
const US_BRACKETS_HOH = [
  { limit: 16550, rate: 0.10 },
  { limit: 63100, rate: 0.12 },
  { limit: 100500, rate: 0.22 },
  { limit: 191950, rate: 0.24 },
  { limit: 243700, rate: 0.32 },
  { limit: 609350, rate: 0.35 },
  { limit: Infinity, rate: 0.37 },
];
const US_STD_DED = { single: 14600, married: 29200, hoh: 21900 };

// India new regime 2024
const INDIA_NEW = [
  { limit: 300000, rate: 0 },
  { limit: 600000, rate: 0.05 },
  { limit: 900000, rate: 0.10 },
  { limit: 1200000, rate: 0.15 },
  { limit: 1500000, rate: 0.20 },
  { limit: Infinity, rate: 0.30 },
];
const INDIA_OLD = [
  { limit: 250000, rate: 0 },
  { limit: 500000, rate: 0.05 },
  { limit: 1000000, rate: 0.20 },
  { limit: Infinity, rate: 0.30 },
];

// UK 2024/25
const UK_BRACKETS = [
  { limit: 12570, rate: 0 },
  { limit: 50270, rate: 0.20 },
  { limit: 125140, rate: 0.40 },
  { limit: Infinity, rate: 0.45 },
];

const BRACKET_COLORS = ['#22C55E', '#3B82F6', '#A855F7', '#FF9F43', '#FF6363', '#EF4444', '#DC2626'];

function calcTax(income, brackets) {
  let tax = 0, prev = 0;
  for (const { limit, rate } of brackets) {
    if (income <= prev) break;
    const chunk = Math.min(income, limit) - prev;
    tax += chunk * rate;
    prev = limit;
  }
  return tax;
}

function fmt(val, sym = '$') {
  return `${sym}${Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const CustomTooltip = ({ active, payload, label, sym }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(28,28,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
      <p className="font-bold text-surface-100 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color || p.fill }}>{p.name}: {fmt(p.value, sym)}</p>
      ))}
    </div>
  );
};

const cardStyle = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };

export default function TaxCalculator() {
  const [country, setCountry] = useState('US');
  const [income, setIncome] = useState('');
  const [filingStatus, setFilingStatus] = useState('single');
  const [useStdDed, setUseStdDed] = useState(true);
  const [additionalDed, setAdditionalDed] = useState('');
  const [regime, setRegime] = useState('new');
  const [tableOpen, setTableOpen] = useState(false);

  const I = Number(income) || 0;
  const addDed = Number(additionalDed) || 0;

  let taxableIncome = 0, taxLiability = 0, effectiveRate = 0, takeHome = 0;
  let sym = '$';
  let indiaOldTax = 0, indiaNewTax = 0;

  if (country === 'US') {
    sym = '$';
    const brackets = filingStatus === 'married' ? US_BRACKETS_MARRIED : filingStatus === 'hoh' ? US_BRACKETS_HOH : US_BRACKETS_SINGLE;
    const stdDed = US_STD_DED[filingStatus] || 14600;
    const deduction = useStdDed ? stdDed : addDed;
    taxableIncome = Math.max(0, I - deduction);
    taxLiability = calcTax(taxableIncome, brackets);
    effectiveRate = I > 0 ? (taxLiability / I) * 100 : 0;
    takeHome = I - taxLiability;
  } else if (country === 'India') {
    sym = '₹';
    indiaNewTax = calcTax(Math.max(0, I - 75000), INDIA_NEW) * 1.04;
    indiaOldTax = calcTax(Math.max(0, I - 50000 - addDed), INDIA_OLD) * 1.04;
    taxLiability = regime === 'new' ? indiaNewTax : indiaOldTax;
    taxableIncome = regime === 'new' ? Math.max(0, I - 75000) : Math.max(0, I - 50000 - addDed);
    effectiveRate = I > 0 ? (taxLiability / I) * 100 : 0;
    takeHome = I - taxLiability;
  } else if (country === 'UK') {
    sym = '£';
    taxableIncome = Math.max(0, I - addDed);
    taxLiability = calcTax(taxableIncome, UK_BRACKETS);
    const ni = Math.max(0, Math.min(I, 50270) - 12570) * 0.08 + Math.max(0, I - 50270) * 0.02;
    taxLiability += ni;
    effectiveRate = I > 0 ? (taxLiability / I) * 100 : 0;
    takeHome = I - taxLiability;
  }

  const US_BRACKETS_DISPLAY = filingStatus === 'married' ? US_BRACKETS_MARRIED : filingStatus === 'hoh' ? US_BRACKETS_HOH : US_BRACKETS_SINGLE;

  // Build stacked bar chart data for tax brackets
  const bracketChartData = [];
  if (I > 0) {
    let brackets;
    if (country === 'US') brackets = US_BRACKETS_DISPLAY;
    else if (country === 'India') brackets = regime === 'new' ? INDIA_NEW : INDIA_OLD;
    else brackets = UK_BRACKETS;

    let prev = 0;
    brackets.forEach((b, i) => {
      if (taxableIncome <= prev) return;
      const chunk = Math.min(taxableIncome, b.limit) - prev;
      const tax = chunk * b.rate;
      if (chunk > 0) {
        bracketChartData.push({
          name: `${(b.rate * 100).toFixed(0)}%`,
          'Taxable Amount': chunk,
          'Tax': Math.round(tax),
          fill: BRACKET_COLORS[i % BRACKET_COLORS.length],
        });
      }
      prev = b.limit;
    });
  }

  const handleExport = () => {
    let report = '=== Tax Calculator Report ===\n\n';
    report += `Country: ${country}\nIncome: ${fmt(I, sym)}\n`;
    if (country === 'US') report += `Filing: ${filingStatus}\n`;
    if (country === 'India') report += `Regime: ${regime}\n`;
    report += `\n--- Results ---\nTaxable Income: ${fmt(taxableIncome, sym)}\nTax Liability: ${fmt(taxLiability, sym)}\nEffective Rate: ${effectiveRate.toFixed(2)}%\nTake-Home: ${fmt(takeHome, sym)}\n`;
    if (country === 'India') {
      report += `\nNew Regime Tax: ${fmt(indiaNewTax, sym)}\nOld Regime Tax: ${fmt(indiaOldTax, sym)}\n`;
    }
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tax-calculator-report.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <div>
          <label className="text-sm font-medium text-surface-300 block mb-2">Country</label>
          <div className="flex rounded-xl overflow-hidden w-fit" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            {['US', 'India', 'UK'].map(c => (
              <button key={c} onClick={() => setCountry(c)}
                className={`px-5 py-2 text-sm font-medium transition-colors ${country === c ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`}
                style={country === c ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Annual Income ({sym})</label>
            <input type="number" value={income} onChange={e => setIncome(e.target.value)} placeholder="e.g. 75000"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>

          {country === 'US' && (
            <div>
              <label className="text-sm font-medium text-surface-300 block mb-1">Filing Status</label>
              <select value={filingStatus} onChange={e => setFilingStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <option value="single">Single</option>
                <option value="married">Married Filing Jointly</option>
                <option value="hoh">Head of Household</option>
              </select>
            </div>
          )}

          {country === 'India' && (
            <div>
              <label className="text-sm font-medium text-surface-300 block mb-1">Tax Regime</label>
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                {[{ value: 'new', label: 'New' }, { value: 'old', label: 'Old' }].map(r => (
                  <button key={r.value} onClick={() => setRegime(r.value)}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${regime === r.value ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`}
                    style={regime === r.value ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                    {r.label} Regime
                  </button>
                ))}
              </div>
            </div>
          )}

          {country === 'US' && (
            <div className="flex items-center gap-3">
              <button onClick={() => setUseStdDed(!useStdDed)}
                className={`w-12 h-6 rounded-full transition-colors ${useStdDed ? 'bg-blue-500' : 'bg-gray-600'} relative`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${useStdDed ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm text-surface-300">
                Standard deduction ({sym}{(US_STD_DED[filingStatus] || 14600).toLocaleString()})
              </span>
            </div>
          )}

          {(country === 'India' || country === 'UK' || (country === 'US' && !useStdDed)) && (
            <div>
              <label className="text-sm font-medium text-surface-300 block mb-1">
                {country === 'India' ? 'Additional Deductions (80C etc.)' : 'Additional Deductions'}
              </label>
              <input type="number" value={additionalDed} onChange={e => setAdditionalDed(e.target.value)} placeholder="0"
                className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
          )}
        </div>
      </div>

      {I > 0 && (
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
              { label: 'Taxable Income', value: fmt(taxableIncome, sym) },
              { label: 'Tax Liability', value: fmt(taxLiability, sym), highlight: true },
              { label: 'Effective Rate', value: `${effectiveRate.toFixed(2)}%` },
              { label: 'Take-Home', value: fmt(takeHome, sym) },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
                <p className="text-sm text-surface-400 mb-1">{item.label}</p>
                <p className={`font-bold ${item.highlight ? 'text-2xl text-primary-400' : 'text-xl text-surface-200'}`}>{item.value}</p>
              </div>
            ))}
          </motion.div>

          {/* Stacked Bar Chart for Tax Brackets */}
          {bracketChartData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="rounded-2xl p-6" style={cardStyle}>
              <h3 className="text-lg font-semibold text-surface-100 mb-4">Tax Bracket Visualization</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={bracketChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    label={{ value: 'Tax Rate', position: 'insideBottom', offset: -2, fill: '#9CA3AF', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                  <Tooltip content={<CustomTooltip sym={sym} />} />
                  <Bar dataKey="Tax" radius={[6, 6, 0, 0]} name="Tax Amount">
                    {bracketChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Bracket Breakdown — Horizontal Stacked Bar + Table */}
          {bracketChartData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-2xl p-6 space-y-5" style={cardStyle}>
              <h3 className="text-lg font-semibold text-surface-100">Income Distribution Across Brackets</h3>
              <ResponsiveContainer width="100%" height={Math.max(120, bracketChartData.length * 48 + 40)}>
                <BarChart data={bracketChartData} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} width={50} />
                  <Tooltip content={<CustomTooltip sym={sym} />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#aaa' }} />
                  <Bar dataKey="Taxable Amount" radius={[0, 0, 0, 0]} name="Taxable Amount">
                    {bracketChartData.map((entry, i) => <Cell key={i} fill={entry.fill} fillOpacity={0.35} />)}
                  </Bar>
                  <Bar dataKey="Tax" radius={[0, 4, 4, 0]} name="Tax Owed">
                    {bracketChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-surface-400 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <th className="text-left py-2 pr-4">Bracket</th>
                      <th className="text-right py-2 pr-4">Range</th>
                      <th className="text-right py-2 pr-4">Taxable</th>
                      <th className="text-right py-2">Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let bkts;
                      if (country === 'US') bkts = US_BRACKETS_DISPLAY;
                      else if (country === 'India') bkts = regime === 'new' ? INDIA_NEW : INDIA_OLD;
                      else bkts = UK_BRACKETS;
                      let prev = 0;
                      return bkts.map((b, i) => {
                        if (taxableIncome <= prev) return null;
                        const lower = prev;
                        const chunk = Math.min(taxableIncome, b.limit) - lower;
                        const tax = chunk * b.rate;
                        prev = b.limit;
                        if (chunk <= 0) return null;
                        return (
                          <tr key={i} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                            <td className="py-2 pr-4">
                              <span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ background: BRACKET_COLORS[i % BRACKET_COLORS.length] }} />
                              <span className="font-mono text-surface-300">{(b.rate * 100).toFixed(0)}%</span>
                            </td>
                            <td className="py-2 pr-4 text-right text-surface-400 font-mono text-xs">
                              {fmt(lower, sym)} – {b.limit === Infinity ? '∞' : fmt(Math.min(taxableIncome, b.limit), sym)}
                            </td>
                            <td className="py-2 pr-4 text-right text-surface-200 font-mono">{fmt(chunk, sym)}</td>
                            <td className="py-2 text-right font-bold font-mono" style={{ color: BRACKET_COLORS[i % BRACKET_COLORS.length] }}>{fmt(Math.round(tax), sym)}</td>
                          </tr>
                        );
                      }).filter(Boolean);
                    })()}
                  </tbody>
                  <tfoot>
                    <tr className="border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                      <td colSpan={3} className="py-2 text-right text-surface-300 font-semibold pr-4">Total Tax</td>
                      <td className="py-2 text-right font-bold text-primary-400 font-mono">{fmt(Math.round(taxLiability), sym)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </motion.div>
          )}

          {country === 'India' && (
            <div className="rounded-2xl p-6" style={cardStyle}>
              <h3 className="text-lg font-semibold text-surface-100 mb-4">Old vs New Regime Comparison</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'New Regime', tax: indiaNewTax, color: 'text-primary-400' },
                  { label: 'Old Regime', tax: indiaOldTax, color: 'text-purple-400' },
                ].map(item => (
                  <div key={item.label} className={`rounded-xl p-4 ${item.label === (regime === 'new' ? 'New Regime' : 'Old Regime') ? 'border-blue-600 bg-primary-500/5' : ''}`}
                    style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-sm text-surface-400 mb-1">{item.label}</p>
                    <p className={`text-xl font-bold ${item.color}`}>{fmt(item.tax, sym)}</p>
                    <p className="text-xs text-surface-400 mt-1">
                      Save {fmt(Math.abs(indiaOldTax - indiaNewTax), sym)} with {indiaNewTax < indiaOldTax ? 'New' : 'Old'} Regime
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collapsible Bracket Table */}
          {country === 'US' && (
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
              <button onClick={() => setTableOpen(v => !v)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors">
                <h3 className="text-lg font-semibold text-surface-100">Federal Tax Brackets (2024)</h3>
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
                              <th className="text-left py-2 pr-4">Rate</th>
                              <th className="text-right py-2 pr-4">Up to</th>
                              <th className="text-right py-2">Applies?</th>
                            </tr>
                          </thead>
                          <tbody>
                            {US_BRACKETS_DISPLAY.map((b, i) => {
                              const prev = i === 0 ? 0 : US_BRACKETS_DISPLAY[i - 1].limit;
                              const applies = taxableIncome > prev;
                              return (
                                <tr key={i} className={`border-b ${applies ? 'bg-blue-900/10' : ''}`} style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                  <td className="py-2 pr-4 font-mono text-surface-300">{(b.rate * 100).toFixed(0)}%</td>
                                  <td className="py-2 pr-4 text-right text-surface-300">{b.limit === Infinity ? 'No limit' : fmt(b.limit, sym)}</td>
                                  <td className="py-2 text-right">{applies ? <span className="text-green-400 text-xs font-medium">✓ Applies</span> : <span className="text-surface-500 text-xs">—</span>}</td>
                                </tr>
                              );
                            })}
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
