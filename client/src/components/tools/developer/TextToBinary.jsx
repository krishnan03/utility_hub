import { useState } from 'react';
import { motion } from 'framer-motion';

function textToBinary(text) {
  return Array.from(text)
    .map(c => c.charCodeAt(0).toString(2).padStart(8, '0'))
    .join(' ');
}

function textToHex(text) {
  return Array.from(text)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
}

function binaryToText(bin) {
  const groups = bin.trim().split(/\s+/);
  return groups.map(g => {
    const n = parseInt(g, 2);
    if (isNaN(n)) throw new Error(`Invalid binary group: "${g}"`);
    return String.fromCharCode(n);
  }).join('');
}

export default function TextToBinary() {
  const [mode, setMode] = useState('text-to-bin');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const isTextMode = mode === 'text-to-bin';
  const binary = isTextMode && input ? textToBinary(input) : '';
  const hex = isTextMode && input ? textToHex(input) : '';

  let decoded = '';
  if (!isTextMode && input) {
    try { decoded = binaryToText(input); setError(''); } catch (e) { setError(e.message); decoded = ''; }
  } else {
    if (error) setError('');
  }

  const copy = (val, key) => {
    navigator.clipboard.writeText(val);
    setCopied(key); setTimeout(() => setCopied(''), 1500);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex gap-2">
          {[['text-to-bin', 'Text → Binary'], ['bin-to-text', 'Binary → Text']].map(([val, label]) => (
            <button key={val} onClick={() => { setMode(val); setInput(''); setError(''); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${mode === val ? 'text-white' : ' text-surface-300 hover:bg-white/5'}`}>
              {label}
            </button>
          ))}
        </div>
        <div>
          <label className="text-sm font-medium text-surface-300 block mb-1">
            {isTextMode ? 'Text Input' : 'Binary Input (space-separated 8-bit groups)'}
          </label>
          <textarea rows={5} value={input} onChange={e => setInput(e.target.value)}
            placeholder={isTextMode ? 'Type or paste text...' : '01001000 01100101 01101100 01101100 01101111'}
            className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm" />
        </div>
        {error && <p className="text-red-500 text-sm rounded-xl px-3 py-2">{error}</p>}
        {isTextMode && input && (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-surface-300">Binary</label>
                <button onClick={() => copy(binary, 'bin')} className="text-xs px-3 py-1 hover:bg-white/5 rounded-lg transition-colors">
                  {copied === 'bin' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div className="font-mono text-sm rounded-xl p-4 overflow-auto max-h-40 break-all text-surface-100">
                {binary}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-surface-300">Hexadecimal</label>
                <button onClick={() => copy(hex, 'hex')} className="text-xs px-3 py-1 hover:bg-white/5 rounded-lg transition-colors">
                  {copied === 'hex' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div className="font-mono text-sm rounded-xl p-4 overflow-auto text-primary-400">
                {hex}
              </div>
            </div>
          </div>
        )}
        {!isTextMode && decoded && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-surface-300">Decoded Text</label>
              <button onClick={() => copy(decoded, 'dec')} className="text-xs px-3 py-1 hover:bg-white/5 rounded-lg transition-colors">
                {copied === 'dec' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div className="font-mono text-sm rounded-xl p-4 text-surface-100 whitespace-pre-wrap">
              {decoded}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
