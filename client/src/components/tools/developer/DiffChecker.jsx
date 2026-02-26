import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── LCS diff (line-level) ─────────────────────────────────────────── */
function lcs(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const result = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) { result.unshift({ type: 'same', val: a[i - 1] }); i--; j--; }
    else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) { result.unshift({ type: 'add', val: b[j - 1] }); j--; }
    else { result.unshift({ type: 'remove', val: a[i - 1] }); i--; }
  }
  return result;
}

/* ── Word-level diff for inline highlighting ───────────────────────── */
function wordDiff(oldStr, newStr) {
  const oldWords = oldStr.split(/(\s+)/);
  const newWords = newStr.split(/(\s+)/);
  const m = oldWords.length, n = newWords.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = oldWords[i - 1] === newWords[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const result = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) { result.unshift({ type: 'same', val: oldWords[i - 1] }); i--; j--; }
    else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) { result.unshift({ type: 'add', val: newWords[j - 1] }); j--; }
    else { result.unshift({ type: 'remove', val: oldWords[i - 1] }); i--; }
  }
  return result;
}

/* ── Pair adjacent remove/add lines for word-level diff ────────────── */
function pairDiffLines(diff) {
  const paired = [];
  let i = 0;
  while (i < diff.length) {
    if (diff[i].type === 'remove' && i + 1 < diff.length && diff[i + 1].type === 'add') {
      paired.push({ type: 'change', old: diff[i].val, new: diff[i + 1].val });
      i += 2;
    } else {
      paired.push(diff[i]);
      i++;
    }
  }
  return paired;
}

/* ── Render a line with inline word highlights ─────────────────────── */
function InlineWordDiff({ oldLine, newLine, mode }) {
  const words = wordDiff(oldLine, newLine);
  return (
    <span>
      {words.filter(w => mode === 'remove' ? w.type !== 'add' : w.type !== 'remove').map((w, i) => {
        if (w.type === 'same') return <span key={i}>{w.val}</span>;
        const bg = w.type === 'add' ? 'rgba(48,209,88,0.25)' : 'rgba(255,69,58,0.25)';
        return <span key={i} style={{ background: bg, borderRadius: '2px' }}>{w.val}</span>;
      })}
    </span>
  );
}

/* ── Clipboard icon ────────────────────────────────────────────────── */
function ClipboardIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/* ── Swap icon ─────────────────────────────────────────────────────── */
function SwapIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

/* ── Trash icon ────────────────────────────────────────────────────── */
function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}


