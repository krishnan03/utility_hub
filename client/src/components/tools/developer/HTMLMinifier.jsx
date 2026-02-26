import { useState } from 'react';
import { motion } from 'framer-motion';

function minifyHTML(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}

function beautifyHTML(html) {
  let result = '';
  let indent = 0;
  const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
  const tokens = html.match(/<[^>]+>|[^<]+/g) || [];
  for (const token of tokens) {
    const text = token.trim();
    if (!text) continue;
    if (text.startsWith('</')) {
      indent = Math.max(0, indent - 1);
      result += '  '.repeat(indent) + text + '\n';
    } else if (text.startsWith('<') && !text.startsWith('<!') && !text.endsWith('/>')) {
      const tag = (text.match(/^<(\w+)/) || [])[1] || '';
      result += '  '.repeat(indent) + text + '\n';
      if (!VOID.has(tag.toLowerCase())) indent++;
    } else {
      result += '  '.repeat(indent) + text + '\n';
    }
  }
  return result.trim();
}

function fmtSize(n) {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

export default function HTMLMinifier() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const run = (fn) => setOutput(fn(input));
  const copy = () => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  const origSize = new Blob([input]).size;
  const outSize = new Blob([output]).size;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <label className="text-sm font-medium text-surface-300 block mb-1">HTML Input</label>
          <textarea rows={10} value={input} onChange={e => setInput(e.target.value)} placeholder="Paste HTML here..."
            className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => run(minifyHTML)} className="px-4 py-2 bg-blue-500 hover:text-white rounded-xl font-medium transition-colors">Minify</button>
          <button onClick={() => run(beautifyHTML)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors">Beautify</button>
        </div>
        {output && (
          <div>
            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
              <div className="flex gap-3 text-sm text-surface-400">
                <span>Original: <strong className="text-surface-300">{fmtSize(origSize)}</strong></span>
                <span>Output: <strong className="text-surface-300">{fmtSize(outSize)}</strong></span>
              </div>
              <button onClick={copy} className="text-xs px-3 py-1 hover:bg-white/5 rounded-lg transition-colors">
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <textarea rows={10} readOnly value={output}
              className="font-mono text-sm rounded-xl p-4 overflow-auto w-full" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
