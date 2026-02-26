import { useState } from 'react';
import { motion } from 'framer-motion';

export default function URLEncoderDecoder() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const run = (fn) => {
    setError(''); setOutput('');
    try { setOutput(fn(input)); } catch (e) { setError(e.message); }
  };

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const btnClass = 'px-4 py-2 bg-blue-500 hover:text-white rounded-xl font-medium transition-colors text-sm';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <label className="text-sm font-medium text-surface-300 block mb-1">Input</label>
          <textarea rows={5} value={input} onChange={e => setInput(e.target.value)} placeholder="Enter URL or text..."
            className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm" />
          <div className="text-xs text-surface-500 mt-1">{input.length} characters</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnClass} onClick={() => run(v => encodeURI(v))}>Encode URL</button>
          <button className={btnClass} onClick={() => run(v => decodeURI(v))}>Decode URL</button>
          <button className={btnClass} onClick={() => run(v => encodeURIComponent(v))}>Encode URI Component</button>
          <button className={btnClass} onClick={() => run(v => decodeURIComponent(v))}>Decode URI Component</button>
        </div>
        {error && <p className="text-red-500 text-sm rounded-xl px-3 py-2">{error}</p>}
        {output !== '' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-surface-300">Output</label>
              <button onClick={copy} className="text-xs px-3 py-1 hover:bg-white/5 rounded-lg transition-colors">
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <textarea rows={5} readOnly value={output}
              className="font-mono text-sm rounded-xl p-4 overflow-auto w-full" />
            <div className="text-xs text-surface-500 mt-1">{output.length} characters</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
