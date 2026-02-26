import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

function parseCSVToRows(text) {
  const lines = text.trim().split('\n');
  return lines.map(line => {
    const cells = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { cells.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    cells.push(current.trim());
    return cells;
  });
}

export default function ExcelToJSON() {
  const [json, setJson] = useState('');
  const [mode, setMode] = useState('objects'); // 'objects' | 'arrays'
  const [fileName, setFileName] = useState('');
  const [isXlsx, setIsXlsx] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'xlsx') {
      setIsXlsx(true);
      setJson('');
      return;
    }
    setIsXlsx(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rows = parseCSVToRows(ev.target.result);
        if (rows.length === 0) return;
        let result;
        if (mode === 'objects') {
          const headers = rows[0];
          result = rows.slice(1).map(row =>
            Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
          );
        } else {
          result = rows;
        }
        setJson(JSON.stringify(result, null, 2));
      } catch {
        setJson('// Error parsing file');
      }
    };
    reader.readAsText(file);
  };

  // Re-parse when mode changes if we have a file loaded
  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (json && !isXlsx) {
      // Re-trigger by re-reading — just toggle note
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (fileName.replace(/\.[^.]+$/, '') || 'data') + '.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 className="text-lg font-bold text-surface-100">Excel / CSV to JSON</h2>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="mode" value="objects" checked={mode === 'objects'} onChange={() => handleModeChange('objects')} className="accent-blue-500" />
            <span className="text-sm text-surface-300">Array of objects (headers as keys)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="mode" value="arrays" checked={mode === 'arrays'} onChange={() => handleModeChange('arrays')} className="accent-blue-500" />
            <span className="text-sm text-surface-300">Array of arrays</span>
          </label>
        </div>

        <div
          className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-8 text-center cursor-pointer hover:border-primary-500/40 transition-colors"
          onClick={() => fileRef.current.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) { const dt = { target: { files: [f], name: f.name } }; handleFile({ target: { files: [f] } }); setFileName(f.name); }
          }}
        >
          <div className="text-3xl mb-2">📊</div>
          <p className="text-sm text-surface-400">Drop a .csv or .xlsx file here, or click to browse</p>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,text/csv" className="hidden" onChange={handleFile} />
        </div>

        {fileName && <p className="text-sm text-surface-400">File: <span className="font-medium text-surface-300">{fileName}</span></p>}

        {isXlsx && (
          <div className="border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300">
            ℹ️ For .xlsx files, please convert to CSV first using Excel or Google Sheets (File → Download → CSV), then upload the CSV here.
          </div>
        )}
      </div>

      {json && (
        <div className="rounded-2xl p-6 space-y-3" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-surface-300">JSON Output</p>
            <div className="flex gap-2">
              <button onClick={handleCopy} className="px-3 py-1.5 text-sm hover:bg-white/5 text-surface-300 rounded-lg transition-colors">
                {copied ? '✓ Copied' : 'Copy'}
              </button>
              <button onClick={handleDownload} className="px-3 py-1.5 text-sm bg-blue-500 hover:text-white rounded-lg transition-colors">
                Download .json
              </button>
            </div>
          </div>
          <pre className="rounded-xl p-4 text-xs text-surface-200 overflow-auto max-h-96 font-mono">{json}</pre>
        </div>
      )}
    </motion.div>
  );
}
