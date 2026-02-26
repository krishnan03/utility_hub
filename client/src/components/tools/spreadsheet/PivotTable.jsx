import { useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function GlassCard({ children, className = '', style = {}, ...props }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: 'rgba(44,44,46,0.8)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

function parseCSV(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) { cols.push(cur); cur = ''; }
      else cur += ch;
    }
    cols.push(cur);
    rows.push(cols);
  }
  return rows;
}

function generatePivot(data, headers, rowField, colField, valueField, aggFn) {
  const rowIdx = headers.indexOf(rowField);
  const colIdx = colField ? headers.indexOf(colField) : -1;
  const valIdx = headers.indexOf(valueField);

  const groups = {};
  const colValues = new Set();

  for (const row of data) {
    const rowKey = (row[rowIdx] || '').trim() || '(empty)';
    const colKey = colIdx >= 0 ? ((row[colIdx] || '').trim() || '(empty)') : '__total__';
    const val = parseFloat(row[valIdx]) || 0;

    if (!groups[rowKey]) groups[rowKey] = {};
    if (!groups[rowKey][colKey]) groups[rowKey][colKey] = [];
    groups[rowKey][colKey].push(val);
    colValues.add(colKey);
  }

  const aggregate = (values) => {
    if (!values || values.length === 0) return 0;
    switch (aggFn) {
      case 'SUM': return values.reduce((a, b) => a + b, 0);
      case 'COUNT': return values.length;
      case 'AVG': return values.reduce((a, b) => a + b, 0) / values.length;
      case 'MIN': return Math.min(...values);
      case 'MAX': return Math.max(...values);
      default: return values.reduce((a, b) => a + b, 0);
    }
  };

  const sortedCols = [...colValues].sort();
  const pivotRows = Object.entries(groups).map(([rowKey, cols]) => {
    const row = { __rowKey__: rowKey };
    let rowTotal = [];
    for (const col of sortedCols) {
      row[col] = cols[col] ? aggregate(cols[col]) : 0;
      if (cols[col]) rowTotal = rowTotal.concat(cols[col]);
    }
    row.__rowTotal__ = aggregate(rowTotal);
    return row;
  }).sort((a, b) => a.__rowKey__.localeCompare(b.__rowKey__));

  // Column totals
  const colTotals = {};
  let grandValues = [];
  for (const col of sortedCols) {
    const allVals = [];
    for (const row of data) {
      const colKey = colIdx >= 0 ? ((row[colIdx] || '').trim() || '(empty)') : '__total__';
      if (colKey === col) allVals.push(parseFloat(row[valIdx]) || 0);
    }
    colTotals[col] = aggregate(allVals);
    grandValues = grandValues.concat(allVals);
  }
  const grandTotal = aggregate(grandValues);

  return { rows: pivotRows, columns: sortedCols, colTotals, grandTotal };
}

const fmt = (v) => typeof v === 'number' ? (Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 })) : v;

