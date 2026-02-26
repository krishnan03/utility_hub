import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const cardStyle = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };
const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' };
const btnGradient = { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' };

function statusColor(code) {
  if (code >= 200 && code < 300) return '#22C55E';
  if (code >= 300 && code < 400) return '#FF9F43';
  if (code >= 400 && code < 500) return '#EF4444';
  if (code >= 500) return '#DC2626';
  return '#6B7280';
}

function statusBg(code) {
  if (code >= 200 && code < 300) return 'rgba(34,197,94,0.1)';
  if (code >= 300 && code < 400) return 'rgba(255,159,67,0.1)';
  if (code >= 400) return 'rgba(239,68,68,0.1)';
  return 'rgba(107,114,128,0.1)';
}

function detectIssues(chain) {
  const issues = [];
  if (chain.length > 4) issues.push({ type: 'warning', msg: `Long redirect chain (${chain.length} hops) — may hurt SEO and page speed` });
  const loop = chain.find(c => c.status === 0 && c.statusText.includes('Loop'));
  if (loop) issues.push({ type: 'error', msg: 'Redirect loop detected — this URL will never resolve' });
  const protocols = chain.map(c => { try { return new URL(c.url).protocol; } catch { return ''; } });
  for (let i = 1; i < protocols.length; i++) {
    if (protocols[i - 1] === 'https:' && protocols[i] === 'http:') {
      issues.push({ type: 'warning', msg: `HTTPS → HTTP downgrade at hop ${i + 1} — insecure redirect` });
      break;
    }
  }
  const httpToHttps = protocols[0] === 'http:' && protocols.some(p => p === 'https:');
  if (httpToHttps) issues.push({ type: 'info', msg: 'HTTP → HTTPS upgrade detected (good practice)' });
  return issues;
}

export default function RedirectChecker() {
  const [url, setUrl] = useState('');
  const [chain, setChain] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState(false);

  const handleCheck = async () => {
    let input = url.trim();
    if (!input) { setError('Please enter a URL.'); return; }
    if (!/^https?:\/\//i.test(input)) input = 'https://' + input;
    try { new URL(input); } catch { setError('Invalid URL format.'); return; }

    setLoading(true);
    setError('');
    setChain([]);
    setChecked(false);
    try {
      const res = await fetch('/api/seo/redirect-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: input }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Check failed');
      setChain(data.chain);
      setChecked(true);
    } catch (e) {
      setError(e.message || 'Failed to check redirects.');
    } finally {
      setLoading(false);
    }
  };

  const issues = checked ? detectIssues(chain) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <h2 className="text-lg font-bold text-surface-100">Redirect Chain Checker</h2>
        <p className="text-xs text-surface-500">Enter a URL to follow its redirect chain and detect issues.</p>

        <div className="flex gap-3">
          <input type="url" value={url} onChange={e => { setUrl(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleCheck()}
            placeholder="https://example.com or example.com"
            className="flex-1 px-3 py-2.5 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            style={inputStyle} />
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleCheck} disabled={loading}
            className="px-5 py-2.5 rounded-xl font-medium text-white min-h-[44px] disabled:opacity-50 whitespace-nowrap"
            style={btnGradient}>
            {loading ? 'Checking...' : 'Check Redirects'}
          </motion.button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      <AnimatePresence>
        {checked && chain.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-4">

            {/* Issues */}
            {issues.length > 0 && (
              <div className="rounded-2xl p-5 space-y-2" style={cardStyle}>
                <p className="text-sm font-semibold text-surface-300">Issues & Notes</p>
                {issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg"
                    style={{ background: issue.type === 'error' ? 'rgba(239,68,68,0.08)' : issue.type === 'warning' ? 'rgba(255,159,67,0.08)' : 'rgba(59,130,246,0.08)' }}>
                    <span>{issue.type === 'error' ? '🔴' : issue.type === 'warning' ? '🟡' : '🔵'}</span>
                    <span className={issue.type === 'error' ? 'text-red-400' : issue.type === 'warning' ? 'text-amber-400' : 'text-blue-400'}>{issue.msg}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Chain visualization */}
            <div className="rounded-2xl p-6 space-y-1" style={cardStyle}>
              <p className="text-sm font-semibold text-surface-300 mb-4">
                Redirect Chain ({chain.length} hop{chain.length !== 1 ? 's' : ''})
              </p>
              <div className="space-y-0">
                {chain.map((hop, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }} className="flex items-stretch gap-0">
                    <div className="flex flex-col items-center w-10 shrink-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: statusColor(hop.status) }}>
                        {hop.status || '?'}
                      </div>
                      {i < chain.length - 1 && (
                        <div className="w-0.5 flex-1 min-h-[24px]" style={{ background: 'rgba(255,255,255,0.1)' }} />
                      )}
                    </div>
                    <div className="flex-1 pb-4 pl-2 min-w-0">
                      <div className="rounded-xl p-3" style={{ background: statusBg(hop.status), border: `1px solid ${statusColor(hop.status)}22` }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold text-white"
                            style={{ background: statusColor(hop.status) }}>
                            {hop.status || 'ERR'} {hop.statusText}
                          </span>
                          {i === chain.length - 1 && hop.status >= 200 && hop.status < 300 && (
                            <span className="text-xs text-green-400 font-medium">✓ Final destination</span>
                          )}
                        </div>
                        <p className="text-sm font-mono text-surface-200 mt-1.5 break-all">{hop.url}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
