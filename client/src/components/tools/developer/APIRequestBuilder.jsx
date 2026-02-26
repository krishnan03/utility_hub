import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const METHOD_COLORS = {
  GET: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  POST: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  PUT: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PATCH: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
  HEAD: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  OPTIONS: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

const HEADER_PRESETS = [
  { key: 'Content-Type', value: 'application/json' },
  { key: 'Accept', value: 'application/json' },
  { key: 'Authorization', value: 'Bearer ' },
  { key: 'Cache-Control', value: 'no-cache' },
  { key: 'X-Requested-With', value: 'XMLHttpRequest' },
];

const STATUS_COLORS = {
  2: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  3: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  4: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  5: 'bg-red-500/20 text-red-400 border-red-500/40',
};

const HISTORY_KEY = 'api-builder-history';
const MAX_HISTORY = 10;

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
}
function saveHistory(h) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, MAX_HISTORY)));
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function buildUrl(base, params) {
  if (!base) return '';
  try {
    const url = new URL(base);
    params.forEach(p => { if (p.key && p.enabled) url.searchParams.set(p.key, p.value); });
    return url.toString();
  } catch {
    return base;
  }
}

function toCurl({ method, url, headers, body, auth }) {
  const parts = [`curl -X ${method}`];
  const allHeaders = [...headers.filter(h => h.key && h.enabled)];
  if (auth.type === 'bearer' && auth.token) allHeaders.push({ key: 'Authorization', value: `Bearer ${auth.token}` });
  if (auth.type === 'basic' && auth.username) allHeaders.push({ key: 'Authorization', value: `Basic ${btoa(`${auth.username}:${auth.password}`)}` });
  if (['POST', 'PUT', 'PATCH'].includes(method) && body.type === 'json' && body.content) {
    allHeaders.push({ key: 'Content-Type', value: 'application/json' });
  }
  allHeaders.forEach(h => parts.push(`  -H '${h.key}: ${h.value}'`));
  if (['POST', 'PUT', 'PATCH'].includes(method) && body.type === 'json' && body.content) {
    parts.push(`  -d '${body.content}'`);
  }
  if (['POST', 'PUT', 'PATCH'].includes(method) && body.type === 'form') {
    body.fields.filter(f => f.key && f.enabled).forEach(f => parts.push(`  -d '${encodeURIComponent(f.key)}=${encodeURIComponent(f.value)}'`));
  }
  parts.push(`  '${url}'`);
  return parts.join(' \\\n');
}

const cardStyle = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };
const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' };

