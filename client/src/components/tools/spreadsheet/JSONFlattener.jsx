import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const cardStyle = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };
const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' };
const btnGradient = { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' };

function flattenObject(obj, separator = '.', prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}${separator}${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, separator, newKey));
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item !== null && typeof item === 'object') {
          Object.assign(result, flattenObject(item, separator, `${newKey}${separator}${i}`));
        } else {
          result[`${newKey}${separator}${i}`] = item;
        }
      });
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

function arrayOfObjectsToCSV(arr) {
  if (!arr.length) return '';
  const allKeys = new Set();
  const flatRows = arr.map(obj => {
    const flat = flattenObject(obj, '.');
    Object.keys(flat).forEach(k => allKeys.add(k));
    return flat;
  });
  const headers = [...allKeys];
  const csvRows = [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',')];
  for (const row of flatRows) {
    csvRows.push(headers.map(h => {
      const v = row[h] ?? '';
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(','));
  }
  return csvRows.join('\n');
}

export default function JSONFlattener() {
  const [input, setInput] = useState('');
  const [separator, setSeparator] = useState('.');
  const [outputFormat, setOutputFormat] = useState('json');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const { output, isArray, itemCount } = useMemo(() => {
    if (!input.trim()) return { output: '', isArray: false, itemCount: 0 };
    try {
      const parsed = JSON.parse(input);
      setError('');

      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
        // Array of objects — CSV table mode
        if (outputFormat === 'csv') {
          return { output: arrayOfObjectsToCSV(parsed), isArray: true, itemCount: parsed.length };
        }
        const flatArr = parsed.map(obj => flattenObject(obj, separator));
        if (outputFormat === 'kv') {
          const lines = flatArr.map((flat, i) => {
            return `--- Record ${i + 1} ---\n` + Object.entries(flat).map(([k, v]) => `${k} = ${JSON.stringify(v)}`).join('\n');
          });
          return { output: lines.join('\n\n'), isArray: true, itemCount: parsed.length };
        }
        return { output: JSON.stringify(flatArr, null, 2), isArray: true, itemCount: parsed.length };
      }

      const flat = flattenObject(parsed, separator);
      if (outputFormat === 'csv') {
        const rows = Object.entries(flat).map(([k, v]) => `"${k.replace(/"/g, '""')}","${String(v ?? '').replace(/"/g, '""')}"`);
        return { output: '"Key","Value"\n' + rows.join('\n'), isArray: false, itemCount: Object.keys(flat).length };
      }
      if (outputFormat === 'kv') {
        return { output: Object.entries(flat).map(([k, v]) => `${k} = ${JSON.stringify(v)}`).join('\n'), isArray: false, itemCount: Object.keys(flat).length };
      }
      return { output: JSON.stringify(flat, null, 2), isArray: false, itemCount: Object.keys(flat).length };
    } catch (e) {
      setError('Invalid JSON: ' + e.message);
      return { output: '', isArray: false, itemCount: 0 };
    }
  }, [input, separator, outputFormat]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = outputFormat === 'csv' ? 'csv' : outputFormat === 'kv' ? 'txt' : 'json';
    const mime = outputFormat === 'csv' ? 'text/csv' : outputFormat === 'kv' ? 'text/plain' : 'application/json';
    const blob = new Blob([output], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `flattened.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const loadSample = () => {
    setInput(JSON.stringify({
      user: { name: "Alice", address: { city: "NYC", zip: "10001" } },
      orders: [
        { id: 1, items: ["Widget", "Gadget"], total: 29.99 },
        { id: 2, items: ["Doohickey"], total: 14.50 },
      ],
      active: true,
    }, null, 2));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-surface-300">Paste JSON</label>
          <button onClick={loadSample} className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
            Load sample
          </button>
        </div>
        <textarea value={input} onChange={e => { setInput(e.target.value); setError(''); }} rows={8}
          placeholder='{"user": {"name": "Alice", "address": {"city": "NYC"}}}'
          className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm resize-none"
          style={inputStyle} />
        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Separator</label>
            <div className="flex gap-1.5">
              {['.', '_', '/'].map(s => (
                <button key={s} onClick={() => setSeparator(s)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold min-h-[44px] transition-all ${separator === s ? 'text-white' : 'text-surface-400 hover:text-surface-200'}`}
                  style={separator === s ? btnGradient : { background: 'rgba(255,255,255,0.06)' }}>
                  <span className="font-mono">{s}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Output Format</label>
            <div className="flex gap-1.5">
              {[['json', 'JSON'], ['csv', 'CSV'], ['kv', 'K=V']].map(([val, label]) => (
                <button key={val} onClick={() => setOutputFormat(val)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold min-h-[44px] transition-all ${outputFormat === val ? 'text-white' : 'text-surface-400 hover:text-surface-200'}`}
                  style={outputFormat === val ? btnGradient : { background: 'rgba(255,255,255,0.06)' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {output && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-surface-500 font-mono">
                {isArray ? `${itemCount} records` : `${itemCount} keys`} · separator: "{separator}"
              </span>
            </div>
            <div className="rounded-2xl p-5 space-y-3" style={cardStyle}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-surface-300">Flattened Output</p>
                <div className="flex gap-2">
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleCopy}
                    className="px-3 py-1.5 text-sm rounded-xl font-medium text-surface-300 hover:text-surface-100 min-h-[36px]"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleDownload}
                    className="px-3 py-1.5 text-sm rounded-xl font-medium text-white min-h-[36px]"
                    style={btnGradient}>
                    Download
                  </motion.button>
                </div>
              </div>
              <pre className="rounded-xl p-4 text-xs font-mono text-surface-300 overflow-auto max-h-96 whitespace-pre"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                {output}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
