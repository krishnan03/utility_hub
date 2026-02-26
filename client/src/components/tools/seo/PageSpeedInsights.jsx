import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Score color helpers ──────────────────────────────────────────────
const scoreColor = (score) => {
  if (score >= 0.9) return '#10B981';
  if (score >= 0.5) return '#F59E0B';
  return '#EF4444';
};
const ratingLabel = (score) => {
  if (score >= 0.9) return 'Good';
  if (score >= 0.5) return 'Needs Improvement';
  return 'Poor';
};
const ratingBg = (score) => {
  if (score >= 0.9) return 'rgba(16,185,129,0.1)';
  if (score >= 0.5) return 'rgba(245,158,11,0.1)';
  return 'rgba(239,68,68,0.1)';
};

// ── Circular gauge ───────────────────────────────────────────────────
function ScoreGauge({ score }) {
  const pct = Math.round(score * 100);
  const color = scoreColor(score);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score * circumference);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" viewBox="0 0 120 120" aria-label={`Performance score: ${pct}`}>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <motion.circle
          cx="60" cy="60" r={radius} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="56" textAnchor="middle" className="text-3xl font-bold" fill={color} fontSize="28">{pct}</text>
        <text x="60" y="74" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="10">Performance</text>
      </svg>
      <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: ratingBg(score), color }}>{ratingLabel(score)}</span>
    </div>
  );
}

// ── Metric card ──────────────────────────────────────────────────────
function MetricCard({ name, value, score, description }) {
  const color = scoreColor(score);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4 space-y-2"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-surface-400 font-medium">{name}</span>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: ratingBg(score), color }}>{ratingLabel(score)}</span>
      </div>
      <div className="text-xl font-bold" style={{ color }}>{value || '—'}</div>
      <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(score * 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      {description && <p className="text-xs text-surface-500 line-clamp-2">{description}</p>}
    </motion.div>
  );
}

// ── Collapsible section ──────────────────────────────────────────────
function CollapsibleSection({ title, count, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-surface-300 hover:bg-white/5 transition-colors min-h-[44px]"
      >
        <span>{title} {count > 0 && <span className="text-surface-500">({count})</span>}</span>
        <span className="text-surface-500">{open ? '▲' : '▼'}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Loading skeleton ─────────────────────────────────────────────────
function LoadingSkeleton() {
  const messages = [
    'Connecting to Google PageSpeed API...',
    'Running Lighthouse audit...',
    'Analyzing Core Web Vitals...',
    'Evaluating performance metrics...',
    'Generating improvement suggestions...',
  ];
  const [msgIdx, setMsgIdx] = useState(0);

  useState(() => {
    const interval = setInterval(() => {
      setMsgIdx(prev => (prev + 1) % messages.length);
    }, 4000);
    return () => clearInterval(interval);
  });

  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-[140px] h-[140px] rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <p className="text-sm text-surface-400">{messages[msgIdx]}</p>
        <div className="w-48 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #FF6363, #FF9F43)' }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
        ))}
      </div>
    </div>
  );
}


// ── Core Web Vitals config ───────────────────────────────────────────
const METRICS = [
  { key: 'largest-contentful-paint', name: 'LCP', fullName: 'Largest Contentful Paint' },
  { key: 'total-blocking-time', name: 'TBT', fullName: 'Total Blocking Time (proxy for INP)' },
  { key: 'cumulative-layout-shift', name: 'CLS', fullName: 'Cumulative Layout Shift' },
  { key: 'first-contentful-paint', name: 'FCP', fullName: 'First Contentful Paint' },
  { key: 'speed-index', name: 'SI', fullName: 'Speed Index' },
  { key: 'interactive', name: 'TTI', fullName: 'Time to Interactive' },
];

// ── URL validation ───────────────────────────────────────────────────
function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeUrl(str) {
  let url = str.trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  return url;
}