const AGG_OPTIONS = ['SUM', 'COUNT', 'AVG', 'MIN', 'MAX'];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PivotTable() {
  const [rawText, setRawText] = useState('');
  const [headers, setHeaders] = useState([]);
  const [data, setData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [hasData, setHasData] = useState(false);
  const [rowField, setRowField] = useState('');
  const [colField, setColField] = useState('');
  const [valueField, setValueField] = useState('');
  const [aggFn, setAggFn] = useState('SUM');
  const [pivot, setPivot] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  // ─── Load data ───────────────────────────────────────────────────────

  const processCSV = useCallback((text, name) => {
    const rows = parseCSV(text);
    if (rows.length < 2) {
      setError('CSV must have at least a header row and one data row.');
      return;
    }
    const h = rows[0];
    const d = rows.slice(1);
    setHeaders(h);
    setData(d);
    setFileName(name || 'Pasted data');
    setHasData(true);
    setRowField(h[0] || '');
    setColField('');
    setValueField(h.length > 1 ? h[1] : '');
    setPivot(null);
    setError(null);
  }, []);

  const handleFile = useCallback((file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'tsv', 'txt'].includes(ext)) {
      setError('Please upload a CSV, TSV, or TXT file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => processCSV(e.target.result, file.name);
    reader.onerror = () => setError('Failed to read file.');
    reader.readAsText(file);
  }, [processCSV]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handlePaste = useCallback(() => {
    if (!rawText.trim()) return;
    processCSV(rawText, 'Pasted data');
  }, [rawText, processCSV]);

  // ─── Generate pivot ──────────────────────────────────────────────────

  const handleGenerate = useCallback(() => {
    if (!rowField || !valueField) {
      setError('Please select at least a Row field and a Value field.');
      return;
    }
    setError(null);
    const result = generatePivot(data, headers, rowField, colField || null, valueField, aggFn);
    setPivot(result);
  }, [data, headers, rowField, colField, valueField, aggFn]);

  // ─── Export ──────────────────────────────────────────────────────────

  const numericHeaders = useMemo(() => {
    if (!headers.length || !data.length) return headers;
    return headers.filter((_, ci) => {
      let nums = 0;
      for (const row of data.slice(0, 20)) {
        if (!isNaN(parseFloat(row[ci])) && isFinite(row[ci])) nums++;
      }
      return nums / Math.min(data.length, 20) > 0.5;
    });
  }, [headers, data]);

  const exportCSV = useCallback(() => {
    if (!pivot) return;
    const showCol = pivot.columns[0] !== '__total__';
    const colHeaders = showCol ? ['', ...pivot.columns, 'Total'] : ['', aggFn];
    const rows = pivot.rows.map((r) => {
      if (showCol) return [r.__rowKey__, ...pivot.columns.map((c) => fmt(r[c])), fmt(r.__rowTotal__)];
      return [r.__rowKey__, fmt(r.__total__)];
    });
    const csv = [colHeaders, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pivot_table.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [pivot, aggFn]);

  const copyTSV = useCallback(() => {
    if (!pivot) return;
    const showCol = pivot.columns[0] !== '__total__';
    const colHeaders = showCol ? ['', ...pivot.columns, 'Total'] : ['', aggFn];
    const rows = pivot.rows.map((r) => {
      if (showCol) return [r.__rowKey__, ...pivot.columns.map((c) => fmt(r[c])), fmt(r.__rowTotal__)];
      return [r.__rowKey__, fmt(r.__total__)];
    });
    const tsv = [colHeaders, ...rows].map((r) => r.join('\t')).join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [pivot, aggFn]);

  // ─── Reset ───────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setRawText('');
    setHeaders([]);
    setData([]);
    setFileName('');
    setHasData(false);
    setRowField('');
    setColField('');
    setValueField('');
    setPivot(null);
    setError(null);
    setCopied(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const showCol = pivot && pivot.columns[0] !== '__total__';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">

      {/* ── Step 1: Upload / Paste ─────────────────────────────────────── */}
      {!hasData && (
        <>
          <div>
            <label className="block text-sm font-semibold text-surface-300 mb-3">Upload CSV</label>
            <motion.div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              whileHover={{ scale: 1.005 }}
              whileTap={{ scale: 0.995 }}
              className={`relative flex flex-col items-center justify-center min-h-[140px] rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 ${
                dragOver
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-surface-600 hover:border-surface-500 bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <motion.span
                className="text-4xl mb-2"
                animate={dragOver ? { y: -6, scale: 1.1 } : { y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
                aria-hidden="true"
              >
                📊
              </motion.span>
              <p className="text-surface-300 font-semibold text-sm">{dragOver ? 'Drop here' : 'Drag & drop CSV file'}</p>
              <p className="text-surface-500 text-xs">or click to browse · Max 10 MB</p>
              {dragOver && (
                <motion.div className="absolute inset-0 rounded-2xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ background: 'radial-gradient(circle, rgba(255,99,99,0.08) 0%, transparent 70%)' }} />
              )}
            </motion.div>
            <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} className="hidden" aria-label="Upload CSV file" />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-surface-700" />
            <span className="text-xs text-surface-500 font-semibold">OR PASTE DATA</span>
            <div className="flex-1 h-px bg-surface-700" />
          </div>

          <div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={6}
              placeholder={"Name,Region,Sales\nAlice,North,100\nBob,South,200\nAlice,South,150"}
              className="w-full px-4 py-3 rounded-xl text-sm font-mono text-surface-100 placeholder-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all resize-y"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
            <motion.button
              type="button"
              onClick={handlePaste}
              disabled={!rawText.trim()}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="mt-3 w-full min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
            >
              📋 Load Pasted Data
            </motion.button>
          </div>
        </>
      )}

      {/* ── Error ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            ⚠️ {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Step 2: Configure Pivot ────────────────────────────────────── */}
      {hasData && (
        <>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl" aria-hidden="true">📄</span>
              <div>
                <p className="text-sm font-semibold text-surface-200">{fileName}</p>
                <p className="text-xs text-surface-500">{headers.length} columns · {data.length} rows</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5 space-y-4">
            <p className="text-sm font-semibold text-surface-300">Configure Pivot Table</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Row field */}
              <div>
                <label htmlFor="row-field" className="block text-xs font-semibold text-surface-400 mb-1">Row Field (group by)</label>
                <select id="row-field" value={rowField} onChange={(e) => { setRowField(e.target.value); setPivot(null); }}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 min-h-[44px]"
                  style={{ background: 'rgba(44,44,46,0.95)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              {/* Column field */}
              <div>
                <label htmlFor="col-field" className="block text-xs font-semibold text-surface-400 mb-1">Column Field (optional)</label>
                <select id="col-field" value={colField} onChange={(e) => { setColField(e.target.value); setPivot(null); }}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 min-h-[44px]"
                  style={{ background: 'rgba(44,44,46,0.95)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <option value="">— None —</option>
                  {headers.filter((h) => h !== rowField).map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              {/* Value field */}
              <div>
                <label htmlFor="val-field" className="block text-xs font-semibold text-surface-400 mb-1">Value Field</label>
                <select id="val-field" value={valueField} onChange={(e) => { setValueField(e.target.value); setPivot(null); }}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 min-h-[44px]"
                  style={{ background: 'rgba(44,44,46,0.95)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}{numericHeaders.includes(h) ? ' (numeric)' : ''}</option>
                  ))}
                </select>
              </div>

              {/* Aggregation */}
              <div>
                <label htmlFor="agg-fn" className="block text-xs font-semibold text-surface-400 mb-1">Aggregation</label>
                <select id="agg-fn" value={aggFn} onChange={(e) => { setAggFn(e.target.value); setPivot(null); }}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 min-h-[44px]"
                  style={{ background: 'rgba(44,44,46,0.95)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {AGG_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <motion.button
              type="button"
              onClick={handleGenerate}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full min-h-[48px] px-6 py-3 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
            >
              📊 Generate Pivot Table
            </motion.button>
          </GlassCard>
        </>
      )}

      {/* ── Step 3: Pivot Table Result ────────────────────────────────── */}
      <AnimatePresence>
        {pivot && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="space-y-4">
            {/* Stats */}
            <GlassCard className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-2xl" aria-hidden="true">✅</span>
                <div>
                  <p className="text-sm font-semibold text-surface-200">Pivot table generated</p>
                  <p className="text-xs text-surface-500">{pivot.rows.length} groups · {aggFn} of {valueField}{colField ? ` by ${colField}` : ''}</p>
                </div>
              </div>
            </GlassCard>

            {/* Table */}
            <GlassCard className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-4 py-3 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">{rowField}</th>
                      {showCol ? (
                        <>
                          {pivot.columns.map((col) => (
                            <th key={col} className="px-4 py-3 text-right text-xs font-bold text-surface-400 uppercase tracking-wider">{col}</th>
                          ))}
                          <th className="px-4 py-3 text-right text-xs font-bold text-primary-400 uppercase tracking-wider">Total</th>
                        </>
                      ) : (
                        <th className="px-4 py-3 text-right text-xs font-bold text-surface-400 uppercase tracking-wider">{aggFn}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {pivot.rows.map((row, idx) => (
                      <tr key={row.__rowKey__} className={`border-b border-white/[0.03] ${idx % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                        <td className="px-4 py-2.5 text-surface-200 font-semibold">{row.__rowKey__}</td>
                        {showCol ? (
                          <>
                            {pivot.columns.map((col) => (
                              <td key={col} className="px-4 py-2.5 text-right font-mono text-surface-300">{fmt(row[col])}</td>
                            ))}
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-primary-400">{fmt(row.__rowTotal__)}</td>
                          </>
                        ) : (
                          <td className="px-4 py-2.5 text-right font-mono text-surface-300">{fmt(row.__total__)}</td>
                        )}
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="border-t-2 border-white/[0.1]" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-2.5 text-surface-300 font-bold">Total</td>
                      {showCol ? (
                        <>
                          {pivot.columns.map((col) => (
                            <td key={col} className="px-4 py-2.5 text-right font-mono font-bold text-surface-300">{fmt(pivot.colTotals[col])}</td>
                          ))}
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-primary-400">{fmt(pivot.grandTotal)}</td>
                        </>
                      ) : (
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-surface-300">{fmt(pivot.grandTotal)}</td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </GlassCard>

            {/* Export buttons */}
            <div className="flex gap-3">
              <motion.button type="button" onClick={exportCSV} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold text-surface-300 transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                📥 Export CSV
              </motion.button>
              <motion.button type="button" onClick={copyTSV} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold text-surface-300 transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {copied ? '✅ Copied!' : '📋 Copy TSV'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset */}
      {hasData && (
        <button type="button" onClick={handleReset}
          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-sm text-surface-500 hover:text-surface-300 hover:bg-white/[0.04] transition-colors">
          ← Load different data
        </button>
      )}

      {/* ── Privacy notice ─────────────────────────────────────────────── */}
      <p className="text-[11px] text-surface-600 text-center leading-relaxed">
        🔐 100% client-side — your data never leaves your browser. No server processing.
      </p>
    </motion.div>
  );
}
