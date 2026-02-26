import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LEVEL_COLORS = {
  1: '#FF6363',
  2: '#3B82F6',
  3: '#10B981',
  4: '#8B5CF6',
  5: '#F59E0B',
  6: '#EC4899',
};

const LEVEL_INDENT = { 1: 0, 2: 24, 3: 48, 4: 72, 5: 96, 6: 120 };

function parseHeadings(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const headings = [];
  doc.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el) => {
    headings.push({
      level: parseInt(el.tagName[1]),
      text: el.textContent.trim(),
      tag: el.tagName.toLowerCase(),
    });
  });
  return headings;
}

function analyzeHeadings(headings) {
  const issues = [];
  const h1s = headings.filter((h) => h.level === 1);

  if (h1s.length === 0) {
    issues.push({ type: 'error', message: 'Missing H1 tag — every page should have exactly one H1' });
  }
  if (h1s.length > 1) {
    issues.push({ type: 'warning', message: `Multiple H1 tags found (${h1s.length}) — use only one H1 per page` });
  }

  // Skipped levels
  for (let i = 1; i < headings.length; i++) {
    if (headings[i].level > headings[i - 1].level + 1) {
      const expected = `h${headings[i - 1].level + 1}`;
      issues.push({
        type: 'warning',
        message: `Skipped heading level: ${headings[i - 1].tag} → ${headings[i].tag} (missing ${expected})`,
      });
    }
  }

  // Empty headings
  headings.forEach((h) => {
    if (!h.text) {
      issues.push({ type: 'error', message: `Empty ${h.tag} tag found` });
    }
  });

  // Long headings
  headings.forEach((h) => {
    if (h.text.length > 70) {
      issues.push({
        type: 'info',
        message: `Long heading (${h.text.length} chars): "${h.text.slice(0, 50)}..."`,
      });
    }
  });

  // Duplicates
  const seen = new Set();
  headings.forEach((h) => {
    const key = h.text.toLowerCase();
    if (key && seen.has(key)) {
      issues.push({ type: 'warning', message: `Duplicate heading: "${h.text}"` });
    }
    if (key) seen.add(key);
  });

  return issues;
}

function calculateScore(headings, issues) {
  if (headings.length === 0) return 0;
  let score = 100;
  for (const issue of issues) {
    if (issue.type === 'error') score -= 15;
    else if (issue.type === 'warning') score -= 8;
    else if (issue.type === 'info') score -= 3;
  }
  return Math.max(0, Math.min(100, score));
}

