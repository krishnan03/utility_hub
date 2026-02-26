import { useState } from 'react';
import { motion } from 'framer-motion';

// Historical ratio context
const SPY_SPX_HISTORY = [
  { year: '2010', ratio: '9.85' },
  { year: '2015', ratio: '9.92' },
  { year: '2020', ratio: '9.97' },
  { year: '2022', ratio: '10.01' },
  { year: '2024', ratio: '10.02' },
  { year: '2026', ratio: '10.02' },
];

const QQQ_NDX_HISTORY = [
  { year: '2010', ratio: '38.2' },
  { year: '2015', ratio: '39.1' },
  { year: '2020', ratio: '40.3' },
  { year: '2022', ratio: '41.2' },
  { year: '2024', ratio: '41.3' },
  { year: '2026', ratio: '41.1' },
];

function ConverterSection({ etf, index, defaultRatio, ratioHistory, ratioNote, etfNote }) {
  const [etfPrice, setEtfPrice] = useState('');
  const [indexValue, setIndexValue] = useState('');
  const [ratio, setRatio] = useState(String(defaultRatio));
  const [lastEdited, setLastEdited] = useState('etf'); // 'etf' or 'index'

  const ratioNum = parseFloat(ratio) || defaultRatio;

  // Compute the result based on which field was last edited
  let computedIndex = '';
  let computedEtf = '';
  let impliedRatio = null;

  const etfNum = parseFloat(etfPrice);
  const indexNum = parseFloat(indexValue);

  if (lastEdited === 'etf' && etfNum > 0) {
    computedIndex = (etfNum * ratioNum).toFixed(2);
  } else if (lastEdited === 'index' && indexNum > 0) {
    computedEtf = (indexNum / ratioNum).toFixed(2);
  }

  // If both are filled, show implied ratio
  if (etfNum > 0 && indexNum > 0) {
    impliedRatio = (indexNum / etfNum).toFixed(4);
  }

  const handleEtfChange = (val) => {
    setEtfPrice(val);
    setLastEdited('etf');
  };

  const handleIndexChange = (val) => {
    setIndexValue(val);
    setLastEdited('index');
  };

  // Quick reference using current ratio
  const quickPairs = Array.from({ length: 9 }, (_, i) => {
    const etfVal = Math.round(defaultRatio * 40 + i * defaultRatio * 5);
    return { etf: etfVal, index: Math.round(etfVal * ratioNum) };
  });

  return (
    <div className="space-y-5">
      {/* Ratio input — the most important field */}
      <div className="p-4 rounded-xl border-2 border-primary-500/30" style={{ background: 'rgba(255,99,99,0.05)' }}>
        <label className="text-sm font-bold text-surface-100 block mb-1">
          Current {index}/{etf} Ratio
          <span className="ml-2 text-xs font-normal text-surface-500">(most important — enter today's actual ratio)</span>
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={ratio}
            onChange={e => setRatio(e.target.value)}
            step="0.01"
            className="w-40 px-3 py-2 rounded-xl text-lg font-mono font-bold text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
          />
          <div className="text-xs text-surface-500 leading-relaxed">
            {ratioNote}
          </div>
        </div>
        {impliedRatio && (
          <div className="mt-2 text-xs text-accent-green font-medium">
            ✓ Implied ratio from your inputs: <span className="font-mono">{impliedRatio}×</span>
            {Math.abs(parseFloat(impliedRatio) - ratioNum) > 0.1 && (
              <span className="text-amber-400 ml-2">— differs from ratio above by {Math.abs(parseFloat(impliedRatio) - ratioNum).toFixed(2)}</span>
            )}
          </div>
        )}
      </div>

      {/* Conversion inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-surface-300 block mb-1">{etf} Price ($)</label>
          <input
            type="number"
            value={etfPrice}
            onChange={e => handleEtfChange(e.target.value)}
            placeholder={`e.g. ${(defaultRatio * 50).toFixed(0)}`}
            className="w-full px-3 py-2.5 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
          {lastEdited === 'index' && computedEtf && (
            <p className="text-xs text-primary-400 mt-1 font-mono">→ {etf} ≈ <strong>${computedEtf}</strong></p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-surface-300 block mb-1">{index} Value</label>
          <input
            type="number"
            value={indexValue}
            onChange={e => handleIndexChange(e.target.value)}
            placeholder={`e.g. ${(defaultRatio * 50 * defaultRatio).toFixed(0)}`}
            className="w-full px-3 py-2.5 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
          {lastEdited === 'etf' && computedIndex && (
            <p className="text-xs text-primary-400 mt-1 font-mono">→ {index} ≈ <strong>{computedIndex}</strong></p>
          )}
        </div>
      </div>

      {/* Result card */}
      {(computedIndex || computedEtf) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl text-center"
          style={{ background: 'rgba(255,99,99,0.08)', border: '1px solid rgba(255,99,99,0.2)' }}
        >
          {lastEdited === 'etf' && computedIndex ? (
            <>
              <p className="text-xs text-surface-500 mb-1">{etf} ${parseFloat(etfPrice).toFixed(2)} × {ratioNum} ratio</p>
              <p className="text-3xl font-black text-primary-400 font-mono">{computedIndex}</p>
              <p className="text-sm text-surface-400 mt-1">{index} estimated value</p>
            </>
          ) : (
            <>
              <p className="text-xs text-surface-500 mb-1">{index} {parseFloat(indexValue).toFixed(2)} ÷ {ratioNum} ratio</p>
              <p className="text-3xl font-black text-primary-400 font-mono">${computedEtf}</p>
              <p className="text-sm text-surface-400 mt-1">{etf} estimated price</p>
            </>
          )}
          <p className="text-xs text-surface-600 mt-2">
            Formula: {lastEdited === 'etf' ? `${index} = ${etf} × ratio` : `${etf} = ${index} ÷ ratio`}
          </p>
        </motion.div>
      )}

      {/* Ratio calculator */}
      <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">How to find today's exact ratio</p>
        <ol className="text-xs text-surface-500 space-y-1 list-decimal list-inside">
          <li>Look up the current {etf} price (e.g. on Yahoo Finance, Google Finance)</li>
          <li>Look up the current {index} value</li>
          <li>Divide: <span className="font-mono text-surface-300">ratio = {index} ÷ {etf}</span></li>
          <li>Enter that ratio above for accurate conversion</li>
        </ol>
        <p className="text-xs text-surface-600">{etfNote}</p>
      </div>

      {/* Historical ratio */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Historical {index}/{etf} Ratio</p>
        <div className="flex gap-3 flex-wrap">
          {ratioHistory.map(h => (
            <div key={h.year} className="text-center">
              <div className="text-xs text-surface-500">{h.year}</div>
              <div className="text-sm font-mono font-bold text-surface-300">{h.ratio}×</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-surface-600 mt-3">
          The ratio drifts over time because the ETF pays dividends (reducing NAV vs the price-only index) and has an annual expense ratio.
        </p>
      </div>

      {/* Quick reference */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">
          Quick Reference at {ratioNum}× ratio
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-surface-500 border-b border-white/5">
                <th className="text-left py-1.5 pr-6">{etf}</th>
                <th className="text-right py-1.5">{index} (≈)</th>
              </tr>
            </thead>
            <tbody>
              {quickPairs.map(pair => (
                <tr key={pair.etf} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-1.5 pr-6 text-surface-300">${pair.etf}</td>
                  <td className="py-1.5 text-right text-primary-400">{pair.index.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function SPYSPXConverter() {
  const [activeTab, setActiveTab] = useState('spy-spx');

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-surface-100">ETF ↔ Index Converter</h2>
        <p className="text-sm text-surface-500 mt-1">
          Convert between ETF prices and their underlying index values using the actual current ratio — not a hardcoded multiplier.
        </p>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { id: 'spy-spx', label: 'SPY ↔ SPX', sub: 'S&P 500' },
          { id: 'qqq-ndx', label: 'QQQ ↔ NDX', sub: 'Nasdaq-100' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150"
            style={activeTab === tab.id
              ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)', color: '#fff' }
              : { color: '#8e8e93' }
            }
          >
            <div>{tab.label}</div>
            <div className="text-xs opacity-70">{tab.sub}</div>
          </button>
        ))}
      </div>

      {/* Important disclaimer */}
      <div className="p-3 rounded-xl text-xs text-amber-400 flex items-start gap-2" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
        <span className="shrink-0 mt-0.5">⚠️</span>
        <span>
          The ratio between an ETF and its index is <strong>not fixed</strong>. It changes daily based on dividends, expense ratios, and market microstructure. Always enter the current ratio for accurate results.
        </span>
      </div>

      {activeTab === 'spy-spx' ? (
        <ConverterSection
          etf="SPY"
          index="SPX"
          defaultRatio={10.02}
          ratioHistory={SPY_SPX_HISTORY}
          ratioNote="SPY launched in 1993 at ~1/10th of SPX. The ratio is close to 10 but drifts. As of Feb 2026 it's approximately 10.02 (SPY $687, SPX 6890)."
          etfNote="SPY (SPDR S&P 500 ETF) has a 0.0945% expense ratio and pays dividends quarterly. SPX is a price-only index — it doesn't include dividends. This causes the ratio to drift over time."
        />
      ) : (
        <ConverterSection
          etf="QQQ"
          index="NDX"
          defaultRatio={41.1}
          ratioHistory={QQQ_NDX_HISTORY}
          ratioNote="QQQ launched in 1999 at ~$50 when NDX was ~2000 (ratio ~40). As of Feb 2026 it's approximately 41.1 (QQQ $608, NDX 24977)."
          etfNote="QQQ (Invesco QQQ Trust) tracks the Nasdaq-100 (NDX) with a 0.20% expense ratio. NDX is a price-only index. The ratio has drifted from ~40 at launch to ~41-42 today."
        />
      )}
    </motion.div>
  );
}