function KVRow({ item, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onChange({ ...item, enabled: !item.enabled })}
        className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors ${item.enabled ? 'bg-primary-500/30 text-primary-400' : 'bg-white/5 text-surface-600'}`}
        aria-label={item.enabled ? 'Disable' : 'Enable'}>
        {item.enabled ? '✓' : ''}
      </button>
      <input placeholder="Key" value={item.key} onChange={e => onChange({ ...item, key: e.target.value })}
        className="flex-1 px-2.5 py-1.5 rounded-lg text-sm text-surface-100 focus:outline-none focus:ring-1 focus:ring-primary-500/40 font-mono" style={inputStyle} />
      <input placeholder="Value" value={item.value} onChange={e => onChange({ ...item, value: e.target.value })}
        className="flex-1 px-2.5 py-1.5 rounded-lg text-sm text-surface-100 focus:outline-none focus:ring-1 focus:ring-primary-500/40 font-mono" style={inputStyle} />
      <button onClick={onRemove} className="text-surface-500 hover:text-red-400 transition-colors p-1" aria-label="Remove">✕</button>
    </div>
  );
}

export default function APIRequestBuilder() {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [activeTab, setActiveTab] = useState('headers');
  const [headers, setHeaders] = useState([{ key: '', value: '', enabled: true }]);
  const [body, setBody] = useState({ type: 'json', content: '', fields: [{ key: '', value: '', enabled: true }] });
  const [auth, setAuth] = useState({ type: 'none', token: '', username: '', password: '' });
  const [params, setParams] = useState([{ key: '', value: '', enabled: true }]);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [responseTab, setResponseTab] = useState('body');
  const [copied, setCopied] = useState('');
  const abortRef = useRef(null);

  const finalUrl = buildUrl(url, params);

  const updateKV = (list, setList, idx, val) => {
    const next = [...list];
    next[idx] = val;
    setList(next);
  };
  const removeKV = (list, setList, idx) => setList(list.filter((_, i) => i !== idx));
  const addKV = (list, setList) => setList([...list, { key: '', value: '', enabled: true }]);

  const send = useCallback(async () => {
    if (!url) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    setResponse(null);
    setResponseTab('body');

    try {
      const opts = { method, headers: {}, signal: controller.signal };
      headers.forEach(h => { if (h.key && h.enabled) opts.headers[h.key] = h.value; });
      if (auth.type === 'bearer' && auth.token) opts.headers['Authorization'] = `Bearer ${auth.token}`;
      if (auth.type === 'basic' && auth.username) opts.headers['Authorization'] = 'Basic ' + btoa(`${auth.username}:${auth.password}`);

      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        if (body.type === 'json' && body.content) {
          opts.headers['Content-Type'] = 'application/json';
          opts.body = body.content;
        } else if (body.type === 'form') {
          const fd = new URLSearchParams();
          body.fields.filter(f => f.key && f.enabled).forEach(f => fd.set(f.key, f.value));
          opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
          opts.body = fd.toString();
        }
      }

      const start = performance.now();
      const res = await fetch(finalUrl || url, opts);
      const elapsed = Math.round(performance.now() - start);
      const respHeaders = {};
      res.headers.forEach((v, k) => { respHeaders[k] = v; });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch { /* not json */ }

      const result = {
        status: res.status,
        statusText: res.statusText,
        headers: respHeaders,
        body: json ? JSON.stringify(json, null, 2) : text,
        isJson: !!json,
        time: elapsed,
        size: new Blob([text]).size,
      };
      setResponse(result);

      const entry = { method, url: finalUrl || url, status: res.status, time: elapsed, ts: Date.now() };
      const next = [entry, ...loadHistory().filter(h => !(h.method === method && h.url === entry.url))].slice(0, MAX_HISTORY);
      setHistory(next);
      saveHistory(next);
    } catch (err) {
      if (err.name === 'AbortError') return;
      const msg = err.message || 'Request failed';
      const isCors = msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('CORS');
      setError(isCors
        ? "CORS error — the API server doesn't allow browser requests. Try using a CORS proxy or test from your terminal with cURL."
        : msg);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [method, url, finalUrl, headers, body, auth]);

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 1500);
  };

  const loadFromHistory = (entry) => {
    setUrl(entry.url);
    setMethod(entry.method);
    setShowHistory(false);
  };

  const clearHistory = () => { setHistory([]); saveHistory([]); };

  const tabs = ['headers', 'body', 'auth', 'params'];
  const respTabs = ['body', 'headers'];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      {/* URL Bar */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <div className="flex gap-2">
          <select value={method} onChange={e => setMethod(e.target.value)}
            className={`px-3 py-2.5 rounded-xl font-bold text-sm border focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${METHOD_COLORS[method]}`}
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://api.example.com/users"
            onKeyDown={e => e.key === 'Enter' && send()}
            className="flex-1 px-3 py-2.5 rounded-xl text-surface-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={inputStyle} />
          <button onClick={send} disabled={loading || !url}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}>
            {loading ? '⏳' : '🚀'} Send
          </button>
        </div>
      </div>

      {/* Request Config Tabs */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <div className="flex gap-1 mb-4 border-b border-white/5 pb-2">
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${activeTab === t ? 'bg-white/10 text-white' : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'}`}>
              {t === 'params' ? 'Query Params' : t}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {activeTab === 'headers' && (
              <div className="space-y-2">
                {headers.map((h, i) => (
                  <KVRow key={i} item={h} onChange={v => updateKV(headers, setHeaders, i, v)} onRemove={() => removeKV(headers, setHeaders, i)} />
                ))}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => addKV(headers, setHeaders)} className="text-xs text-primary-400 hover:text-primary-300 transition-colors">+ Add Header</button>
                  <span className="text-surface-600">|</span>
                  <div className="flex gap-1 flex-wrap">
                    {HEADER_PRESETS.map(p => (
                      <button key={p.key} onClick={() => setHeaders([...headers, { ...p, enabled: true }])}
                        className="text-xs px-2 py-0.5 rounded bg-white/5 text-surface-400 hover:text-surface-200 hover:bg-white/10 transition-colors">{p.key}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'body' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  {['none', 'json', 'form'].map(t => (
                    <button key={t} onClick={() => setBody({ ...body, type: t })}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${body.type === t ? 'bg-white/10 text-white' : 'text-surface-400 hover:bg-white/5'}`}>
                      {t === 'json' ? 'JSON' : t === 'form' ? 'Form Data' : 'None'}
                    </button>
                  ))}
                </div>
                {body.type === 'json' && (
                  <textarea value={body.content} onChange={e => setBody({ ...body, content: e.target.value })}
                    placeholder='{"key": "value"}' rows={8}
                    className="w-full px-3 py-2.5 rounded-xl text-surface-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-y" style={inputStyle} />
                )}
                {body.type === 'form' && (
                  <div className="space-y-2">
                    {body.fields.map((f, i) => (
                      <KVRow key={i} item={f}
                        onChange={v => { const next = [...body.fields]; next[i] = v; setBody({ ...body, fields: next }); }}
                        onRemove={() => setBody({ ...body, fields: body.fields.filter((_, j) => j !== i) })} />
                    ))}
                    <button onClick={() => setBody({ ...body, fields: [...body.fields, { key: '', value: '', enabled: true }] })}
                      className="text-xs text-primary-400 hover:text-primary-300 transition-colors">+ Add Field</button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'auth' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  {['none', 'bearer', 'basic'].map(t => (
                    <button key={t} onClick={() => setAuth({ ...auth, type: t })}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors capitalize ${auth.type === t ? 'bg-white/10 text-white' : 'text-surface-400 hover:bg-white/5'}`}>
                      {t === 'bearer' ? 'Bearer Token' : t === 'basic' ? 'Basic Auth' : 'None'}
                    </button>
                  ))}
                </div>
                {auth.type === 'bearer' && (
                  <input value={auth.token} onChange={e => setAuth({ ...auth, token: e.target.value })} placeholder="Enter token..."
                    className="w-full px-3 py-2.5 rounded-xl text-surface-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={inputStyle} />
                )}
                {auth.type === 'basic' && (
                  <div className="grid grid-cols-2 gap-3">
                    <input value={auth.username} onChange={e => setAuth({ ...auth, username: e.target.value })} placeholder="Username"
                      className="px-3 py-2.5 rounded-xl text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={inputStyle} />
                    <input type="password" value={auth.password} onChange={e => setAuth({ ...auth, password: e.target.value })} placeholder="Password"
                      className="px-3 py-2.5 rounded-xl text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={inputStyle} />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'params' && (
              <div className="space-y-2">
                {params.map((p, i) => (
                  <KVRow key={i} item={p} onChange={v => updateKV(params, setParams, i, v)} onRemove={() => removeKV(params, setParams, i)} />
                ))}
                <button onClick={() => addKV(params, setParams)} className="text-xs text-primary-400 hover:text-primary-300 transition-colors">+ Add Parameter</button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Response */}
      <AnimatePresence>
        {(response || error) && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl p-4 space-y-3" style={cardStyle}>
            {error ? (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <span className="text-red-400 text-lg">⚠️</span>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            ) : response && (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-lg text-sm font-bold border ${STATUS_COLORS[String(response.status)[0]] || 'bg-white/10 text-surface-300'}`}>
                    {response.status} {response.statusText}
                  </span>
                  <span className="text-sm text-surface-400">⏱ {response.time}ms</span>
                  <span className="text-sm text-surface-400">📦 {formatBytes(response.size)}</span>
                </div>

                <div className="flex gap-1 border-b border-white/5 pb-2">
                  {respTabs.map(t => (
                    <button key={t} onClick={() => setResponseTab(t)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${responseTab === t ? 'bg-white/10 text-white' : 'text-surface-400 hover:bg-white/5'}`}>{t}</button>
                  ))}
                </div>

                {responseTab === 'body' && (
                  <div className="relative">
                    <pre className="text-sm font-mono text-surface-200 p-3 rounded-xl overflow-auto max-h-96 whitespace-pre-wrap break-all" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      {response.body || '(empty response)'}
                    </pre>
                    <button onClick={() => copyText(response.body, 'resp')}
                      className="absolute top-2 right-2 text-xs px-2 py-1 rounded-lg bg-white/10 text-surface-300 hover:text-white transition-colors">
                      {copied === 'resp' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                )}

                {responseTab === 'headers' && (
                  <div className="space-y-1">
                    {Object.entries(response.headers).map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-sm font-mono">
                        <span className="text-primary-400 shrink-0">{k}:</span>
                        <span className="text-surface-300 break-all">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom bar: cURL + History */}
      <div className="flex gap-3 flex-wrap">
        <button onClick={() => copyText(toCurl({ method, url: finalUrl || url, headers, body, auth }), 'curl')}
          disabled={!url}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-surface-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30" style={cardStyle}>
          {copied === 'curl' ? '✓ Copied cURL' : '📋 Copy as cURL'}
        </button>
        <button onClick={() => setShowHistory(!showHistory)}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-surface-300 hover:text-white hover:bg-white/10 transition-colors" style={cardStyle}>
          📜 History ({history.length})
        </button>
      </div>

      {/* History Panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="rounded-2xl p-4 space-y-2 overflow-hidden" style={cardStyle}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-surface-300">Request History</h3>
              {history.length > 0 && (
                <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-300 transition-colors">Clear All</button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-surface-500">No requests yet</p>
            ) : history.map((h, i) => (
              <button key={i} onClick={() => loadFromHistory(h)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors text-left">
                <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${METHOD_COLORS[h.method]}`}>{h.method}</span>
                <span className="text-sm text-surface-300 truncate flex-1 font-mono">{h.url}</span>
                <span className={`text-xs font-bold ${STATUS_COLORS[String(h.status)[0]] || 'text-surface-400'}`}>{h.status}</span>
                <span className="text-xs text-surface-500">{h.time}ms</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
