import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

// Basic JSONPath evaluator: $, ., [], [*], [n], [-n], ..
function jsonPath(obj, path) {
  if (!path.startsWith('$')) throw new Error('Path must start with $');
  const tokens = tokenize(path.slice(1));
  return evaluate([obj], tokens);
}

function tokenize(path) {
  const tokens = [];
  let i = 0;
  while (i < path.length) {
    if (path[i] === '.') {
      i++;
      if (path[i] === '.') { tokens.push({ type: 'recurse' }); i++; }
      const key = readKey(path, i);
      if (key.val) { tokens.push({ type: 'key', val: key.val }); i += key.len; }
    } else if (path[i] === '[') {
      i++;
      const end = path.indexOf(']', i);
      const inner = path.slice(i, end).trim().replace(/['"]/g, '');
      if (inner === '*') tokens.push({ type: 'wildcard' });
      else if (!isNaN(inner)) tokens.push({ type: 'index', val: parseInt(inner) });
      else tokens.push({ type: 'key', val: inner });
      i = end + 1;
    } else {
      const key = readKey(path, i);
      if (key.val) { tokens.push({ type: 'key', val: key.val }); i += key.len; }
      else i++;
    }
  }
  return tokens;
}

function readKey(path, i) {
  let j = i;
  while (j < path.length && path[j] !== '.' && path[j] !== '[') j++;
  return { val: path.slice(i, j), len: j - i };
}

function evaluate(nodes, tokens) {
  if (tokens.length === 0) return nodes;
  const [tok, ...rest] = tokens;
  const next = [];
  for (const node of nodes) {
    if (tok.type === 'key') {
      if (node && typeof node === 'object' && !Array.isArray(node) && tok.val in node) next.push(node[tok.val]);
    } else if (tok.type === 'wildcard') {
      if (Array.isArray(node)) next.push(...node);
      else if (node && typeof node === 'object') next.push(...Object.values(node));
    } else if (tok.type === 'index') {
      if (Array.isArray(node)) {
        const idx = tok.val < 0 ? node.length + tok.val : tok.val;
        if (idx >= 0 && idx < node.length) next.push(node[idx]);
      }
    } else if (tok.type === 'recurse') {
      next.push(...recurse(node));
      return evaluate(next, tokens.slice(1));
    }
  }
  return evaluate(next, rest);
}

function recurse(node) {
  const result = [node];
  if (Array.isArray(node)) node.forEach(v => result.push(...recurse(v)));
  else if (node && typeof node === 'object') Object.values(node).forEach(v => result.push(...recurse(v)));
  return result;
}

const SAMPLE_JSON = `{
  "store": {
    "books": [
      { "title": "Clean Code", "price": 29.99, "author": "Martin" },
      { "title": "SICP", "price": 49.99, "author": "Abelson" },
      { "title": "DDIA", "price": 39.99, "author": "Kleppmann" }
    ],
    "name": "Tech Books"
  }
}`;

export default function JSONPathTester() {
  const [jsonInput, setJsonInput] = useState('');
  const [pathInput, setPathInput] = useState('');
  const [error, setError] = useState('');

  const result = useMemo(() => {
    if (!jsonInput.trim() || !pathInput.trim()) return null;
    try {
      const obj = JSON.parse(jsonInput);
      setError('');
      return jsonPath(obj, pathInput.trim());
    } catch (e) {
      setError(e.message);
      return null;
    }
  }, [jsonInput, pathInput]);

  const loadExample = () => {
    setJsonInput(SAMPLE_JSON);
    setPathInput('$.store.books[*].title');
    setError('');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex justify-end">
          <button onClick={loadExample} className="text-xs px-3 py-1 hover:bg-white/5 rounded-lg transition-colors text-surface-400">
            Load Example
          </button>
        </div>
        <div>
          <label className="text-sm font-medium text-surface-300 block mb-1">JSON Input</label>
          <textarea rows={8} value={jsonInput} onChange={e => setJsonInput(e.target.value)} placeholder='{"key": "value"}'
            className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-surface-300 block mb-1">JSONPath Expression</label>
          <input value={pathInput} onChange={e => setPathInput(e.target.value)} placeholder="$.store.books[*].title"
            className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono" />
          <p className="text-xs text-surface-500 mt-1">Supports: <span className="font-mono">$ . [] [*] [n] [-n] ..</span></p>
        </div>
        {error && <p className="text-red-500 text-sm rounded-xl px-3 py-2">{error}</p>}
        {result !== null && !error && (
          <div>
            <div className="text-sm font-medium text-surface-300 mb-1">
              {result.length} result{result.length !== 1 ? 's' : ''}
            </div>
            <pre className="font-mono text-sm rounded-xl p-4 overflow-auto max-h-64 text-surface-100">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </motion.div>
  );
}
