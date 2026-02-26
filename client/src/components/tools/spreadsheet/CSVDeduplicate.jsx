import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

function parseCSV(text) {
  const lines = text.trim().split('\n');
  return lines.map(line => {
    const cells = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { cells.push(current); current = ''; }
      else { current += ch; }
    }
    cells.push(current);
    return cells;
  });
}

function rowsToCSV(rows) {
  return rows.map(row =>
    row.map(cell => {
      const s = String(cell ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')
  ).join('\n');
}

export default function CSVDeduplicate() {
  const [csvText, setCsvText] = useState('');
  const [dedupeMode, setDedupeMode] = useState('all'); // 'all' | 'columns'
  const [selectedCols, setSelectedCols] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setCsvText(ev.target.result); setResult(null); setError(''); };
    reader.readAsText(file);
  };

  const headers = (() => {
    if (!csvText.trim()) return [];
    try { return parseCSV(csvText)[0] || []; } catch { return []; }
  })();

  const toggleCol = (col) => {
    setSelectedCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };

  const handleDeduplicate = () => {
    if (!csvText.trim()) { setError('Please enter or upload CSV data.'); return; }
    try {
      const rows = parseCSV(csvText);
      if (rows.length < 2) { setError('Need at least a header row and one data row.'); return; }
      const [header, ...data] = rows;
      const seen = new Set();
      const unique = [];
      const dupes = [];

      const colIndices = dedupeMode === 'columns' && selectedCols.length > 0
        ? selectedCols.map(c => header.indexOf(c)).filter(i => i >= 0)
        : null;

      data.forEach(row => {
        const key = colIndices
          ? colIndices.map(i => row[i] ?? '').join('\x00')
          : row.join('\x00');
        if (seen.has(key)) { dupes.push(row); }
        else { seen.add(key); unique.push(row); }
      });

      setResult({ header, unique, dupes, total: data.length });
      setError('');
    } catch {
      setError('Failed to parse CSV.');
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const csv = rowsToCSV([result.header, ...result.unique]);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'deduplicated.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 className="text-lg font-bold text-surface-100">CSV Deduplicator</h2>

        <div
          className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-6 text-center cursor-pointer hover:border-primary-500/40 transition-colors"
          onClick={() => fileRef.current.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { const r = new FileReader(); r.onload = ev => setCsvText(ev.target.result); r.readAsText(f); } }}
        >
          <div className="text-3xl mb-2">📋</div>
          <p className="text-sm text-surface-400">Drop CSV file here or click to browse</p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
        </div>

        <textarea
          rows={5}
          value={csvText}
          onChange={e => { setCsvText(e.target.value); setResult(null); setError(''); }}
          placeholder="Or paste CSV here..."
          className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm"
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-surface-300">Deduplicate by:</p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="dedupeMode" value="all" checked={dedupeMode === 'all'} onChange={() => setDedupeMode('all')} className="accent-blue-500" />
              <span className="text-sm text-surface-300">All columns</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="dedupeMode" value="columns" checked={dedupeMode === 'columns'} onChange={() => setDedupeMode('columns')} className="accent-blue-500" />
              <span className="text-sm text-surface-300">Specific columns</span>
            </label>
          </div>

          {dedupeMode === 'columns' && headers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {headers.map(h => (
                <button
                  key={h}
                  onClick={() => toggleCol(h)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${selectedCols.includes(h) ? 'text-white' : ' text-surface-300 hover:bg-white/5'}`}
                >
                  {h}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button onClick={handleDeduplicate} className="px-4 py-2 bg-blue-500 hover:text-white rounded-xl font-medium transition-colors">
          Remove Duplicates
        </button>
      </div>

      {result && (
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Original rows', value: result.total, color: 'text-surface-300' },
              { label: 'Duplicates removed', value: result.dupes.length, color: 'text-red-500' },
              { label: 'Unique rows', value: result.unique.length, color: 'text-green-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center p-3 rounded-xl">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-surface-400 mt-1">{label}</div>
              </div>
            ))}
          </div>

          <button onClick={handleDownload} className="px-4 py-2 bg-blue-500 hover:text-white rounded-xl font-medium transition-colors">
            Download Deduplicated CSV
          </button>

          {result.dupes.length > 0 && (
            <div>
              <p className="text-sm font-medium text-surface-300 mb-2">Removed duplicates (first 5):</p>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      {result.header.map((h, i) => <th key={i} className="px-2 py-1 text-left text-surface-400">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {result.dupes.slice(0, 5).map((row, ri) => (
                      <tr key={ri} className="border-b bg-red-50 dark:bg-red-900/10" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                        {row.map((cell, ci) => <td key={ci} className="px-2 py-1 text-surface-400">{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
