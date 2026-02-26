import { useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';

const CHART_COLORS = ['#FF6363', '#FF9F43', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#06B6D4'];
const ROWS_PER_PAGE = 50;

// ── Formula Engine ──────────────────────────────────────────────────
function colLetterToIndex(letter) {
  let idx = 0;
  for (let i = 0; i < letter.length; i++) {
    idx = idx * 26 + (letter.charCodeAt(i) - 64);
  }
  return idx - 1;
}

function indexToColLetter(idx) {
  let s = '';
  idx++;
  while (idx > 0) {
    idx--;
    s = String.fromCharCode(65 + (idx % 26)) + s;
    idx = Math.floor(idx / 26);
  }
  return s;
}

function extractRange(dataRows, colStart, rowStart, colEnd, rowEnd) {
  const ci1 = colLetterToIndex(colStart);
  const ci2 = colLetterToIndex(colEnd);
  const r1 = parseInt(rowStart, 10) - 1;
  const r2 = parseInt(rowEnd, 10) - 1;
  const vals = [];
  for (let r = r1; r <= r2 && r < dataRows.length; r++) {
    for (let c = ci1; c <= ci2; c++) {
      const raw = dataRows[r]?.[c];
      if (raw !== undefined && raw !== '') {
        const n = parseFloat(raw);
        if (!isNaN(n)) vals.push(n);
      }
    }
  }
  return vals;
}

function getCellValue(dataRows, col, row) {
  const ci = colLetterToIndex(col);
  const ri = parseInt(row, 10) - 1;
  return dataRows[ri]?.[ci] ?? '';
}

function evaluateFormula(formula, dataRows) {
  if (!formula || !formula.startsWith('=')) return formula;
  const expr = formula.slice(1).trim();

  // Range functions: =SUM(A1:A10), =AVG(B1:B5), =COUNT(C1:C20), =MIN(D1:D10), =MAX(D1:D10)
  const rangeFnMatch = expr.match(/^(SUM|AVG|AVERAGE|COUNT|MIN|MAX)\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/i);
  if (rangeFnMatch) {
    const fn = rangeFnMatch[1].toUpperCase();
    const vals = extractRange(dataRows, rangeFnMatch[2].toUpperCase(), rangeFnMatch[3], rangeFnMatch[4].toUpperCase(), rangeFnMatch[5]);
    if (vals.length === 0) return 0;
    switch (fn) {
      case 'SUM': return vals.reduce((a, b) => a + b, 0);
      case 'AVG': case 'AVERAGE': return vals.reduce((a, b) => a + b, 0) / vals.length;
      case 'COUNT': return vals.length;
      case 'MIN': return Math.min(...vals);
      case 'MAX': return Math.max(...vals);
      default: return '#ERR';
    }
  }

  // IF function: =IF(A1>10, "yes", "no")
  const ifMatch = expr.match(/^IF\(([A-Z]+)(\d+)\s*(>|<|>=|<=|==|!=)\s*(.+?)\s*,\s*(.+?)\s*,\s*(.+?)\)$/i);
  if (ifMatch) {
    const cellVal = parseFloat(getCellValue(dataRows, ifMatch[1].toUpperCase(), ifMatch[2])) || 0;
    const compareVal = parseFloat(ifMatch[4]) || 0;
    const trueVal = ifMatch[5].replace(/^["']|["']$/g, '');
    const falseVal = ifMatch[6].replace(/^["']|["']$/g, '');
    let result = false;
    switch (ifMatch[3]) {
      case '>': result = cellVal > compareVal; break;
      case '<': result = cellVal < compareVal; break;
      case '>=': result = cellVal >= compareVal; break;
      case '<=': result = cellVal <= compareVal; break;
      case '==': result = cellVal === compareVal; break;
      case '!=': result = cellVal !== compareVal; break;
    }
    return result ? trueVal : falseVal;
  }

  return '#UNKNOWN';
}

const FORMULA_HELP = [
  { fn: '=SUM(A1:A10)', desc: 'Sum of values in range' },
  { fn: '=AVG(B1:B5)', desc: 'Average of values' },
  { fn: '=COUNT(C1:C20)', desc: 'Count non-empty numeric cells' },
  { fn: '=MIN(D1:D10)', desc: 'Minimum value' },
  { fn: '=MAX(D1:D10)', desc: 'Maximum value' },
  { fn: '=IF(A1>10,"yes","no")', desc: 'Conditional value' },
];

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
  return rows.map(r => r.map(c => /[,"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(',')).join('\n');
}

function detectColType(dataRows, ci) {
  let nums = 0, dates = 0, total = 0;
  for (const row of dataRows) {
    const v = (row[ci] || '').trim();
    if (!v) continue;
    total++;
    if (!isNaN(parseFloat(v)) && isFinite(v)) nums++;
    else if (!isNaN(Date.parse(v)) && v.length > 4) dates++;
  }
  if (!total) return 'text';
  if (nums / total > 0.7) return 'number';
  if (dates / total > 0.7) return 'date';
  return 'text';
}

function colStats(dataRows, ci) {
  const vals = dataRows.map(r => parseFloat(r[ci])).filter(v => !isNaN(v));
  if (!vals.length) return null;
  const sum = vals.reduce((a, b) => a + b, 0);
  return { count: vals.length, sum, avg: sum / vals.length, min: Math.min(...vals), max: Math.max(...vals) };
}

const fmt = (v) => typeof v === 'number' ? (Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 })) : v;

const TYPE_ICONS = { number: '#', text: 'Aa', date: '📅' };

const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(30,30,32,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <p className="font-semibold text-surface-200 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function CSVViewer() {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [filter, setFilter] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [editCell, setEditCell] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [page, setPage] = useState(0);
  const [viewTab, setViewTab] = useState('data');
  const fileRef = useRef();
  const chartRef = useRef();

  // Formula bar state
  const [selectedCell, setSelectedCell] = useState(null); // [rowIdx, colIdx]
  const [formulaInput, setFormulaInput] = useState('');
  const [formulaResults, setFormulaResults] = useState({}); // key: "r,c" -> computed value
  const [showFormulaHelp, setShowFormulaHelp] = useState(false);

  // Chart state
  const [chartType, setChartType] = useState('bar');
  const [xCol, setXCol] = useState(null);
  const [yCols, setYCols] = useState([]);

  const loadCSV = (text, name = '', size = 0) => {
    setRows(parseCSV(text));
    setFileName(name);
    setFileSize(size);
    setSortCol(null);
    setFilter('');
    setPage(0);
    setViewTab('data');
    setXCol(null);
    setYCols([]);
    setSelectedCell(null);
    setFormulaInput('');
    setFormulaResults({});
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => loadCSV(ev.target.result, file.name, file.size);
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => loadCSV(ev.target.result, file.name, file.size);
      reader.readAsText(file);
    }
  };

  const headers = rows[0] || [];
  const dataRows = rows.slice(1);

  const colTypes = useMemo(() => headers.map((_, i) => detectColType(dataRows, i)), [headers, dataRows]);
  const numericCols = useMemo(() => headers.map((h, i) => ({ h, i })).filter((_, idx) => colTypes[idx] === 'number'), [headers, colTypes]);
  const statistics = useMemo(() => headers.map((_, i) => colTypes[i] === 'number' ? colStats(dataRows, i) : null), [headers, dataRows, colTypes]);

  const filtered = useMemo(() => {
    if (!filter) return dataRows;
    const q = filter.toLowerCase();
    return dataRows.filter(r => r.some(c => c.toLowerCase().includes(q)));
  }, [dataRows, filter]);

  const sorted = useMemo(() => {
    if (sortCol === null) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortCol] || '', bv = b[sortCol] || '';
      const n = (v) => parseFloat(v);
      const cmp = !isNaN(n(av)) && !isNaN(n(bv)) ? n(av) - n(bv) : av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ROWS_PER_PAGE));
  const pagedRows = sorted.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);

  const toggleSort = (i) => {
    if (sortCol === i) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(i); setSortDir('asc'); }
  };

  const startEdit = (ri, ci, val) => { setEditCell([ri, ci]); setEditVal(val); };
  const commitEdit = () => {
    if (!editCell) return;
    const [ri, ci] = editCell;
    const actualRow = pagedRows[ri];
    const globalIdx = rows.indexOf(actualRow);
    if (globalIdx !== -1) {
      const newRows = [...rows];
      newRows[globalIdx] = [...newRows[globalIdx]];
      newRows[globalIdx][ci] = editVal;
      setRows(newRows);
    }
    setEditCell(null);
  };

  const handleCellClick = (ri, ci) => {
    const globalRow = page * ROWS_PER_PAGE + ri;
    setSelectedCell([globalRow, ci]);
    const key = `${globalRow},${ci}`;
    // Show formula if one was applied, otherwise show cell value
    if (formulaResults[key]?.formula) {
      setFormulaInput(formulaResults[key].formula);
    } else {
      setFormulaInput(pagedRows[ri]?.[ci] || '');
    }
  };

  const commitFormula = () => {
    if (!selectedCell) return;
    const [ri, ci] = selectedCell;
    const key = `${ri},${ci}`;
    if (formulaInput.startsWith('=')) {
      const result = evaluateFormula(formulaInput, dataRows);
      setFormulaResults(prev => ({ ...prev, [key]: { formula: formulaInput, result } }));
    } else {
      // Clear formula, set raw value
      setFormulaResults(prev => { const n = { ...prev }; delete n[key]; return n; });
      const globalIdx = ri + 1; // +1 for header
      if (globalIdx < rows.length) {
        const newRows = [...rows];
        newRows[globalIdx] = [...newRows[globalIdx]];
        newRows[globalIdx][ci] = formulaInput;
        setRows(newRows);
      }
    }
  };

  const getCellDisplay = (ri, ci, rawVal) => {
    const globalRow = page * ROWS_PER_PAGE + ri;
    const key = `${globalRow},${ci}`;
    if (formulaResults[key]) {
      const r = formulaResults[key].result;
      return typeof r === 'number' ? r.toLocaleString(undefined, { maximumFractionDigits: 4 }) : String(r);
    }
    return rawVal;
  };

  // Export functions
  const downloadCSV = () => {
    const blob = new Blob([toCSV(rows)], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'data.csv'; a.click(); URL.revokeObjectURL(a.href);
  };

  const downloadJSON = () => {
    const data = dataRows.map(r => {
      const obj = {};
      headers.forEach((h, i) => { obj[h || `col_${i}`] = r[i] || ''; });
      return obj;
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'data.json'; a.click(); URL.revokeObjectURL(a.href);
  };

  const downloadMarkdown = () => {
    const hdr = '| ' + headers.map(h => h || ' ').join(' | ') + ' |';
    const sep = '| ' + headers.map(() => '---').join(' | ') + ' |';
    const body = dataRows.map(r => '| ' + r.map(c => c.replace(/\|/g, '\\|')).join(' | ') + ' |').join('\n');
    const blob = new Blob([hdr + '\n' + sep + '\n' + body], { type: 'text/markdown' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'data.md'; a.click(); URL.revokeObjectURL(a.href);
  };

  const copyTSV = () => {
    const text = rows.map(r => r.join('\t')).join('\n');
    navigator.clipboard.writeText(text);
  };

  // Chart data
  const chartData = useMemo(() => {
    if (xCol === null || !yCols.length) return [];
    return sorted.map(r => {
      const obj = { x: r[xCol] || '' };
      yCols.forEach(ci => { obj[headers[ci]] = parseFloat(r[ci]) || 0; });
      return obj;
    }).slice(0, 200); // cap at 200 points for performance
  }, [sorted, xCol, yCols, headers]);

  const toggleYCol = useCallback((ci) => {
    setYCols(prev => prev.includes(ci) ? prev.filter(c => c !== ci) : [...prev, ci]);
  }, []);

  const downloadChart = () => {
    const svgEl = chartRef.current?.querySelector('svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const svgRect = svgEl.getBoundingClientRect();
    canvas.width = svgRect.width * 2;
    canvas.height = svgRect.height * 2;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#1e1e20';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'chart.png';
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {rows.length === 0 ? (
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div
            onDrop={handleDrop} onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current.click()}
            className="border-2 border-dashed border-white/20 hover:border-primary-500/40 rounded-2xl p-10 text-center cursor-pointer transition-colors group"
          >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📋</div>
            <p className="text-sm text-surface-400">Drop a CSV file or click to upload</p>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Or paste CSV text</label>
            <textarea rows={4} placeholder="name,age,city&#10;Alice,30,NYC" onChange={e => e.target.value && loadCSV(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm resize-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Data Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Rows', value: dataRows.length },
              { label: 'Columns', value: headers.length },
              { label: 'File', value: fileName || 'Pasted' },
              { label: 'Size', value: fileSize ? formatSize(fileSize) : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-xl" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-surface-500 mb-0.5">{label}</p>
                <p className="text-sm font-bold text-surface-100 truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Column types */}
          <div className="flex flex-wrap gap-1.5">
            {headers.map((h, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <span className="text-surface-500 font-mono text-[10px]">{TYPE_ICONS[colTypes[i]]}</span>
                <span className="text-surface-300">{h || `Col ${i + 1}`}</span>
              </span>
            ))}
          </div>

          {/* View tabs */}
          <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
            {[['data', '📊 Data'], ['charts', '📈 Charts']].map(([val, label]) => (
              <button key={val} type="button" onClick={() => setViewTab(val)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${viewTab === val ? 'text-white' : 'text-surface-400 hover:text-surface-200'}`}
                style={viewTab === val ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : undefined}
              >{label}</button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {viewTab === 'data' && (
              <motion.div key="data" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {/* Toolbar */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <input value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }} placeholder="Filter rows..."
                      className="flex-1 min-w-[160px] px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 text-sm"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <span className="text-xs text-surface-500 font-mono">{sorted.length} / {dataRows.length} rows</span>
                    <button onClick={() => { setRows([]); setFileName(''); setFileSize(0); }} className="text-xs text-surface-400 hover:text-surface-300 min-h-[36px] px-2">Clear</button>
                  </div>

                  {/* Formula Bar */}
                  <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-xs font-mono text-surface-500 w-10 text-center shrink-0">
                      {selectedCell ? `${indexToColLetter(selectedCell[1])}${selectedCell[0] + 1}` : 'fx'}
                    </span>
                    <div className="w-px h-5 bg-white/10" />
                    <input
                      value={formulaInput}
                      onChange={e => setFormulaInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') commitFormula(); }}
                      placeholder={selectedCell ? 'Type a value or formula (e.g. =SUM(A1:A10))' : 'Click a cell to select it'}
                      className="flex-1 px-2 py-1.5 rounded-lg text-surface-100 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary-500/40 bg-transparent"
                    />
                    {formulaInput.startsWith('=') && (
                      <motion.button whileTap={{ scale: 0.95 }} onClick={commitFormula}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
                        Apply
                      </motion.button>
                    )}
                    <button onClick={() => setShowFormulaHelp(v => !v)}
                      className="text-xs text-surface-500 hover:text-surface-300 px-1.5 min-h-[28px]">?</button>
                  </div>

                  {showFormulaHelp && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl p-3 text-xs space-y-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="font-semibold text-surface-300 mb-1.5">Supported Formulas</p>
                      {FORMULA_HELP.map((h, i) => (
                        <div key={i} className="flex gap-3">
                          <code className="text-primary-400 font-mono w-44 shrink-0">{h.fn}</code>
                          <span className="text-surface-500">{h.desc}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {/* Table */}
                  <div className="overflow-auto max-h-[500px] rounded-xl">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <th className="px-2 py-2 text-left text-[10px] font-semibold text-surface-500 border-b w-10" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(30,30,32,0.98)' }}>#</th>
                          {headers.map((h, i) => (
                            <th key={i} onClick={() => toggleSort(i)}
                              className={`px-3 py-2 text-left text-xs font-semibold border-b whitespace-nowrap cursor-pointer select-none transition-colors ${sortCol === i ? 'text-primary-400' : 'text-surface-400 hover:text-surface-200'}`}
                              style={{ borderColor: 'rgba(255,255,255,0.06)', background: sortCol === i ? 'rgba(255,99,99,0.06)' : 'rgba(30,30,32,0.98)' }}
                            >
                              <span className="font-mono text-[10px] text-surface-600 mr-1">{TYPE_ICONS[colTypes[i]]}</span>
                              {h || `Col ${i + 1}`} {sortCol === i ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pagedRows.map((row, ri) => (
                          <tr key={ri} className="border-b hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                            <td className="px-2 py-1.5 text-[10px] font-mono text-surface-600">{page * ROWS_PER_PAGE + ri + 1}</td>
                            {row.map((cell, ci) => {
                              const isSelected = selectedCell && selectedCell[0] === (page * ROWS_PER_PAGE + ri) && selectedCell[1] === ci;
                              const displayVal = getCellDisplay(ri, ci, cell);
                              const hasFormula = formulaResults[`${page * ROWS_PER_PAGE + ri},${ci}`];
                              return (
                              <td key={ci}
                                className={`px-3 py-1.5 text-surface-100 whitespace-nowrap max-w-[200px] cursor-pointer ${isSelected ? 'ring-1 ring-primary-500/60' : ''}`}
                                onClick={() => handleCellClick(ri, ci)}
                                onDoubleClick={() => startEdit(ri, ci, cell)}
                                style={hasFormula ? { background: 'rgba(255,99,99,0.04)' } : undefined}>
                                {editCell && editCell[0] === ri && editCell[1] === ci ? (
                                  <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
                                    onBlur={commitEdit} onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditCell(null); }}
                                    className="w-full px-1 py-0.5 rounded text-surface-100 text-sm focus:outline-none"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,99,99,0.4)' }} />
                                ) : (
                                  <span className={`truncate block ${hasFormula ? 'text-primary-400 font-medium' : ''}`}>{displayVal}</span>
                                )}
                              </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                      {/* Stats row */}
                      {statistics.some(s => s) && (
                        <tfoot>
                          {['count', 'sum', 'avg', 'min', 'max'].map(stat => (
                            <tr key={stat} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                              <td className="px-2 py-1 text-[10px] font-mono text-surface-600 uppercase">{stat}</td>
                              {headers.map((_, ci) => (
                                <td key={ci} className="px-3 py-1 text-xs font-mono text-surface-400">
                                  {statistics[ci] ? fmt(statistics[ci][stat]) : ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                        className="min-h-[36px] min-w-[36px] rounded-lg text-xs font-semibold text-surface-300 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        style={{ background: 'rgba(255,255,255,0.06)' }}>←</button>
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        let p;
                        if (totalPages <= 7) p = i;
                        else if (page < 3) p = i;
                        else if (page > totalPages - 4) p = totalPages - 7 + i;
                        else p = page - 3 + i;
                        return (
                          <button key={p} onClick={() => setPage(p)}
                            className={`min-h-[36px] min-w-[36px] rounded-lg text-xs font-semibold transition-all ${page === p ? 'text-white' : 'text-surface-400 hover:bg-white/5'}`}
                            style={page === p ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}
                          >{p + 1}</button>
                        );
                      })}
                      <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                        className="min-h-[36px] min-w-[36px] rounded-lg text-xs font-semibold text-surface-300 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        style={{ background: 'rgba(255,255,255,0.06)' }}>→</button>
                    </div>
                  )}

                  <p className="text-xs text-surface-500">Double-click a cell to edit · Click column headers to sort · Click a cell + use formula bar for formulas</p>
                </div>

                {/* Export buttons */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'CSV', icon: '📄', fn: downloadCSV },
                    { label: 'JSON', icon: '{ }', fn: downloadJSON },
                    { label: 'Markdown', icon: '📝', fn: downloadMarkdown },
                    { label: 'Copy TSV', icon: '📋', fn: copyTSV },
                  ].map(({ label, icon, fn }) => (
                    <motion.button key={label} type="button" onClick={fn} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold text-surface-300 hover:text-surface-100 transition-all"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <span className="text-xs">{icon}</span> {label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {viewTab === 'charts' && (
              <motion.div key="charts" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-5">
                {/* Chart config */}
                <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 className="text-sm font-bold text-surface-200">Chart Configuration</h3>

                  {/* Chart type */}
                  <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5">Chart Type</label>
                    <div className="flex gap-1.5">
                      {[['bar', '📊 Bar'], ['line', '📈 Line'], ['pie', '🥧 Pie'], ['scatter', '⚬ Scatter']].map(([val, label]) => (
                        <button key={val} type="button" onClick={() => setChartType(val)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] ${chartType === val ? 'text-white' : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'}`}
                          style={chartType === val ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}
                        >{label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Axis selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-surface-400 mb-1.5">X-Axis Column</label>
                      <select value={xCol ?? ''} onChange={e => setXCol(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 min-h-[44px]"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <option value="">Select column...</option>
                        {headers.map((h, i) => <option key={i} value={i}>{h || `Col ${i + 1}`}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-surface-400 mb-1.5">Y-Axis Column(s) <span className="text-surface-600">(numeric)</span></label>
                      <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {numericCols.length === 0 ? (
                          <span className="text-xs text-surface-500">No numeric columns detected</span>
                        ) : numericCols.map(({ h, i }) => (
                          <button key={i} type="button" onClick={() => toggleYCol(i)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${yCols.includes(i) ? 'text-white' : 'text-surface-400 hover:text-surface-200'}`}
                            style={yCols.includes(i) ? { background: CHART_COLORS[yCols.indexOf(i) % CHART_COLORS.length] } : { background: 'rgba(255,255,255,0.06)' }}
                          >{h || `Col ${i + 1}`}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart render */}
                {xCol !== null && yCols.length > 0 && chartData.length > 0 && (
                  <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div ref={chartRef} className="w-full" style={{ height: 380 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        {chartType === 'bar' ? (
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="x" tick={{ fill: '#888', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                            <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                            <Tooltip content={<DarkTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 12, color: '#aaa' }} />
                            {yCols.map((ci, idx) => (
                              <Bar key={ci} dataKey={headers[ci]} fill={CHART_COLORS[idx % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
                            ))}
                          </BarChart>
                        ) : chartType === 'line' ? (
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="x" tick={{ fill: '#888', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                            <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                            <Tooltip content={<DarkTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 12, color: '#aaa' }} />
                            {yCols.map((ci, idx) => (
                              <Line key={ci} type="monotone" dataKey={headers[ci]} stroke={CHART_COLORS[idx % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            ))}
                          </LineChart>
                        ) : chartType === 'pie' ? (
                          <PieChart>
                            <Tooltip content={<DarkTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 12, color: '#aaa' }} />
                            <Pie data={chartData} dataKey={headers[yCols[0]]} nameKey="x" cx="50%" cy="50%" outerRadius={130} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}>
                              {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                            </Pie>
                          </PieChart>
                        ) : (
                          <ScatterChart>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="x" name={headers[xCol]} tick={{ fill: '#888', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                            <YAxis dataKey={headers[yCols[0]]} name={headers[yCols[0]]} tick={{ fill: '#888', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                            <Tooltip content={<DarkTooltip />} />
                            <Scatter name={headers[yCols[0]]} fill={CHART_COLORS[0]}>
                              {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                            </Scatter>
                          </ScatterChart>
                        )}
                      </ResponsiveContainer>
                    </div>

                    <motion.button type="button" onClick={downloadChart} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className="flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                      style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Download Chart as PNG
                    </motion.button>
                  </div>
                )}

                {(xCol === null || yCols.length === 0) && (
                  <div className="text-center py-12 text-surface-500">
                    <div className="text-4xl mb-3">📈</div>
                    <p className="text-sm">Select an X-axis column and at least one numeric Y-axis column to generate a chart</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
