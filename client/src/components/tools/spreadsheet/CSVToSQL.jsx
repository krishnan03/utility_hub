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
        if (inQuote && line[i+1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) { cols.push(cur); cur = ''; }
      else cur += ch;
    }
    cols.push(cur);
    rows.push(cols);
  }
  return rows;
}

function inferType(values) {
  const nonEmpty = values.filter(Boolean);
  if (nonEmpty.every(v => /^-?\d+$/.test(v))) return 'INTEGER';
  if (nonEmpty.every(v => /^-?\d*\.?\d+$/.test(v))) return 'DECIMAL(10,2)';
  if (nonEmpty.every(v => /^\d{4}-\d{2}-\d{2}/.test(v))) return 'DATE';
  return 'VARCHAR(255)';
}

function sanitize(name) {
  return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1') || 'col';
}

function sqlEscape(val) {
  if (val === '' || val === null || val === undefined) return 'NULL';
  if (/^-?\d+$/.test(val) || /^-?\d*\.\d+$/.test(val)) return val;
  return `'${val.replace(/'/g, "''")}'`;
}

export default function CSVToSQL() {
  const [csv, setCsv] = useState('');
  const [tableName, setTableName] = useState('my_table');
  const [mode, setMode] = useState('both'); // create | insert | both
  const [copied, setCopied] = useState(false);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCsv(ev.target.result);
    reader.readAsText(file);
    e.target.value = '';
  };

  const rows = parseCSV(csv);
  const headers = rows[0] || [];
  const dataRows = rows.slice(1);
  const safeHeaders = headers.map(sanitize);
  const types = safeHeaders.map((_, i) => inferType(dataRows.map(r => r[i] || '')));

  const createSQL = headers.length > 0
    ? `CREATE TABLE ${sanitize(tableName)} (\n${safeHeaders.map((h, i) => `  ${h} ${types[i]}`).join(',\n')}\n);`
    : '';

  const insertSQL = dataRows.length > 0
    ? dataRows.map(row =>
        `INSERT INTO ${sanitize(tableName)} (${safeHeaders.join(', ')}) VALUES (${row.map(sqlEscape).join(', ')});`
      ).join('\n')
    : '';

  const output = mode === 'create' ? createSQL : mode === 'insert' ? insertSQL : [createSQL, '', insertSQL].filter(Boolean).join('\n');

  const copy = () => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-sm font-medium text-surface-300 mb-1">Table Name</label>
            <input value={tableName} onChange={e => setTableName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-sm font-medium text-surface-300 mb-1">Output</label>
            <select value={mode} onChange={e => setMode(e.target.value)} className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <option value="both">CREATE + INSERT</option>
              <option value="create">CREATE TABLE only</option>
              <option value="insert">INSERT only</option>
            </select>
          </div>
          <button onClick={() => fileRef.current.click()} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-surface-100 rounded-xl font-medium transition-colors text-sm">
            Upload CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">CSV Input</label>
          <textarea value={csv} onChange={e => setCsv(e.target.value)} rows={5}
            placeholder={"id,name,email\n1,Alice,alice@example.com\n2,Bob,bob@example.com"}
            className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm resize-none" />
        </div>
        {headers.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            {safeHeaders.map((h, i) => (
              <span key={h} className="px-2 py-1 rounded-lg font-mono text-surface-300">
                {h}: <span className="text-primary-400">{types[i]}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {output && (
        <div className="rounded-2xl p-6 space-y-3" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-surface-300">Generated SQL</h3>
            <button onClick={copy} className="px-3 py-1.5 text-sm bg-blue-500 hover:text-white rounded-xl font-medium transition-colors">
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre className="rounded-xl p-4 text-xs font-mono text-surface-300 overflow-x-auto max-h-80 whitespace-pre">{output}</pre>
        </div>
      )}
    </motion.div>
  );
}
