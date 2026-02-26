import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EXAMPLES = [
  { label: 'Email', pattern: '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}' },
  { label: 'URL', pattern: 'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\\.[a-zA-Z]{2,6}\\b([-a-zA-Z0-9@:%_+.~#?&/=]*)' },
  { label: 'Phone', pattern: '\\+?[1-9]\\d{1,14}' },
  { label: 'IP Address', pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b' },
  { label: 'Date', pattern: '\\d{4}-\\d{2}-\\d{2}' },
  { label: 'Hex Color', pattern: '#?([0-9a-fA-F]{3}){1,2}' },
  { label: 'UUID', pattern: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' },
  { label: 'HTML Tag', pattern: '<([a-z]+)([^>]*)>(.*?)<\\/\\1>' },
  { label: 'Credit Card', pattern: '\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}' },
];

function explainRegex(pattern) {
  const tokens = [];
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];

    // Escaped sequences
    if (ch === '\\' && i + 1 < pattern.length) {
      const next = pattern[i + 1];
      const escapeMap = {
        d: 'digit (0-9)',
        w: 'word character (a-z, A-Z, 0-9, _)',
        s: 'whitespace',
        b: 'word boundary',
        D: 'non-digit',
        W: 'non-word character',
        S: 'non-whitespace',
      };
      if (escapeMap[next]) {
        tokens.push({ token: `\\${next}`, desc: escapeMap[next] });
        i += 2; continue;
      }
      tokens.push({ token: `\\${next}`, desc: `literal "${next}"` });
      i += 2; continue;
    }

    // Character class
    if (ch === '[') {
      let end = pattern.indexOf(']', i + 1);
      if (end === -1) end = pattern.length;
      const cls = pattern.slice(i, end + 1);
      tokens.push({ token: cls, desc: `character class: ${cls}` });
      i = end + 1; continue;
    }

    // Non-capturing group
    if (ch === '(' && pattern.slice(i, i + 3) === '(?:') {
      let depth = 1; let j = i + 3;
      while (j < pattern.length && depth > 0) { if (pattern[j] === '(') depth++; if (pattern[j] === ')') depth--; j++; }
      const grp = pattern.slice(i, j);
      tokens.push({ token: grp, desc: 'non-capturing group' });
      i = j; continue;
    }

    // Named group
    if (ch === '(' && pattern.slice(i, i + 4).match(/\(\?</)) {
      let depth = 1; let j = i + 3;
      while (j < pattern.length && depth > 0) { if (pattern[j] === '(') depth++; if (pattern[j] === ')') depth--; j++; }
      const grp = pattern.slice(i, j);
      const nameMatch = grp.match(/\(\?<([^>]+)>/);
      tokens.push({ token: grp, desc: `named capture group "${nameMatch?.[1] || '?'}"` });
      i = j; continue;
    }

    // Capture group
    if (ch === '(') {
      let depth = 1; let j = i + 1;
      while (j < pattern.length && depth > 0) { if (pattern[j] === '(' && pattern[j-1] !== '\\') depth++; if (pattern[j] === ')' && pattern[j-1] !== '\\') depth--; j++; }
      const grp = pattern.slice(i, j);
      tokens.push({ token: grp, desc: 'capture group' });
      i = j; continue;
    }

    // Quantifiers
    if (ch === '{') {
      const qMatch = pattern.slice(i).match(/^\{(\d+)(?:,(\d*))?\}/);
      if (qMatch) {
        const full = qMatch[0];
        if (qMatch[2] !== undefined) {
          tokens.push({ token: full, desc: qMatch[2] ? `between ${qMatch[1]} and ${qMatch[2]} times` : `${qMatch[1]} or more times` });
        } else {
          tokens.push({ token: full, desc: `exactly ${qMatch[1]} times` });
        }
        i += full.length; continue;
      }
    }

    const simpleMap = {
      '.': 'any character',
      '*': 'zero or more',
      '+': 'one or more',
      '?': 'optional',
      '^': 'start of string',
      $: 'end of string',
      '|': 'or',
    };
    if (simpleMap[ch]) {
      tokens.push({ token: ch, desc: simpleMap[ch] });
      i++; continue;
    }

    // Literal character
    tokens.push({ token: ch, desc: `literal "${ch}"` });
    i++;
  }
  return tokens;
}

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);
  return (
    <button onClick={handleCopy}
      className="text-xs px-3 py-1 rounded-lg transition-colors hover:bg-white/10 text-surface-400 hover:text-surface-200"
      style={{ background: 'rgba(255,255,255,0.06)' }}>
      {copied ? '✓ Copied' : label}
    </button>
  );
}

