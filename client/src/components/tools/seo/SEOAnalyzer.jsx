import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function ScoreBadge({ score }) {
  const color = score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-amber-500' : 'text-red-500';
  const bg = score >= 70 ? 'bg-emerald-500/10 border-emerald-500/20' : score >= 40 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20';
  const label = score >= 70 ? 'Good' : score >= 40 ? 'Needs work' : 'Poor';
  return (
    <div className={`flex flex-col items-center p-4 rounded-2xl border ${bg}`}>
      <span className={`text-4xl font-extrabold font-mono ${color}`}>{score}</span>
      <span className={`text-xs font-semibold mt-1 ${color}`}>{label}</span>
    </div>
  );
}

function MetricRow({ label, value, hint, good }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 last:border-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-surface-200">{label}</p>
        {hint && <p className="text-xs text-surface-400 mt-0.5">{hint}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-mono font-bold text-surface-300">{value}</span>
        {good !== undefined && (
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${good ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
            {good ? '✓' : '✗'}
          </span>
        )}
      </div>
    </div>
  );
}

export default function SEOAnalyzer() {
  const [inputMode, setInputMode] = useState('text');
  const [url, setUrl] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    const text = inputMode === 'url' ? url : htmlContent;
    if (!text.trim()) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/seo/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text, url: inputMode === 'url' ? url : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Analysis failed');
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setResult(null); setError(null); setUrl(''); setHtmlContent(''); };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {!result && (
        <>
          <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
            {[['text', '📝 Paste HTML/Text'], ['url', '🌐 URL']].map(([val, label]) => (
              <button key={val} type="button" onClick={() => setInputMode(val)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${inputMode === val ? 'text-white' : 'text-surface-400 hover:text-surface-200'}`} style={inputMode === val ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : undefined}>{label}</button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {inputMode === 'url' ? (
              <motion.div key="url" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <label className="block text-sm font-semibold text-surface-300 mb-1">Page URL</label>
                <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/page" className="w-full px-4 py-3 rounded-xl text-sm text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </motion.div>
            ) : (
              <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <label className="block text-sm font-semibold text-surface-300 mb-1">HTML or text content</label>
                <textarea value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} rows={8} placeholder="Paste your HTML or page content here..." className="w-full px-4 py-3 rounded-xl text-sm text-surface-100 placeholder-surface-400 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            onClick={handleAnalyze}
            disabled={processing || !(inputMode === 'url' ? url.trim() : htmlContent.trim())}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full min-h-[52px] rounded-2xl text-base font-bold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Analyzing...
              </span>
            ) : 'Analyze SEO'}
          </motion.button>
        </>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Score overview */}
          <div className="grid grid-cols-3 gap-3">
            <ScoreBadge score={result.seoScore ?? result.score ?? 0} />
            <div className="col-span-2 p-4 rounded-2xl space-y-2" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Summary</p>
              {result.metrics?.readability?.fleschReadingEase !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-400">Readability</span>
                  <span className="text-xs font-mono font-bold text-primary-500">{Math.round(result.metrics.readability.fleschReadingEase)}/100</span>
                </div>
              )}
              {result.metrics?.wordCount !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-400">Word count</span>
                  <span className="text-xs font-mono font-bold text-surface-300">{result.metrics.wordCount}</span>
                </div>
              )}
              {result.metrics?.keywordDensity !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-400">Keyword density</span>
                  <span className="text-xs font-mono font-bold text-surface-300">{result.metrics.keywordDensity}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Metrics */}
          {result.metrics && (
            <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Metrics</p>
              {Object.entries(result.metrics).map(([key, val]) => {
                if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
                  return Object.entries(val).map(([subKey, subVal]) => (
                    <MetricRow
                      key={`${key}-${subKey}`}
                      label={subKey.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                      value={typeof subVal === 'boolean' ? (subVal ? 'Yes' : 'No') : String(subVal)}
                      good={typeof subVal === 'boolean' ? subVal : undefined}
                    />
                  ));
                }
                if (Array.isArray(val)) return null;
                return (
                  <MetricRow
                    key={key}
                    label={key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                    value={typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}
                    good={typeof val === 'boolean' ? val : undefined}
                  />
                );
              })}
            </div>
          )}

          {/* Keyword density table */}
          {result.topKeywords && result.topKeywords.length > 0 && (
            <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Top Keywords</p>
              <div className="space-y-2">
                {result.topKeywords.slice(0, 8).map(({ word, count, density }) => (
                  <div key={word} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-surface-300 w-28 truncate">{word}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(density * 10, 100)}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} className="h-full rounded-full" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }} />
                    </div>
                    <span className="text-xs font-mono text-surface-500 w-16 text-right">{count}× ({density}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {result.suggestions && result.suggestions.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3">Suggestions</p>
              <ul className="space-y-2">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-surface-300">
                    <span className="text-amber-500 mt-0.5 shrink-0">→</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Meta tag suggestions */}
          {result.metaSuggestions && (
            <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Meta Tag Suggestions</p>
              <div className="space-y-3">
                {result.metaSuggestions.title && (
                  <div>
                    <p className="text-xs text-surface-400 mb-1">Title tag</p>
                    <code className="block text-xs rounded-lg px-3 py-2 text-surface-300 break-all" style={{ background: 'rgba(255,255,255,0.06)' }}>{result.metaSuggestions.title}</code>
                  </div>
                )}
                {result.metaSuggestions.description && (
                  <div>
                    <p className="text-xs text-surface-400 mb-1">Meta description</p>
                    <code className="block text-xs rounded-lg px-3 py-2 text-surface-300 break-all" style={{ background: 'rgba(255,255,255,0.06)' }}>{result.metaSuggestions.description}</code>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-center">
            <button type="button" onClick={reset} className="text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors">Analyze another page →</button>
          </div>
        </motion.div>
      )}

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-500 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </motion.div>
      )}
    </motion.div>
  );
}
