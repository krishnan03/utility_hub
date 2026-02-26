import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

const CURRENCIES = [
  { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' }, { code: 'GBP', symbol: '£' },
  { code: 'INR', symbol: '₹' }, { code: 'AUD', symbol: 'A$' }, { code: 'CAD', symbol: 'C$' },
  { code: 'JPY', symbol: '¥' }, { code: 'SGD', symbol: 'S$' },
];

function fmt(val, symbol) {
  const abs = Math.abs(val);
  const str = `${symbol}${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return val < 0 ? `-${str}` : str;
}

function daysBetween(d1, d2) {
  return (new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24);
}

const CustomTooltip = ({ active, payload, label, sym }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(28,28,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
      <p className="font-bold text-surface-100 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmt(p.value, sym)}</p>
      ))}
    </div>
  );
};

const cardStyle = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };

export default function StockReturnCalculator() {
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [shares, setShares] = useState('');
  const [buyDate, setBuyDate] = useState('');
  const [sellDate, setSellDate] = useState('');
  const [dividends, setDividends] = useState('');
  const [currency, setCurrency] = useState('USD');

  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '$';
  const BP = Number(buyPrice) || 0;
  const SP = Number(sellPrice) || 0;
  const N = Number(shares) || 0;
  const D = Number(dividends) || 0;

  let totalReturn = 0, returnPct = 0, cagr = 0, holdingDays = 0, holdingYears = 0, holdingStr = '';

  if (BP > 0 && SP > 0 && N > 0) {
    const invested = BP * N;
    const proceeds = SP * N + D;
    totalReturn = proceeds - invested;
    returnPct = (totalReturn / invested) * 100;

    if (buyDate && sellDate) {
      holdingDays = daysBetween(buyDate, sellDate);
      holdingYears = holdingDays / 365.25;
      if (holdingYears > 0) {
        cagr = (Math.pow((SP + D / N) / BP, 1 / holdingYears) - 1) * 100;
      }
      const years = Math.floor(holdingDays / 365);
      const months = Math.floor((holdingDays % 365) / 30);
      const days = Math.floor(holdingDays % 30);
      holdingStr = [years > 0 && `${years}y`, months > 0 && `${months}m`, days > 0 && `${days}d`].filter(Boolean).join(' ');
    }
  }

  const hasResult = BP > 0 && SP > 0 && N > 0;

  // Build growth chart data if we have dates
  const chartData = [];
  if (hasResult && buyDate && sellDate && holdingDays > 0) {
    const invested = BP * N;
    const steps = Math.min(20, Math.max(4, Math.ceil(holdingDays / 30)));
    const stepDays = holdingDays / steps;
    for (let i = 0; i <= steps; i++) {
      const d = Math.round(i * stepDays);
      const fraction = d / holdingDays;
      // Linear interpolation for simplicity
      const value = invested + (totalReturn * fraction);
      const date = new Date(new Date(buyDate).getTime() + d * 86400000);
      const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      chartData.push({ date: label, 'Portfolio Value': Math.round(value) });
    }
  }

  const handleExport = () => {
    let report = '=== Stock Return Calculator Report ===\n\n';
    report += `Currency: ${currency}\nBuy Price: ${fmt(BP, sym)}\nSell Price: ${fmt(SP, sym)}\nShares: ${N}\n`;
    if (buyDate) report += `Buy Date: ${buyDate}\n`;
    if (sellDate) report += `Sell Date: ${sellDate}\n`;
    if (D > 0) report += `Dividends: ${fmt(D, sym)}\n`;
    report += `\n--- Results ---\nTotal Return: ${fmt(totalReturn, sym)}\nReturn %: ${returnPct.toFixed(2)}%\n`;
    if (holdingYears > 0) report += `CAGR: ${cagr.toFixed(2)}%\n`;
    if (holdingStr) report += `Holding Period: ${holdingStr}\n`;
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'stock-return-report.txt'; a.click();
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
            <label className="text-sm font-medium text-surface-300 block mb-1">Number of Shares</label>
            <input type="number" value={shares} onChange={e => setShares(e.target.value)} placeholder="e.g. 100"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Buy Price</label>
            <input type="number" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} placeholder="e.g. 100"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Sell Price</label>
            <input type="number" value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder="e.g. 150"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Buy Date</label>
            <input type="date" value={buyDate} onChange={e => setBuyDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Sell Date</label>
            <input type="date" value={sellDate} onChange={e => setSellDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Total Dividends Received</label>
            <input type="number" value={dividends} onChange={e => setDividends(e.target.value)} placeholder="e.g. 200 (optional)"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>
      </div>

      {hasResult && (
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
              { label: 'Total Return', value: fmt(totalReturn, sym), color: totalReturn >= 0 ? 'text-2xl text-green-400' : 'text-2xl text-red-400', highlight: true },
              { label: 'Return %', value: `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%`, color: returnPct >= 0 ? 'text-xl text-green-400' : 'text-xl text-red-400' },
              { label: 'CAGR', value: holdingYears > 0 ? `${cagr.toFixed(2)}%` : 'N/A' },
              { label: 'Holding Period', value: holdingStr || 'N/A' },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
                <p className="text-sm text-surface-400 mb-1">{item.label}</p>
                <p className={`font-bold ${item.color || 'text-xl text-surface-200'}`}>{item.value}</p>
              </div>
            ))}
          </motion.div>

          {/* Line Chart */}
          {chartData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="rounded-2xl p-6" style={cardStyle}>
              <h3 className="text-lg font-semibold text-surface-100 mb-4">Portfolio Value Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradStockLine" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={totalReturn >= 0 ? '#22C55E' : '#FF6363'} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={totalReturn >= 0 ? '#22C55E' : '#FF6363'} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                  <Tooltip content={<CustomTooltip sym={sym} />} />
                  <ReferenceLine y={BP * N} stroke="rgba(255,255,255,0.2)" strokeDasharray="5 5" label={{ value: 'Invested', fill: '#9CA3AF', fontSize: 11, position: 'right' }} />
                  <Line type="monotone" dataKey="Portfolio Value" stroke={totalReturn >= 0 ? '#22C55E' : '#FF6363'} strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
