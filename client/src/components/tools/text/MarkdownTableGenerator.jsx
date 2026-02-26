import { useState } from 'react';
import { motion } from 'framer-motion';

const ALIGNMENTS = ['left', 'center', 'right'];
const ALIGN_CHARS = { left: ':---', center: ':---:', right: '---:' };

function buildMarkdown(rows, cols, data, headers, alignments) {
  const colWidths = Array.from({ length: cols }, (_, c) =>
    Math.max(
      headers[c]?.length || 3,
      ...Array.from({ length: rows }, (_, r) => data[r]?.[c]?.length || 0),
      3
    )
  );

  const pad = (str, width, align) => {
    const s = str || '';
    if (align === 'right') return s.padStart(width);
    if (align === 'center') {
      const total = width - s.length;
      const left = Math.floor(total / 2);
      return ' '.repeat(left) + s + ' '.repeat(total - left);
    }
    return s.padEnd(width);
  };

  const headerRow = '| ' + headers.map((h, c) => pad(h, colWidths[c], alignments[c])).join(' | ') + ' |';
  const sepRow = '| ' + alignments.map((a, c) => {
    const base = ALIGN_CHARS[a];
    const dashes = '-'.repeat(Math.max(0, colWidths[c] - base.length + 4));
    if (a === 'left') return ':' + '-'.repeat(colWidths[c] - 1);
    if (a === 'right') return '-'.repeat(colWidths[c] - 1) + ':';
    const inner = '-'.repeat(Math.max(1, colWidths[c] - 2));
    return ':' + inner + ':';
  }).join(' | ') + ' |';

  const dataRows = Array.from({ length: rows }, (_, r) =>
    '| ' + Array.from({ length: cols }, (_, c) => pad(data[r]?.[c] || '', colWidths[c], alignments[c])).join(' | ') + ' |'
  );

  return [headerRow, sepRow, ...dataRows].join('\n');
}

export default function MarkdownTableGenerator() {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [headers, setHeaders] = useState(['Column 1', 'Column 2', 'Column 3']);
  const [data, setData] = useState([['', '', ''], ['', '', ''], ['', '', '']]);
  const [alignments, setAlignments] = useState(['left', 'left', 'left']);
  const [copied, setCopied] = useState(false);

  const setHeader = (c, val) => {
    const h = [...headers];
    h[c] = val;
    setHeaders(h);
  };

  const setCell = (r, c, val) => {
    const d = data.map(row => [...row]);
    if (!d[r]) d[r] = [];
    d[r][c] = val;
    setData(d);
  };

  const setAlign = (c, val) => {
    const a = [...alignments];
    a[c] = val;
    setAlignments(a);
  };

  const addRow = () => {
    setRows(r => r + 1);
    setData(d => [...d, Array(cols).fill('')]);
  };

  const removeRow = () => {
    if (rows <= 1) return;
    setRows(r => r - 1);
    setData(d => d.slice(0, -1));
  };

  const addCol = () => {
    if (cols >= 10) return;
    setCols(c => c + 1);
    setHeaders(h => [...h, `Column ${cols + 1}`]);
    setAlignments(a => [...a, 'left']);
    setData(d => d.map(row => [...row, '']));
  };

  const removeCol = () => {
    if (cols <= 1) return;
    setCols(c => c - 1);
    setHeaders(h => h.slice(0, -1));
    setAlignments(a => a.slice(0, -1));
    setData(d => d.map(row => row.slice(0, -1)));
  };

  const markdown = buildMarkdown(rows, cols, data, headers, alignments);

  const copy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex gap-2 flex-wrap">
          <button onClick={addRow} className="px-3 py-1.5 text-xs hover:bg-primary-500/10 text-surface-300 rounded-lg transition-colors">+ Row</button>
          <button onClick={removeRow} disabled={rows <= 1} className="px-3 py-1.5 text-xs hover:bg-red-100 dark:hover:bg-red-900 text-surface-300 rounded-lg transition-colors disabled:opacity-40">− Row</button>
          <button onClick={addCol} disabled={cols >= 10} className="px-3 py-1.5 text-xs hover:bg-primary-500/10 text-surface-300 rounded-lg transition-colors disabled:opacity-40">+ Col</button>
          <button onClick={removeCol} disabled={cols <= 1} className="px-3 py-1.5 text-xs hover:bg-red-100 dark:hover:bg-red-900 text-surface-300 rounded-lg transition-colors disabled:opacity-40">− Col</button>
          <span className="text-xs text-surface-500 self-center">{rows} rows × {cols} cols</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {Array.from({ length: cols }, (_, c) => (
                  <th key={c} className="p-1">
                    <input
                      value={headers[c] || ''}
                      onChange={(e) => setHeader(c, e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-semibold text-xs"
                      placeholder={`Col ${c + 1}`}
                    />
                    <select
                      value={alignments[c] || 'left'}
                      onChange={(e) => setAlign(c, e.target.value)}
                      className="mt-1 w-full px-1 py-0.5 rounded-lg text-surface-300 text-xs focus:outline-none" style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      {ALIGNMENTS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }, (_, r) => (
                <tr key={r}>
                  {Array.from({ length: cols }, (_, c) => (
                    <td key={c} className="p-1">
                      <input
                        value={data[r]?.[c] || ''}
                        onChange={(e) => setCell(r, c, e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 text-xs"
                        placeholder="..."
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl p-6 space-y-3" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-surface-300">Markdown Output</h3>
          <button onClick={copy} className="px-4 py-2 bg-blue-500 hover:text-white rounded-xl font-medium transition-colors text-sm">
            {copied ? '✓ Copied!' : 'Copy Markdown'}
          </button>
        </div>
        <pre className="rounded-xl p-4 font-mono text-xs text-surface-200 overflow-x-auto whitespace-pre">
          {markdown}
        </pre>
      </div>
    </motion.div>
  );
}
