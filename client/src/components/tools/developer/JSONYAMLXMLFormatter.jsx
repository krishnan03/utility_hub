import { useState } from 'react';
import { motion } from 'framer-motion';

// Simple YAML serializer/deserializer
function parseYAML(str) {
  const lines = str.split('\n');
  const result = {};
  const stack = [{ obj: result, indent: -1 }];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indent = line.search(/\S/);
    const content = line.trim();
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1].obj;
    if (content.startsWith('- ')) {
      const val = content.slice(2).trim();
      const key = stack[stack.length - 1].lastKey;
      if (key && !Array.isArray(parent[key])) parent[key] = [];
      if (key) parent[key].push(parseYAMLValue(val));
    } else if (content.includes(': ')) {
      const colonIdx = content.indexOf(': ');
      const key = content.slice(0, colonIdx).trim();
      const val = content.slice(colonIdx + 2).trim();
      stack[stack.length - 1].lastKey = key;
      if (val === '' || val === null) {
        parent[key] = {};
        stack.push({ obj: parent[key], indent, lastKey: null });
      } else {
        parent[key] = parseYAMLValue(val);
      }
    } else if (content.endsWith(':')) {
      const key = content.slice(0, -1).trim();
      stack[stack.length - 1].lastKey = key;
      parent[key] = {};
      stack.push({ obj: parent[key], indent, lastKey: null });
    }
  }
  return result;
}

function parseYAMLValue(val) {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null' || val === '~') return null;
  if (!isNaN(val) && val !== '') return Number(val);
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) return val.slice(1, -1);
  return val;
}

function toYAML(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  if (obj === null) return 'null';
  if (typeof obj !== 'object') {
    if (typeof obj === 'string' && (obj.includes(':') || obj.includes('#') || obj === '')) return `"${obj}"`;
    return String(obj);
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj.map(item => `${pad}- ${toYAML(item, indent + 1)}`).join('\n');
  }
  const keys = Object.keys(obj);
  if (keys.length === 0) return '{}';
  return keys.map(k => {
    const v = obj[k];
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      return `${pad}${k}:\n${toYAML(v, indent + 1)}`;
    }
    if (Array.isArray(v)) {
      return `${pad}${k}:\n${toYAML(v, indent + 1)}`;
    }
    return `${pad}${k}: ${toYAML(v, indent)}`;
  }).join('\n');
}

function detectFormat(text) {
  const t = text.trim();
  if (!t) return null;
  try { JSON.parse(t); return 'json'; } catch {}
  if (t.startsWith('<') && t.includes('>')) return 'xml';
  return 'yaml';
}

function formatXML(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) throw new Error('Invalid XML');
  const serializer = new XMLSerializer();
  let str = serializer.serializeToString(doc);
  let formatted = '';
  let indent = 0;
  str.replace(/>\s*</g, '>\n<').split('\n').forEach(node => {
    if (node.match(/^<\/\w/)) indent--;
    formatted += '  '.repeat(Math.max(0, indent)) + node.trim() + '\n';
    if (node.match(/^<\w[^>]*[^/]>.*$/) && !node.match(/<.*\/>/)) indent++;
  });
  return formatted.trim();
}

function xmlToObj(node) {
  if (node.nodeType === 3) return node.nodeValue.trim();
  const obj = {};
  for (const attr of node.attributes || []) obj[`@${attr.name}`] = attr.value;
  for (const child of node.childNodes) {
    const key = child.nodeName;
    const val = xmlToObj(child);
    if (val === '') continue;
    if (obj[key] !== undefined) {
      if (!Array.isArray(obj[key])) obj[key] = [obj[key]];
      obj[key].push(val);
    } else {
      obj[key] = val;
    }
  }
  return obj;
}

function objToXML(obj, tag = 'root') {
  if (typeof obj !== 'object' || obj === null) return `<${tag}>${obj}</${tag}>`;
  const children = Object.entries(obj).map(([k, v]) => {
    if (Array.isArray(v)) return v.map(item => objToXML(item, k)).join('');
    return objToXML(v, k);
  }).join('');
  return `<${tag}>${children}</${tag}>`;
}

export default function JSONYAMLXMLFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const run = (fn) => {
    setError(''); setOutput('');
    try { setOutput(fn()); } catch (e) { setError(e.message); }
  };

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const btnClass = 'px-3 py-1.5 text-white rounded-xl text-sm font-medium transition-colors';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <label className="text-sm font-medium text-surface-300 block mb-1">Input (JSON / YAML / XML)</label>
          <textarea
            rows={8}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Paste JSON, YAML, or XML here..."
            className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnClass} style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }} onClick={() => run(() => JSON.stringify(JSON.parse(input), null, 2))}>Format JSON</button>
          <button className={btnClass} style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }} onClick={() => run(() => { const fmt = detectFormat(input); if (fmt === 'json') return toYAML(JSON.parse(input)); if (fmt === 'xml') { const doc = new DOMParser().parseFromString(input, 'application/xml'); return toYAML(xmlToObj(doc.documentElement)); } return toYAML(parseYAML(input)); })}>Format YAML</button>
          <button className={btnClass} style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }} onClick={() => run(() => formatXML(input))}>Format XML</button>
          <button className={btnClass} style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }} onClick={() => run(() => toYAML(JSON.parse(input)))}>JSON→YAML</button>
          <button className={btnClass} style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }} onClick={() => run(() => formatXML(objToXML(JSON.parse(input))))}>JSON→XML</button>
          <button className={btnClass} style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }} onClick={() => run(() => JSON.stringify(parseYAML(input), null, 2))}>YAML→JSON</button>
          <button className={btnClass} style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }} onClick={() => run(() => { const doc = new DOMParser().parseFromString(input, 'application/xml'); if (doc.querySelector('parsererror')) throw new Error('Invalid XML'); return JSON.stringify(xmlToObj(doc.documentElement), null, 2); })}>XML→JSON</button>
        </div>
        {error && <p className="text-red-400 text-sm rounded-xl px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)' }}>{error}</p>}
        {output && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-surface-300">Output</label>
              <button onClick={copy} className="text-xs px-3 py-1 rounded-lg transition-colors hover:bg-white/5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <textarea
              rows={10}
              readOnly
              value={output}
              className="font-mono text-sm rounded-xl p-4 text-surface-200 overflow-auto w-full"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
