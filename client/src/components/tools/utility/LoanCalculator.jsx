import { useState } from 'react';
import { motion } from 'framer-motion';

const CURRENCIES = [
  { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' }, { code: 'GBP', symbol: '£' },
  { code: 'INR', symbol: '₹' }, { code: 'JPY', symbol: '¥' }, { code: 'CAD', symbol: 'CA$' },
  { code: 'AUD', symbol: 'A$' },
];

function fmt(symbol, value) {
  return `${symbol}${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function LoanCalculator() {
  const [loanAmount, setLoanAmount] = useState('200000');
  const [rate, setRate] = useState('7.5');
  const [termYears, setTermYears] = useState('20');
  const [downPayment, setDownPayment] = useState('20000');
  const [currency, setCurrency] = useState('USD');
  const [result, setResult] = useState(null);

  const symbol = CURRENCIES.find(c => c.code === currency)?.symbol || '$';

  const calculate = () => {
    const P = parseFloat(loanAmount) - parseFloat(downPayment || 0);
    const annualRate = parseFloat(rate) / 100;
    const n = parseFloat(termYears) * 12;
    const r = annualRate / 12;

    if (P <= 0 || r <= 0 || n <= 0) return;

    const monthly = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPayment = monthly * n;
    const totalInterest = totalPayment - P;

    // Yearly amortization summary
    const yearly = [];
    let balance = P;
    for (let y = 1; y <= parseFloat(termYears); y++) {
      let yearInterest = 0;
      let yearPrincipal = 0;
      for (let m = 0; m < 12; m++) {
        const interestPayment = balance * r;
        const principalPayment = monthly - interestPayment;
        yearInterest += interestPayment;
        yearPrincipal += principalPayment;
        balance -= principalPayment;
        if (balance < 0) balance = 0;
      }
      yearly.push({ year: y, principal: yearPrincipal, interest: yearInterest, balance: Math.max(0, balance) });
    }

    setResult({ monthly, totalPayment, totalInterest, effectiveLoan: P, yearly });
  };

  const Field = ({ label, value, onChange, prefix }) => (
    <div>
      <label className="block text-sm font-medium text-surface-300 mb-1">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${prefix ? 'pl-7' : ''}`}
        />
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-surface-100">Loan Calculator</h2>
          <select value={currency} onChange={e => setCurrency(e.target.value)} className="px-3 py-1.5 rounded-xl text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>>
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Loan Amount" value={loanAmount} onChange={setLoanAmount} prefix={symbol} />
          <Field label="Down Payment" value={downPayment} onChange={setDownPayment} prefix={symbol} />
          <Field label="Annual Interest Rate (%)" value={rate} onChange={setRate} />
          <Field label="Loan Term (years)" value={termYears} onChange={setTermYears} />
        </div>

        <button onClick={calculate} className="px-4 py-2 bg-blue-500 hover:text-white rounded-xl font-medium transition-colors">
          Calculate
        </button>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Monthly Payment', value: fmt(symbol, result.monthly), highlight: true },
              { label: 'Total Payment', value: fmt(symbol, result.totalPayment) },
              { label: 'Total Interest', value: fmt(symbol, result.totalInterest) },
              { label: 'Effective Loan', value: fmt(symbol, result.effectiveLoan) },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="rounded-2xl p-4 text-center" style={{ background: 'rgba(44,44,46,0.8)', border: highlight ? '1px solid rgba(255,99,99,0.4)' : '1px solid rgba(255,255,255,0.08)' }}>
                <div className={`text-xl font-bold ${highlight ? 'text-primary-400' : 'text-surface-100'}`}>{value}</div>
                <div className="text-xs text-surface-400 mt-1">{label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-6" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-sm font-medium text-surface-300 mb-3">Yearly Amortization Summary</p>
            <div className="overflow-x-auto">
              <table className="text-sm w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    {['Year', 'Principal', 'Interest', 'Balance'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-surface-300">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.yearly.map(row => (
                    <tr key={row.year} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      <td className="px-3 py-2 text-surface-400">{row.year}</td>
                      <td className="px-3 py-2 text-green-600 dark:text-green-400">{fmt(symbol, row.principal)}</td>
                      <td className="px-3 py-2 text-red-500">{fmt(symbol, row.interest)}</td>
                      <td className="px-3 py-2 text-surface-400">{fmt(symbol, row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
