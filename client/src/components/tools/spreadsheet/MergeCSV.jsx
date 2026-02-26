import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

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

function toCSV(rows) {
  return rows.map(r =>
    r.map(c => /[,"\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c).join(',')
  ).join('\n');
}

export default function MergeCSV() {
  const [files, setFiles] = useState([]); // { name, rows }
  const [strategy, setStrategy] = useState('stack');
  const [joinCol, setJoinCol] = useState('');
  const [merged, setMerged] = useState(null);
  const fileRef = useRef();

  const addFiles = (newFiles) => {
    const readers = Array.from(newFiles).map(file =>
      new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = ev => resolve({ name: file.name, rows: parseCSV(ev.target.result) });
        reader.readAsText(file);
      })
    );
    Promise.all(readers).then(results => setFiles(f => [...f, ...results]));
  };

  const handleInput = (e) => { addFiles(e.target.files); e.target.value = ''; };
  const handleDrop = (e) => { e.preventDefault(); addFiles(e.dataTransfer.files); };
  const removeFile = (i) => setFiles(f => f.filter((_, idx) => idx !== i));

  const merge = () => {
    if (files.length === 0) return;

    if (strategy === 'stack') {
      const headers = files[0].rows[0] || [];
      const dataRows = files.flatMap(f => f.rows.slice(1));
      setMerged([headers, ...dataRows]);
    } else {
      // Join by common column
      const allHeaders = files.map(f => f.rows[0] || []);
      const joinIdx = allHeaders.map(h => h.indexOf(joinCol));
      if (joinIdx.some(i => i === -1)) {
        alert(`Column "${joinCol}" not found in all files.`);
        return;
      }
      // Build map from first file
      const base = files[0];
      const baseHeaders = base.rows[0];
      const map = new Map();
      base.rows.slice(1).forEach(row => map.set(row[joinIdx[0]], [...row]));

      // Merge subsequent files
      for (let fi = 1; fi < files.length; fi++) {
        const fHeaders = files[fi].rows[0];
        const extraCols = fHeaders.filter((_, ci) => ci !== joinIdx[fi]);
        files[fi].rows.slice(1).forEach(row => {
          const key = row[joinIdx[fi]];
          const extra = row.filter((_, ci) => ci !== joinIdx[fi]);
          if (map.has(key)) map.get(key).push(...extra);
          else map.set(key, [...Array(baseHeaders.length).fill(''), ...extra]);
        });
        // Add extra headers
        baseHeaders.push(...extraCols);
      }

      setMerged([baseHeaders, ...map.values()]);
    }
  };

  const download = () => {
    if (!merged) return;
    const blob = new Blob([toCSV(merged)], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'merged.csv'; a.click();
  };

  const allHeaders = files.length > 0 ? (files[0].rows[0] || []) : [];
  const commonCols = files.length > 1
    ? allHeaders.filter(h => files.every(f => (f.rows[0] || []).includes(h)))
    : allHeaders;

  const preview = merged ? merged.slice(0, 6) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div
          onDrop={handleDrop} onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current.click()}
          className="border-2 border-dashed border-white/20 hover:border-primary-500/40 rounded-2xl p-8 text-center cursor-pointer transition-colors group">
          <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">📂</div>
          <p className="text-sm text-surface-400">Drop multiple CSV files or click to select</p>
          <input ref={fileRef} type="file" accept=".csv" multiple className="hidden" onChange={handleInput} />
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl px-4 py-2.5">
                <span className="text-sm font-mono text-surface-100 flex-1 truncate">{f.name}</span>
                <span className="text-xs text-surface-400">{f.rows.length - 1} rows</span>
                <button onClick={() => removeFile(i)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {files.length >= 2 && (
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex gap-2">
            {[['stack', 'Stack (append rows)'], ['join', 'Join (by column)']].map(([val, label]) => (
              <button key={val} onClick={() => setStrategy(val)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${strategy === val ? 'text-white' : ' text-surface-300 hover:bg-white/5'}`}>
                {label}
              </button>
            ))}
          </div>

          {strategy === 'join' && (
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">Join Column</label>
              <select value={joinCol} onChange={e => setJoinCol(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <option value="">Select common column...</option>
                {commonCols.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          )}

          <button onClick={merge} className="px-4 py-2 bg-blue-500 hover:text-white rounded-xl font-medium transition-colors">
            Merge {files.length} Files
          </button>
        </div>
      )}

      {merged && (
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-semibold text-surface-100">Merged Result</span>
              <span className="text-sm text-surface-400 ml-2">{merged.length - 1} rows · {(merged[0] || []).length} columns</span>
            </div>
            <button onClick={download} className="px-4 py-2 bg-blue-500 hover:text-white rounded-xl font-medium transition-colors text-sm">
              Download merged.csv
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="">
                  {(merged[0] || []).map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left text-xs font-semibold text-surface-400 border-b whitespace-nowrap" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(1).map((row, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2 text-surface-100 whitespace-nowrap max-w-[160px] truncate">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {merged.length > 6 && <p className="text-xs text-surface-500 text-center">Showing first 5 of {merged.length - 1} rows</p>}
        </div>
      )}
    </motion.div>
  );
}
