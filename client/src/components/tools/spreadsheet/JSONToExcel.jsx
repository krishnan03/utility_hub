import { useState } from 'react';
import { motion } from 'framer-motion';

function jsonToRows(json) {
  const data = JSON.parse(json);
  if (!Array.isArray(data) || data.length === 0) throw new Error('Expected a non-empty JSON array.');
  if (typeof data[0] === 'object' && !Array.isArray(data[0])) {
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => headers.map(h => obj[h] ?? ''));
    return [headers, ...rows];
  }
  if (Array.isArray(data[0])) return data;
  throw new Error('Expected array of objects or array of arrays.');
}

function rowsToCSV(rows) {
  return rows.map(row =>
    row.map(cell => {
      const s = String(cell ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')
  ).join('\n');
}

function escapeXML(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function rowsToXLS(rows) {
  const tableRows = rows.map(row =>
    `<tr>${row.map(cell => `<td>${escapeXML(cell)}</td>`).join('')}</tr>`
  ).join('\n');
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
<body><table>${tableRows}</table></body></html>`;
}

export default function JSONToExcel() {
  const [input, setInput] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const parse = () => {
    if (!input.trim()) { setError('Please enter JSON data.'); return null; }
    try {
      const r = jsonToRows(input);
      setRows(r);
      setError('');
      return r;
    } catch (e) {
      setError(e.message);
      return null;
    }
  };

  const handlePreview = () => parse();

  const handleDownloadCSV = () => {
    const r = rows.length ? rows : parse();
    if (!r) return;
    const csv = rowsToCSV(r);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'data.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadXLS = () => {
    const r = rows.length ? rows : parse();
    if (!r) return;
    const xls = rowsToXLS(r);
    const blob = new Blob([xls], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'data.xls'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCSV = () => {
    const r = rows.length ? rows : parse();
    if (!r) return;
    navigator.clipboard.writeText(rowsToCSV(r));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const preview = rows.slice(0, 11);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 className="text-lg font-bold text-surface-100">JSON to Excel / CSV</h2>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">JSON Input (array of objects)</label>
          <textarea
            rows={8}
            value={input}
            onChange={e => { setInput(e.target.value); setRows([]); setError(''); }}
            placeholder='[{"name":"Alice","age":30},{"name":"Bob","age":25}]'
            className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button onClick={handlePreview} className="px-4 py-2 hover:bg-white/5 text-surface-100 rounded-xl font-medium transition-colors">
            Preview
          </button>
          <button onClick={handleDownloadCSV} className="px-4 py-2 bg-blue-500 hover:text-white rounded-xl font-medium transition-colors">
            Download CSV
          </button>
          <button onClick={handleDownloadXLS} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors">
            Download .xls
          </button>
          <button onClick={handleCopyCSV} className="px-4 py-2 hover:bg-white/5 text-surface-100 rounded-xl font-medium transition-colors">
            {copied ? '✓ Copied CSV' : 'Copy as CSV'}
          </button>
        </div>
      </div>

      {preview.length > 0 && (
        <div className="rounded-2xl p-6" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-sm font-medium text-surface-300 mb-3">
            Preview — {rows.length} rows {rows.length > 11 ? '(showing first 10)' : ''}
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
                      <td key={ci} className="px-3 py-2 text-surface-400">{String(cell ?? '')}</td>
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