function getScoreColor(score) {
  if (score >= 80) return '#10B981';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

function getScoreLabel(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Needs Work';
  if (score >= 40) return 'Poor';
  return 'Critical';
}

const ISSUE_BADGE = {
  error: { bg: 'rgba(239,68,68,0.15)', text: '#EF4444', label: 'Error' },
  warning: { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', label: 'Warning' },
  info: { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6', label: 'Info' },
};

const SAMPLE_HTML = `<h1>My Website - Home Page</h1>
<h2>About Us</h2>
<h3>Our Mission</h3>
<h3>Our Team</h3>
<h2>Services</h2>
<h4>Web Development</h4>
<h3>Design</h3>
<h2>Blog</h2>
<h3>Latest Posts</h3>
<h3>Latest Posts</h3>
<h2>Contact</h2>`;

export default function HeadingAnalyzer() {
  const [mode, setMode] = useState('paste');
  const [html, setHtml] = useState('');
  const [url, setUrl] = useState('');
  const [analyzed, setAnalyzed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const headings = useMemo(() => {
    if (!analyzed || !html) return [];
    return parseHeadings(html);
  }, [html, analyzed]);

  const issues = useMemo(() => {
    if (headings.length === 0 && analyzed) {
      return [{ type: 'error', message: 'No headings found in the provided HTML' }];
    }
    return analyzeHeadings(headings);
  }, [headings, analyzed]);

  const score = useMemo(() => calculateScore(headings, issues), [headings, issues]);

  const stats = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    headings.forEach((h) => { counts[h.level]++; });
    return counts;
  }, [headings]);

  const handleAnalyze = useCallback(() => {
    setError('');
    if (mode === 'paste') {
      if (!html.trim()) {
        setError('Please paste some HTML to analyze');
        return;
      }
      setAnalyzed(true);
    }
  }, [mode, html]);

  const handleFetchUrl = useCallback(async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/seo/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) throw new Error('Failed to fetch URL');
      const data = await res.json();
      if (data.html) {
        setHtml(data.html);
        setAnalyzed(true);
      } else {
        throw new Error('No HTML returned from server');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch URL. Try pasting HTML directly.');
    } finally {
      setLoading(false);
    }
  }, [url]);

  const handleLoadSample = useCallback(() => {
    setHtml(SAMPLE_HTML);
    setAnalyzed(false);
    setError('');
  }, []);

  const handleReset = useCallback(() => {
    setHtml('');
    setUrl('');
    setAnalyzed(false);
    setError('');
  }, []);

  return (
    <div className="space-y-6">
      {/* Mode tabs */}
      <div className="flex gap-2">
        {[
          { id: 'paste', label: 'Paste HTML', icon: '📋' },
          { id: 'url', label: 'Enter URL', icon: '🌐' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => { setMode(tab.id); setAnalyzed(false); setError(''); }}
            className={`min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              mode === tab.id
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                : 'text-surface-300 hover:bg-white/5'
            }`}
            style={mode !== tab.id ? { background: 'rgba(255,255,255,0.06)' } : undefined}
          >
            <span aria-hidden="true">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      {mode === 'paste' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">
              HTML Source
            </label>
            <button
              type="button"
              onClick={handleLoadSample}
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              Load sample
            </button>
          </div>
          <textarea
            value={html}
            onChange={(e) => { setHtml(e.target.value); setAnalyzed(false); }}
            rows={8}
            placeholder="Paste your HTML here..."
            className="w-full px-4 py-3 rounded-xl text-sm font-mono text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-y transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleAnalyze}
              className="min-h-[44px] px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/20"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
            >
              Analyze Headings
            </button>
            {analyzed && (
              <button
                type="button"
                onClick={handleReset}
                className="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold text-surface-300 hover:bg-white/5 transition-all"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="text-xs font-bold text-surface-500 uppercase tracking-wider block">
            Page URL
          </label>
          <div className="flex gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
            <button
              type="button"
              onClick={handleFetchUrl}
              disabled={loading}
              className="min-h-[44px] px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/20 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
            >
              {loading ? 'Fetching...' : 'Fetch & Analyze'}
            </button>
          </div>
          <p className="text-xs text-surface-500">
            Uses our server to fetch the page. For best results, paste HTML directly.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {analyzed && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Score + Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Score card */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
                className="p-5 rounded-2xl flex items-center gap-5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
              >
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: `conic-gradient(${getScoreColor(score)} ${score * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                  }}
                >
                  <div className="w-16 h-16 rounded-full flex flex-col items-center justify-center" style={{ background: '#1a1a2e' }}>
                    <span className="text-2xl font-extrabold" style={{ color: getScoreColor(score) }}>
                      {score}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-surface-300">Heading Score</p>
                  <p className="text-lg font-extrabold" style={{ color: getScoreColor(score) }}>
                    {getScoreLabel(score)}
                  </p>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {headings.length} heading{headings.length !== 1 ? 's' : ''} found
                  </p>
                </div>
              </motion.div>

              {/* Stats card */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 20 }}
                className="p-5 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
              >
                <p className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-3">
                  Distribution
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((level) => (
                    <div key={level} className="flex items-center gap-2">
                      <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded"
                        style={{ color: LEVEL_COLORS[level], background: `${LEVEL_COLORS[level]}20` }}
                      >
                        H{level}
                      </span>
                      <span className="text-sm font-mono text-surface-300">{stats[level]}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Issues */}
            {issues.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-5 rounded-2xl space-y-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
              >
                <p className="text-xs font-bold text-surface-500 uppercase tracking-wider">
                  Issues ({issues.length})
                </p>
                <div className="space-y-2">
                  {issues.map((issue, i) => {
                    const badge = ISSUE_BADGE[issue.type];
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 + i * 0.04 }}
                        className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.03)' }}
                      >
                        <span
                          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0 mt-0.5"
                          style={{ background: badge.bg, color: badge.text }}
                        >
                          {badge.label}
                        </span>
                        <span className="text-sm text-surface-300">{issue.message}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Heading tree */}
            {headings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-5 rounded-2xl space-y-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
              >
                <p className="text-xs font-bold text-surface-500 uppercase tracking-wider">
                  Heading Hierarchy
                </p>
                <div className="space-y-1">
                  {headings.map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + i * 0.03 }}
                      className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors"
                      style={{ marginLeft: LEVEL_INDENT[h.level] }}
                    >
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                        style={{ color: LEVEL_COLORS[h.level], background: `${LEVEL_COLORS[h.level]}20` }}
                      >
                        {h.tag.toUpperCase()}
                      </span>
                      <span className="text-sm text-surface-200 truncate">
                        {h.text || <em className="text-surface-500">empty</em>}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
