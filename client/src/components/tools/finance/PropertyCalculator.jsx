import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

const CURRENCIES = [
  { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' }, { code: 'GBP', symbol: '£' },
  { code: 'INR', symbol: '₹' }, { code: 'AUD', symbol: 'A$' }, { code: 'CAD', symbol: 'C$' },
  { code: 'JPY', symbol: '¥' }, { code: 'SGD', symbol: 'S$' },
];

const LOCATION_MULTIPLIERS = { metro: 1.4, suburban: 1.0, rural: 0.65 };
const CONDITION_MULTIPLIERS = { excellent: 1.1, good: 1.0, fair: 0.85, poor: 0.7 };

function fmt(val, symbol) {
  return `${symbol}${Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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

const cardStyle = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };

export default function PropertyCalculator() {
  const [size, setSize] = useState('');
  const [unit, setUnit] = useState('sqft');
  const [location, setLocation] = useState('suburban');
  const [age, setAge] = useState('');
  const [condition, setCondition] = useState('good');
  const [basePrice, setBasePrice] = useState('');
  const [currency, setCurrency] = useState('USD');

  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '$';
  const sizeNum = Number(size) || 0;
  const sizeInSqft = unit === 'sqm' ? sizeNum * 10.764 : sizeNum;
  const ageNum = Number(age) || 0;
  const basePriceNum = Number(basePrice) || 0;

  const depreciationFactor = Math.max(0.4, 1 - ageNum * 0.01);
  const locationMult = LOCATION_MULTIPLIERS[location] || 1;
  const conditionMult = CONDITION_MULTIPLIERS[condition] || 1;

  let estimatedValue = 0, pricePerSqft = 0;
  if (sizeInSqft > 0 && basePriceNum > 0) {
    pricePerSqft = basePriceNum * locationMult * conditionMult * depreciationFactor;
    estimatedValue = pricePerSqft * sizeInSqft;
  }

  const low = estimatedValue * 0.85;
  const high = estimatedValue * 1.15;

  // Growth projection (5% annual appreciation for 10 years)
  const growthData = [];
  if (estimatedValue > 0) {
    const appreciationRate = 0.05;
    for (let y = 0; y <= 10; y++) {
      growthData.push({
        year: y,
        'Property Value': Math.round(estimatedValue * Math.pow(1 + appreciationRate, y)),
      });
    }
  }

  const handleExport = () => {
    let report = '=== Property Calculator Report ===\n\n';
    report += `Currency: ${currency}\nSize: ${sizeNum} ${unit}\nLocation: ${location}\nAge: ${ageNum} years\nCondition: ${condition}\nBase Price/sqft: ${fmt(basePriceNum, sym)}\n\n`;
    report += `--- Results ---\nEstimated Value: ${fmt(estimatedValue, sym)}\nPrice Range: ${fmt(low, sym)} – ${fmt(high, sym)}\nPrice/sqft: ${fmt(pricePerSqft, sym)}\n`;
    report += `Depreciation: ${(depreciationFactor * 100).toFixed(0)}%\nLocation Mult: ${locationMult}x\nCondition Mult: ${conditionMult}x\n`;
    if (growthData.length > 0) {
      report += `\n--- 10-Year Growth (5% annual) ---\n`;
      growthData.forEach(d => { report += `Year ${d.year}: ${fmt(d['Property Value'], sym)}\n`; });
    }
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'property-calculator-report.txt'; a.click();
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
            <label className="text-sm font-medium text-surface-300 block mb-1">Property Size</label>
            <div className="flex gap-2">
              <input type="number" value={size} onChange={e => setSize(e.target.value)} placeholder="e.g. 1200"
                className="flex-1 px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                {['sqft', 'sqm'].map(u => (
                  <button key={u} onClick={() => setUnit(u)}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${unit === u ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`}
                    style={unit === u ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Base Price per sq ft</label>
            <input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="e.g. 150"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Property Age (years)</label>
            <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 10"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Location Type</label>
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              {['metro', 'suburban', 'rural'].map(l => (
                <button key={l} onClick={() => setLocation(l)}
                  className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${location === l ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`}
                  style={location === l ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">Condition</label>
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              {['excellent', 'good', 'fair', 'poor'].map(c => (
                <button key={c} onClick={() => setCondition(c)}
                  className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${condition === c ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`}
                  style={condition === c ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {estimatedValue > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
          <div className="flex justify-end">
            <button onClick={handleExport}
              className="px-4 py-2 rounded-xl text-sm font-medium text-surface-300 hover:text-surface-100 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              📄 Export
            </button>
          </div>

          <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
            <p className="text-sm text-surface-400 mb-1">Estimated Property Value</p>
            <p className="text-3xl font-bold text-primary-400">{fmt(estimatedValue, sym)}</p>
            <p className="text-sm text-surface-400 mt-2">Price range: {fmt(low, sym)} – {fmt(high, sym)}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Price / sq ft', value: `${sym}${pricePerSqft.toFixed(0)}` },
              { label: 'Depreciation Factor', value: `${(depreciationFactor * 100).toFixed(0)}%` },
              { label: 'Location Multiplier', value: `${locationMult}×` },
              { label: 'Condition Multiplier', value: `${conditionMult}×` },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
                <p className="text-xs text-surface-400 mb-1">{item.label}</p>
                <p className="text-lg font-bold text-surface-200">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Area Chart */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="rounded-2xl p-6" style={cardStyle}>
            <h3 className="text-lg font-semibold text-surface-100 mb-1">Projected Property Value Growth</h3>
            <p className="text-sm text-surface-400 mb-4">Assuming 5% annual appreciation</p>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={growthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradPropValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6363" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#FF6363" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="year" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickFormatter={v => v >= 10000000 ? `${(v / 10000000).toFixed(1)}Cr` : v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip content={<CustomTooltip sym={sym} />} />
                <Area type="monotone" dataKey="Property Value" stroke="#FF6363" fill="url(#gradPropValue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
