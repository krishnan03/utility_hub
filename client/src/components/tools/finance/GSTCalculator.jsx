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

const PRESET_RATES = [5, 12, 18, 28];
const PIE_COLORS = ['#3B82F6', '#FF6363', '#FF9F43'];

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
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

const cardStyle = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };

export default function GSTCalculator() {
  const [amount, setAmount] = useState('');
  const [gstRate, setGstRate] = useState(18);
  const [customRate, setCustomRate] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [calcType, setCalcType] = useState('add');
  const [currency, setCurrency] = useState('INR');
  const [tableOpen, setTableOpen] = useState(false);

  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '₹';
  const rate = useCustom ? (Number(customRate) || 0) : gstRate;
  const amountNum = Number(amount) || 0;

  let baseAmount = 0, gstAmount = 0, totalAmount = 0;
  if (amountNum > 0 && rate >= 0) {
    if (calcType === 'add') {
      baseAmount = amountNum;
      gstAmount = amountNum * rate / 100;
      totalAmount = amountNum + gstAmount;
    } else {
      totalAmount = amountNum;
      baseAmount = amountNum / (1 + rate / 100);
      gstAmount = amountNum - baseAmount;
    }
  }

  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;

  const pieData = amountNum > 0 ? [
    { name: 'Base Price', value: baseAmount },
    { name: `CGST (${rate / 2}%)`, value: cgst },
    { name: `SGST (${rate / 2}%)`, value: sgst },
  ] : [];

  const handleExport = () => {
    let report = '=== GST Calculator Report ===\n\n';
    report += `Currency: ${currency}\nAmount: ${fmt(amountNum, sym)}\nGST Rate: ${rate}%\nType: ${calcType === 'add' ? 'Add GST' : 'Remove GST'}\n\n`;
    report += `--- Results ---\nBase Amount: ${fmt(baseAmount, sym)}\nCGST (${rate / 2}%): ${fmt(cgst, sym)}\nSGST (${rate / 2}%): ${fmt(sgst, sym)}\nTotal GST: ${fmt(gstAmount, sym)}\nTotal Amount: ${fmt(totalAmount, sym)}\n`;
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'gst-calculator-report.txt'; a.click();
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
            <label className="text-sm font-medium text-surface-300 block mb-1">Amount</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1000"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-surface-300 block mb-2">GST Rate</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_RATES.map(r => (
              <button key={r} onClick={() => { setGstRate(r); setUseCustom(false); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${!useCustom && gstRate === r ? 'text-white shadow-md scale-105' : 'text-surface-300 hover:bg-white/5'}`}
                style={!useCustom && gstRate === r ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                {r}%
              </button>
            ))}
            <input type="number" value={customRate} onChange={e => { setCustomRate(e.target.value); setUseCustom(true); }}
              placeholder="Custom %"
              className="w-24 px-3 py-2 rounded-xl text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={{ background: 'rgba(255,255,255,0.06)', border: useCustom ? '1px solid #FF6363' : '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-surface-300 block mb-2">Calculation Type</label>
          <div className="flex rounded-xl overflow-hidden w-fit" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            {[{ value: 'add', label: 'Add GST' }, { value: 'remove', label: 'Remove GST' }].map(t => (
              <button key={t.value} onClick={() => setCalcType(t.value)}
                className={`px-5 py-2 text-sm font-medium transition-colors ${calcType === t.value ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`}
                style={calcType === t.value ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {amountNum > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
          <div className="flex justify-end">
            <button onClick={handleExport}
              className="px-4 py-2 rounded-xl text-sm font-medium text-surface-300 hover:text-surface-100 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              📄 Export
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Base Amount', value: fmt(baseAmount, sym) },
              { label: `GST (${rate}%)`, value: fmt(gstAmount, sym), highlight: true },
              { label: 'Total Amount', value: fmt(totalAmount, sym) },
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
            <h3 className="text-lg font-semibold text-surface-100 mb-4">GST Breakdown</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}
                  dataKey="value" labelLine={false} label={PieLabel}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" iconType="circle"
                  formatter={(value) => <span className="text-xs text-surface-300">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Collapsible Breakdown Table */}
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <button onClick={() => setTableOpen(v => !v)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors">
              <h3 className="text-lg font-semibold text-surface-100">Intra-State GST Breakdown</h3>
              <motion.span animate={{ rotate: tableOpen ? 180 : 0 }} transition={{ duration: 0.2 }}
                className="text-surface-400 text-xl">▾</motion.span>
            </button>
            <AnimatePresence>
              {tableOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="px-6 pb-6 space-y-3">
                    {[
                      { label: 'Base Amount', value: baseAmount, note: '' },
                      { label: `CGST (${rate / 2}%)`, value: cgst, note: 'Central GST' },
                      { label: `SGST (${rate / 2}%)`, value: sgst, note: 'State GST' },
                      { label: 'Total GST', value: gstAmount, note: 'CGST + SGST' },
                      { label: 'Total Amount', value: totalAmount, note: 'Base + GST', bold: true },
                    ].map(row => (
                      <div key={row.label} className={`flex items-center justify-between py-2 border-b ${row.bold ? 'font-semibold' : ''}`} style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                        <div>
                          <span className="text-sm text-surface-300">{row.label}</span>
                          {row.note && <span className="text-xs text-surface-500 ml-2">({row.note})</span>}
                        </div>
                        <span className="text-sm font-mono text-surface-200">{fmt(row.value, sym)}</span>
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
