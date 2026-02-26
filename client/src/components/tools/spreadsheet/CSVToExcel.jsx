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

function escapeXML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateXLS(rows) {
  const tableRows = rows.map(row =>
    `<tr>${row.map(cell => `<td>${escapeXML(cell)}</td>`).join('')}</tr>`
  ).join('\n');
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:x="urn:schemas-microsoft-com:office:excel"
xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
<x:ExcelWorksheet><x:Name>Sheet1</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
</head><body><table>${tableRows}</table></body></html>`;
}

export default function CSVToExcel() {
  const [csvText, setCsvText] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setCsvText(ev.target.result); setRows([]); setError(''); };
    reader.readAsText(file);
  };

  const handleParse = () => {
    if (!csvText.trim()) { setError('Please enter or upload CSV data.'); return; }
    try {
      const parsed = parseCSV(csvText);
      if (parsed.length === 0) { setError('No data found.'); return; }
      setRows(parsed);
      setError('');
    } catch {
      setError('Failed to parse CSV.');
    }
  };

  const handleDownload = () => {
    if (rows.length === 0) { handleParse(); return; }
    const xls = generateXLS(rows);
    const blob = new Blob([xls], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'converted.xls'; a.click();
    URL.revokeObjectURL(url);
  };

  const preview = rows.slice(0, 10);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 className="text-lg font-bold text-surface-100">CSV to Excel Converter</h2>

        <div
          className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-6 text-center cursor-pointer hover:border-primary-500/40 transition-colors"
          onClick={() => fileRef.current.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { const r = new FileReader(); r.onload = ev => setCsvText(ev.target.result); r.readAsText(f); } }}
        >
          <div className="text-3xl mb-2">📂</div>
          <p className="text-sm text-surface-400">Drop a CSV file here or click to browse</p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">Or paste CSV</label>
          <textarea
            rows={6}
            value={csvText}
            onChange={e => { setCsvText(e.target.value); setRows([]); }}
            placeholder="name,age,city&#10;Alice,30,New York&#10;Bob,25,London"
            className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button onClick={handleParse} className="px-4 py-2 hover:bg-white/5 text-surface-100 rounded-xl font-medium transition-colors">
            Preview
          </button>
          <button onClick={handleDownload} disabled={!csvText.trim()} className="px-4 py-2 bg-blue-500 hover:text-white rounded-xl font-medium transition-colors disabled:opacity-50">
            Download .xls
          </button>
        </div>
      </div>

      {preview.length > 0 && (
        <div className="rounded-2xl p-6" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-sm font-medium text-surface-300 mb-3">
            Preview — {rows.length} rows {rows.length > 10 ? '(showing first 10)' : ''}
          </p>
          <div className="overflow-x-auto">
            <table className="text-sm w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  {preview[0].map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left font-semibold text-surface-300">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(1).map((row, ri) => (
                  <tr key={ri} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-surface-400">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