/* ── Main Component ────────────────────────────────────────────────── */
export default function DiffChecker() {
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [view, setView] = useState('unified');
  const [copied, setCopied] = useState(false);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);

  // Normalize a line for whitespace-insensitive comparison
  const norm = useCallback((s) => s.replace(/\s+/g, ' ').trim(), []);

  /* line-level diff */
  const diff = useMemo(() => {
    if (!left && !right) return [];
    const leftLines = left.split('\n');
    const rightLines = right.split('\n');

    if (ignoreWhitespace) {
      // Diff on normalized lines, then map results back to originals
      const normLeft = leftLines.map(norm);
      const normRight = rightLines.map(norm);
      const normDiff = lcs(normLeft, normRight);

      // Walk through the diff and pull original lines using counters
      let li = 0, ri = 0;
      return normDiff.map(d => {
        if (d.type === 'same') {
          const val = leftLines[li] || d.val;
          li++; ri++;
          return { type: 'same', val };
        } else if (d.type === 'remove') {
          const val = leftLines[li] || d.val;
          li++;
          return { type: 'remove', val };
        } else {
          const val = rightLines[ri] || d.val;
          ri++;
          return { type: 'add', val };
        }
      });
    }

    return lcs(leftLines, rightLines);
  }, [left, right, ignoreWhitespace, norm]);

  /* paired diff for word-level highlighting */
  const pairedDiff = useMemo(() => pairDiffLines(diff), [diff]);

  /* line stats */
  const stats = useMemo(() => ({
    added: diff.filter(d => d.type === 'add').length,
    removed: diff.filter(d => d.type === 'remove').length,
    same: diff.filter(d => d.type === 'same').length,
  }), [diff]);

  /* character stats */
  const charStats = useMemo(() => {
    let charsAdded = 0, charsRemoved = 0;
    for (const d of diff) {
      if (d.type === 'add') charsAdded += d.val.length;
      else if (d.type === 'remove') charsRemoved += d.val.length;
    }
    return { charsAdded, charsRemoved };
  }, [diff]);

  /* swap left ↔ right */
  const handleSwap = useCallback(() => {
    const tmp = left;
    setLeft(right);
    setRight(tmp);
  }, [left, right]);

  /* clear both */
  const handleClear = useCallback(() => { setLeft(''); setRight(''); }, []);

  /* copy unified diff */
  const handleCopy = useCallback(() => {
    const prefix = { add: '+ ', remove: '- ', same: '  ' };
    const text = diff.map(d => `${prefix[d.type]}${d.val}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [diff]);

  /* ── Build unified view lines with line numbers ──────────────────── */
  const unifiedLines = useMemo(() => {
    const lines = [];
    let leftNum = 0, rightNum = 0;
    for (const entry of pairedDiff) {
      if (entry.type === 'same') {
        leftNum++; rightNum++;
        lines.push({ kind: 'same', val: entry.val, leftNum, rightNum });
      } else if (entry.type === 'remove') {
        leftNum++;
        lines.push({ kind: 'remove', val: entry.val, leftNum, rightNum: null });
      } else if (entry.type === 'add') {
        rightNum++;
        lines.push({ kind: 'add', val: entry.val, leftNum: null, rightNum });
      } else if (entry.type === 'change') {
        leftNum++; rightNum++;
        lines.push({ kind: 'change', old: entry.old, new: entry.new, leftNum, rightNum });
      }
    }
    return lines;
  }, [pairedDiff]);

  /* ── Build side-by-side view rows ────────────────────────────────── */
  const sideBySideRows = useMemo(() => {
    const rows = [];
    let leftNum = 0, rightNum = 0;
    for (const entry of pairedDiff) {
      if (entry.type === 'same') {
        leftNum++; rightNum++;
        rows.push({ leftNum, rightNum, leftVal: entry.val, rightVal: entry.val, kind: 'same' });
      } else if (entry.type === 'remove') {
        leftNum++;
        rows.push({ leftNum, rightNum: null, leftVal: entry.val, rightVal: null, kind: 'remove' });
      } else if (entry.type === 'add') {
        rightNum++;
        rows.push({ leftNum: null, rightNum, leftVal: null, rightVal: entry.val, kind: 'add' });
      } else if (entry.type === 'change') {
        leftNum++; rightNum++;
        rows.push({ leftNum, rightNum, leftVal: entry.old, rightVal: entry.new, kind: 'change' });
      }
    }
    return rows;
  }, [pairedDiff]);

  const lineNumWidth = 'w-10 min-w-[2.5rem]';

  const bgStyles = {
    add: { background: 'rgba(48,209,88,0.1)' },
    remove: { background: 'rgba(255,69,58,0.1)' },
    same: {},
  };

  const textColors = {
    add: 'text-green-400',
    remove: 'text-red-400',
    same: 'text-surface-400',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* ── Text inputs ──────────────────────────────────────────── */}
        <div className={`grid gap-4 ${view === 'side-by-side' ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {view === 'unified' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-surface-300 block mb-1">Original</label>
                <textarea rows={8} value={left} onChange={e => setLeft(e.target.value)} placeholder="Paste original text..."
                  className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm"
                  style={{ background: 'rgba(30,30,32,0.6)', border: '1px solid rgba(255,255,255,0.06)' }} />
              </div>
              <div>
                <label className="text-sm font-medium text-surface-300 block mb-1">Modified</label>
                <textarea rows={8} value={right} onChange={e => setRight(e.target.value)} placeholder="Paste modified text..."
                  className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm"
                  style={{ background: 'rgba(30,30,32,0.6)', border: '1px solid rgba(255,255,255,0.06)' }} />
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-surface-300 block mb-1">Original</label>
                <textarea rows={8} value={left} onChange={e => setLeft(e.target.value)} placeholder="Paste original text..."
                  className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm"
                  style={{ background: 'rgba(30,30,32,0.6)', border: '1px solid rgba(255,255,255,0.06)' }} />
              </div>
              <div>
                <label className="text-sm font-medium text-surface-300 block mb-1">Modified</label>
                <textarea rows={8} value={right} onChange={e => setRight(e.target.value)} placeholder="Paste modified text..."
                  className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm"
                  style={{ background: 'rgba(30,30,32,0.6)', border: '1px solid rgba(255,255,255,0.06)' }} />
              </div>
            </>
          )}
        </div>

        {/* ── Toolbar: stats + actions + view toggle ───────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Stats */}
          <div className="flex gap-3 text-sm flex-wrap">
            <span className="text-green-400 font-medium">+{stats.added} lines</span>
            <span className="text-red-400 font-medium">-{stats.removed} lines</span>
            <span className="text-surface-400">{stats.same} unchanged</span>
            <span className="text-surface-500">|</span>
            <span className="text-green-400/70 text-xs">+{charStats.charsAdded} chars</span>
            <span className="text-red-400/70 text-xs">-{charStats.charsRemoved} chars</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Swap */}
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSwap}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-surface-300 hover:text-surface-100 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)' }} title="Swap sides">
              <SwapIcon /> Swap
            </motion.button>

            {/* Clear */}
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-surface-300 hover:text-surface-100 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)' }} title="Clear both">
              <TrashIcon /> Clear
            </motion.button>

            {/* Copy diff */}
            {diff.length > 0 && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-surface-300 hover:text-surface-100 transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }} title="Copy unified diff">
                <ClipboardIcon /> {copied ? 'Copied!' : 'Copy Diff'}
              </motion.button>
            )}

            {/* Ignore whitespace */}
            <button
              onClick={() => setIgnoreWhitespace(p => !p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${ignoreWhitespace ? 'text-white' : 'text-surface-400 hover:text-surface-200'}`}
              style={ignoreWhitespace ? { background: 'rgba(99,102,241,0.3)', border: '1px solid rgba(99,102,241,0.5)' } : { background: 'rgba(255,255,255,0.04)', border: '1px solid transparent' }}
              title="Ignore whitespace differences"
            >
              {ignoreWhitespace ? '✓ ' : ''}Ignore Whitespace
            </button>

            {/* View toggle */}
            <div className="flex rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
              {['unified', 'side-by-side'].map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-medium transition-all ${view === v ? 'text-white' : 'text-surface-400 hover:text-surface-200'}`}
                  style={view === v ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.6), rgba(139,92,246,0.6))' } : {}}>
                  {v === 'unified' ? 'Unified' : 'Side by Side'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Diff output ──────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {diff.length > 0 && (
            <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {view === 'unified' ? (
                /* ── Unified view ──────────────────────────────────── */
                <div className="font-mono text-sm rounded-xl overflow-auto max-h-[32rem]" style={{ background: 'rgba(20,20,22,0.6)' }}>
                  {unifiedLines.map((line, i) => {
                    if (line.kind === 'change') {
                      return (
                        <div key={i}>
                          <div className="flex text-red-400" style={bgStyles.remove}>
                            <span className={`${lineNumWidth} text-right pr-2 select-none opacity-40 shrink-0`}>{line.leftNum}</span>
                            <span className={`${lineNumWidth} text-right pr-2 select-none opacity-40 shrink-0`}></span>
                            <span className="select-none opacity-50 mr-1 shrink-0">- </span>
                            <span className="flex-1 whitespace-pre"><InlineWordDiff oldLine={line.old} newLine={line.new} mode="remove" /></span>
                          </div>
                          <div className="flex text-green-400" style={bgStyles.add}>
                            <span className={`${lineNumWidth} text-right pr-2 select-none opacity-40 shrink-0`}></span>
                            <span className={`${lineNumWidth} text-right pr-2 select-none opacity-40 shrink-0`}>{line.rightNum}</span>
                            <span className="select-none opacity-50 mr-1 shrink-0">+ </span>
                            <span className="flex-1 whitespace-pre"><InlineWordDiff oldLine={line.old} newLine={line.new} mode="add" /></span>
                          </div>
                        </div>
                      );
                    }
                    const prefix = line.kind === 'add' ? '+ ' : line.kind === 'remove' ? '- ' : '  ';
                    return (
                      <div key={i} className={`flex ${textColors[line.kind]} py-px`} style={bgStyles[line.kind]}>
                        <span className={`${lineNumWidth} text-right pr-2 select-none opacity-40 shrink-0`}>{line.leftNum ?? ''}</span>
                        <span className={`${lineNumWidth} text-right pr-2 select-none opacity-40 shrink-0`}>{line.rightNum ?? ''}</span>
                        <span className="select-none opacity-50 mr-1 shrink-0">{prefix}</span>
                        <span className="flex-1 whitespace-pre">{line.val}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ── Side-by-side view ─────────────────────────────── */
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {/* Left panel */}
                  <div className="rounded-xl overflow-auto max-h-[32rem]" style={{ background: 'rgba(20,20,22,0.6)' }}>
                    {sideBySideRows.map((row, i) => {
                      const isChange = row.kind === 'change';
                      const isRemove = row.kind === 'remove' || isChange;
                      const bg = isRemove ? bgStyles.remove : bgStyles.same;
                      const color = isRemove ? textColors.remove : textColors.same;
                      return (
                        <div key={i} className={`flex ${color} py-px`} style={bg}>
                          <span className={`${lineNumWidth} text-right pr-2 select-none opacity-40 shrink-0`}>{row.leftNum ?? ''}</span>
                          <span className="flex-1 whitespace-pre">
                            {row.leftVal == null ? '\u00a0' : isChange
                              ? <InlineWordDiff oldLine={row.leftVal} newLine={row.rightVal} mode="remove" />
                              : row.leftVal || '\u00a0'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Right panel */}
                  <div className="rounded-xl overflow-auto max-h-[32rem]" style={{ background: 'rgba(20,20,22,0.6)' }}>
                    {sideBySideRows.map((row, i) => {
                      const isChange = row.kind === 'change';
                      const isAdd = row.kind === 'add' || isChange;
                      const bg = isAdd ? bgStyles.add : bgStyles.same;
                      const color = isAdd ? textColors.add : textColors.same;
                      return (
                        <div key={i} className={`flex ${color} py-px`} style={bg}>
                          <span className={`${lineNumWidth} text-right pr-2 select-none opacity-40 shrink-0`}>{row.rightNum ?? ''}</span>
                          <span className="flex-1 whitespace-pre">
                            {row.rightVal == null ? '\u00a0' : isChange
                              ? <InlineWordDiff oldLine={row.leftVal} newLine={row.rightVal} mode="add" />
                              : row.rightVal || '\u00a0'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
