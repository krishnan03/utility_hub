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

export default function ExcelToCSV() {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError(''); setRows([]);
    setFileName(file.name);

    if (file.name.endsWith('.csv') || file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = ev => { setRows(parseCSV(ev.target.result)); };
      reader.readAsText(file);
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      setError('Excel (.xlsx/.xls) files require the SheetJS (xlsx) library. Please convert to CSV first, or install the xlsx package: npm install xlsx');
    } else {
      setError('Unsupported file type. Please upload a .csv, .xlsx, or .xls file.');
    }
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) { const dt = new DataTransfer(); dt.items.add(file); fileRef.current.files = dt.files; handleFile({ target: fileRef.current }); }
  };

  const downloadCSV = () => {
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = fileName.replace(/\.(xlsx?|csv)$/i, '') + '.csv'; a.click();
  };

  const preview = rows.slice(0, 10);
  const headers = rows[0] || [];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div
          onDrop={handleDrop} onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current.click()}
          className="border-2 border-dashed border-white/20 hover:border-primary-500/40 rounded-2xl p-10 text-center cursor-pointer transition-colors group">
          <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📊</div>
          <p className="text-sm text-surface-400">Drop a CSV or Excel file here, or click to upload</p>
          <p className="text-xs text-surface-500 mt-1">.csv supported natively · .xlsx/.xls requires xlsx package</p>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
        </div>
        {error && (
          <div className="border rounded-xl p-4 text-sm text-orange-300">
            ⚠️ {error}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-semibold text-surface-100">{fileName}</span>
              <span className="text-sm text-surface-400 ml-2">{rows.length} rows · {headers.length} columns</span>
            </div>
            <button onClick={downloadCSV} className="px-4 py-2 bg-blue-500 hover:text-white rounded-xl font-medium transition-colors text-sm">
              Download CSV
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="">
                  {headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left text-xs font-semibold text-surface-400 border-b whitespace-nowrap" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>{h || `Col ${i+1}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(1).map((row, i) => (
                  <tr key={i} className="border-b hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2 text-surface-100 whitespace-nowrap max-w-[200px] truncate">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 10 && <p className="text-xs text-surface-500 text-center">Showing first 10 of {rows.length} rows</p>}
        </div>
      )}
    </motion.div>
  );
}
