import { useState } from 'react';
import { motion } from 'framer-motion';

const KEYWORDS = ['SELECT','FROM','WHERE','JOIN','LEFT','RIGHT','INNER','OUTER','FULL','CROSS','ON','AND','OR','NOT','IN','IS','NULL','ORDER','BY','GROUP','HAVING','LIMIT','OFFSET','INSERT','INTO','VALUES','UPDATE','SET','DELETE','CREATE','TABLE','INDEX','DROP','ALTER','ADD','COLUMN','AS','DISTINCT','UNION','ALL','EXISTS','BETWEEN','LIKE','CASE','WHEN','THEN','ELSE','END','WITH','RETURNING'];

function formatSQL(sql) {
  let result = sql;
  KEYWORDS.forEach(kw => {
    result = result.replace(new RegExp(`\\b${kw}\\b`, 'gi'), kw);
  });
  const clauses = ['SELECT','FROM','WHERE','JOIN','LEFT JOIN','RIGHT JOIN','INNER JOIN','OUTER JOIN','FULL JOIN','CROSS JOIN','ORDER BY','GROUP BY','HAVING','LIMIT','OFFSET','INSERT INTO','VALUES','UPDATE','SET','DELETE FROM','CREATE TABLE','DROP TABLE','ALTER TABLE','UNION','UNION ALL','WITH'];
  clauses.forEach(c => {
    result = result.replace(new RegExp(`\\b${c}\\b`, 'g'), `\n${c}`);
  });
  result = result.replace(/\b(AND|OR)\b/g, '\n  $1');
  result = result.replace(/\n{3,}/g, '\n\n').trim();
  return result;
}

export default function SQLFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const format = () => setOutput(formatSQL(input));
  const copy = () => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const lines = output ? output.split('\n').length : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <label className="text-sm font-medium text-surface-300 block mb-1">SQL Input</label>
          <textarea rows={8} value={input} onChange={e => setInput(e.target.value)} placeholder="Paste your SQL query here..."
            className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
        <button onClick={format} className="px-4 py-2 text-white rounded-xl font-medium transition-colors" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>Format SQL</button>
        {output && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-surface-300">Formatted Output <span className="text-surface-500 font-normal">({lines} lines)</span></label>
              <button onClick={copy} className="text-xs px-3 py-1 rounded-lg transition-colors hover:bg-white/5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <textarea rows={12} readOnly value={output}
              className="font-mono text-sm rounded-xl p-4 text-surface-200 overflow-auto w-full"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