export default function RegexTester() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState({ g: true, i: false, m: false, s: false });
  const [testStr, setTestStr] = useState('');
  const [replacePattern, setReplacePattern] = useState('');
  const [activeTab, setActiveTab] = useState('match');
  const [showExplanation, setShowExplanation] = useState(false);

  const flagStr = Object.entries(flags).filter(([, v]) => v).map(([k]) => k).join('');

  const result = useMemo(() => {
    if (!pattern || !testStr) return null;
    try {
      const re2 = new RegExp(pattern, flagStr.includes('g') ? flagStr : flagStr + 'g');
      const matches = [];
      let m;
      while ((m = re2.exec(testStr)) !== null) {
        matches.push({
          index: m.index,
          length: m[0].length,
          full: m[0],
          groups: m.slice(1),
          namedGroups: m.groups ? { ...m.groups } : null,
        });
        if (!flagStr.includes('g')) break;
      }
      return { matches, error: null };
    } catch (e) {
      return { matches: [], error: e.message };
    }
  }, [pattern, flagStr, testStr]);

  const replaceResult = useMemo(() => {
    if (!pattern || !testStr || activeTab !== 'replace') return null;
    try {
      const re = new RegExp(pattern, flagStr);
      return { text: testStr.replace(re, replacePattern), error: null };
    } catch (e) {
      return { text: '', error: e.message };
    }
  }, [pattern, flagStr, testStr, replacePattern, activeTab]);

  const highlighted = useMemo(() => {
    if (!result || result.error || !result.matches.length) return null;
    const parts = [];
    let last = 0;
    for (const m of result.matches) {
      if (m.index > last) parts.push({ text: testStr.slice(last, m.index), match: false });
      parts.push({ text: testStr.slice(m.index, m.index + m.length), match: true });
      last = m.index + m.length;
    }
    if (last < testStr.length) parts.push({ text: testStr.slice(last), match: false });
    return parts;
  }, [result, testStr]);

  const explanation = useMemo(() => {
    if (!pattern) return [];
    return explainRegex(pattern);
  }, [pattern]);

  const highlightedText = useMemo(() => {
    if (!highlighted) return '';
    return highlighted.map(p => p.match ? `[${p.text}]` : p.text).join('');
  }, [highlighted]);

  const matchTableText = useMemo(() => {
    if (!result?.matches?.length) return '';
    const lines = result.matches.map((m, i) =>
      `#${i + 1}: "${m.full}" (index: ${m.index}, length: ${m.length})${m.groups.length ? ` groups: [${m.groups.join(', ')}]` : ''}${m.namedGroups ? ` named: ${JSON.stringify(m.namedGroups)}` : ''}`
    );
    return lines.join('\n');
  }, [result]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Presets */}
        <div className="flex flex-wrap gap-2 mb-2">
          {EXAMPLES.map(ex => (
            <button key={ex.label} onClick={() => setPattern(ex.pattern)}
              className="px-3 py-1 text-xs hover:bg-primary-500/30 rounded-lg transition-colors text-surface-300">
              {ex.label}
            </button>
          ))}
        </div>

        {/* Pattern + Flags */}
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-surface-300 block mb-1">Pattern</label>
            <input value={pattern} onChange={e => setPattern(e.target.value)} placeholder="Enter regex pattern..."
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div className="flex gap-2 pb-0.5">
            {['g','i','m','s'].map(f => (
              <label key={f} className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={flags[f]} onChange={e => setFlags(p => ({ ...p, [f]: e.target.checked }))} className="rounded" />
                <span className="text-sm font-mono text-surface-300">{f}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Pattern Explanation (collapsible) */}
        {pattern && (
          <div>
            <button onClick={() => setShowExplanation(v => !v)}
              className="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 transition-colors">
              <span className="text-xs">{showExplanation ? '▼' : '▶'}</span>
              Pattern Explanation
            </button>
            <AnimatePresence>
              {showExplanation && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="mt-2 rounded-xl p-4 space-y-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {explanation.map((t, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        <code className="text-primary-400 font-mono bg-primary-500/10 px-1.5 py-0.5 rounded text-xs shrink-0">{t.token}</code>
                        <span className="text-surface-400">{t.desc}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Test String */}
        <div>
          <label className="text-sm font-medium text-surface-300 block mb-1">Test String</label>
          <textarea rows={5} value={testStr} onChange={e => setTestStr(e.target.value)} placeholder="Enter test string..."
            className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>

        {/* Tabs: Match / Replace */}
        <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {['match', 'replace'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${
                activeTab === tab ? 'bg-primary-500/20 text-primary-400' : 'text-surface-400 hover:text-surface-200'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Replace input */}
        {activeTab === 'replace' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <label className="text-sm font-medium text-surface-300 block mb-1">Replace Pattern</label>
            <input value={replacePattern} onChange={e => setReplacePattern(e.target.value)}
              placeholder="Replacement string (supports $1, $2 backreferences)..."
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </motion.div>
        )}

        {result?.error && <p className="text-red-500 text-sm rounded-xl px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)' }}>{result.error}</p>}

        {/* Match Tab Results */}
        {activeTab === 'match' && result && !result.error && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-surface-300">
                {result.matches.length} match{result.matches.length !== 1 ? 'es' : ''} found
              </div>
              <div className="flex gap-2">
                {highlighted && <CopyButton text={highlightedText} label="Copy Highlighted" />}
                {result.matches.length > 0 && <CopyButton text={matchTableText} label="Copy Matches" />}
              </div>
            </div>
            {highlighted && (
              <div className="font-mono text-sm rounded-xl p-4 whitespace-pre-wrap break-all" style={{ background: 'rgba(255,255,255,0.04)' }}>
                {highlighted.map((p, i) => p.match
                  ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-700/60 text-surface-100 rounded px-0.5">{p.text}</mark>
                  : <span key={i}>{p.text}</span>
                )}
              </div>
            )}
            {result.matches.length > 0 && (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-surface-400 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <th className="py-1 pr-4">#</th>
                    <th className="py-1 pr-4">Match</th>
                    <th className="py-1 pr-4">Index</th>
                    <th className="py-1 pr-4">Length</th>
                    <th className="py-1 pr-4">Groups</th>
                    <th className="py-1">Named Groups</th>
                  </tr>
                </thead>
                <tbody>
                  {result.matches.map((m, i) => (
                    <tr key={i} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      <td className="py-1 pr-4 text-surface-400">{i + 1}</td>
                      <td className="py-1 pr-4 font-mono text-yellow-600 dark:text-yellow-400">{m.full}</td>
                      <td className="py-1 pr-4 font-mono text-surface-300">{m.index}</td>
                      <td className="py-1 pr-4 font-mono text-surface-300">{m.length}</td>
                      <td className="py-1 pr-4 font-mono text-surface-300">{m.groups.length ? m.groups.join(', ') : '—'}</td>
                      <td className="py-1 font-mono text-surface-300">
                        {m.namedGroups ? Object.entries(m.namedGroups).map(([k, v]) => `${k}: ${v}`).join(', ') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Replace Tab Results */}
        {activeTab === 'replace' && replaceResult && (
          <div className="space-y-3">
            {replaceResult.error && <p className="text-red-500 text-sm">{replaceResult.error}</p>}
            {!replaceResult.error && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium text-surface-300">Replace Result</div>
                  <CopyButton text={replaceResult.text} label="Copy Result" />
                </div>
                <pre className="font-mono text-sm rounded-xl p-4 whitespace-pre-wrap break-all text-surface-100"
                  style={{ background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.2)' }}>
                  {replaceResult.text}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