// ── Main component ───────────────────────────────────────────────────
export default function PageSpeedInsights() {
  const [url, setUrl] = useState('');
  const [strategy, setStrategy] = useState('mobile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const analyze = useCallback(async () => {
    const normalized = normalizeUrl(url);
    if (!isValidUrl(normalized)) {
      setError('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(normalized)}&strategy=${strategy}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const res = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || `API returned ${res.status}`);
      }

      const data = await res.json();
      const lighthouse = data.lighthouseResult;
      if (!lighthouse) throw new Error('No Lighthouse data in response');

      const perfScore = lighthouse.categories?.performance?.score ?? 0;
      const audits = lighthouse.audits || {};

      // Extract metrics
      const metrics = METRICS.map(m => {
        const audit = audits[m.key];
        return {
          ...m,
          value: audit?.displayValue || '—',
          score: audit?.score ?? 0,
          description: audit?.description?.replace(/\[.*?\]\(.*?\)/g, '').trim() || '',
        };
      });

      // Extract opportunities
      const opportunities = Object.values(audits)
        .filter(a => a.details?.type === 'opportunity' && a.score !== null && a.score < 0.9)
        .sort((a, b) => (a.score ?? 1) - (b.score ?? 1))
        .map(a => ({
          title: a.title,
          description: a.description?.replace(/\[.*?\]\(.*?\)/g, '').trim() || '',
          savings: a.details?.overallSavingsMs ? `${Math.round(a.details.overallSavingsMs)} ms` : null,
          score: a.score ?? 0,
        }));

      // Extract diagnostics
      const diagnostics = Object.values(audits)
        .filter(a => a.details?.type === 'table' && a.score !== null && a.score < 0.9 && !opportunities.find(o => o.title === a.title))
        .sort((a, b) => (a.score ?? 1) - (b.score ?? 1))
        .slice(0, 15)
        .map(a => ({
          title: a.title,
          description: a.description?.replace(/\[.*?\]\(.*?\)/g, '').trim() || '',
          displayValue: a.displayValue || '',
          score: a.score ?? 0,
        }));

      setResult({ perfScore, metrics, opportunities, diagnostics, url: normalized });
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Request timed out. The API can take up to 60 seconds — please try again.');
      } else {
        setError(err.message || 'Failed to analyze URL');
      }
    } finally {
      setLoading(false);
    }
  }, [url, strategy]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Input section */}
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && analyze()}
            placeholder="Enter URL to analyze (e.g., example.com)"
            className="flex-1 px-4 py-2.5 rounded-xl text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 min-h-[44px]"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            aria-label="URL to analyze"
          />
          <div className="flex gap-2">
            {/* Strategy toggle */}
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              {['mobile', 'desktop'].map(s => (
                <button
                  key={s}
                  onClick={() => setStrategy(s)}
                  className={`px-3 py-2 text-sm font-medium transition-colors min-h-[44px] ${strategy === s ? 'text-white' : 'text-surface-400 hover:text-surface-200'}`}
                  style={strategy === s ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.04)' }}
                >
                  {s === 'mobile' ? '📱' : '🖥️'} {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={analyze}
              disabled={!url.trim() || loading}
              className="px-5 py-2.5 text-white rounded-xl font-medium transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 min-h-[44px]"
              style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
            >
              {loading ? 'Analyzing...' : '⚡ Analyze'}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl px-4 py-3 text-sm text-red-400"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            ⚠️ {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {loading && <LoadingSkeleton />}

      {/* Results */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Analyzed URL */}
            <div className="text-xs text-surface-500 text-center">
              Results for <span className="text-surface-300 font-mono">{result.url}</span> ({strategy})
            </div>

            {/* Score gauge */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="flex justify-center py-4"
            >
              <ScoreGauge score={result.perfScore} />
            </motion.div>

            {/* Core Web Vitals grid */}
            <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Core Web Vitals</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {result.metrics.map((m, i) => (
                  <MetricCard key={m.key} name={`${m.name} — ${m.fullName}`} value={m.value} score={m.score} description={m.description} />
                ))}
              </div>
            </div>

            {/* Opportunities */}
            {result.opportunities.length > 0 && (
              <CollapsibleSection title="💡 Opportunities" count={result.opportunities.length}>
                {result.opportunities.map((opp, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-lg px-3 py-2.5 text-sm"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-surface-200 font-medium">{opp.title}</span>
                      {opp.savings && (
                        <span className="text-xs px-2 py-0.5 rounded-full text-yellow-400 shrink-0" style={{ background: 'rgba(245,158,11,0.1)' }}>
                          Save ~{opp.savings}
                        </span>
                      )}
                    </div>
                    {opp.description && <p className="text-xs text-surface-500 mt-1">{opp.description}</p>}
                  </motion.div>
                ))}
              </CollapsibleSection>
            )}

            {/* Diagnostics */}
            {result.diagnostics.length > 0 && (
              <CollapsibleSection title="🔍 Diagnostics" count={result.diagnostics.length}>
                {result.diagnostics.map((diag, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-lg px-3 py-2.5 text-sm"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-surface-200 font-medium">{diag.title}</span>
                      {diag.displayValue && <span className="text-xs text-surface-400 shrink-0">{diag.displayValue}</span>}
                    </div>
                    {diag.description && <p className="text-xs text-surface-500 mt-1">{diag.description}</p>}
                  </motion.div>
                ))}
              </CollapsibleSection>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
