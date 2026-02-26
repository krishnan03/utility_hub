import { useState } from 'react';
import { motion } from 'framer-motion';
import { summarize } from '../../../utils/textSummarizer';

const LENGTH_LABELS = ['', 'short', 'short', 'short', 'medium', 'medium', 'medium', 'long', 'long', 'long', 'long'];

export default function TextSummarizer() {
  const [input, setInput] = useState('');
  const [sentences, setSentences] = useState(5);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSummarize = () => {
    setError('');
    setResult(null);
    try {
      const length = LENGTH_LABELS[sentences] || 'medium';
      const out = summarize(input, length);
      const origWords = input.trim().split(/\s+/).length;
      const summWords = out.summary.trim().split(/\s+/).length;
      setResult({ ...out, origWords, summWords, ratio: ((1 - summWords / origWords) * 100).toFixed(1) });
    } catch (e) {
      setError(e.message);
    }
  };

  const copy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <label className="block text-sm font-medium text-surface-300 mb-2">Input Text</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={8}
          className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none text-sm"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          placeholder="Paste your long text here (min 100 characters)..."
        />

        <div className="mt-4">
          <label className="block text-sm font-medium text-surface-300 mb-2">
            Summary Length: {sentences} sentences
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={sentences}
            onChange={(e) => setSentences(Number(e.target.value))}
            className="w-full accent-primary-500"
          />
          <div className="flex justify-between text-xs text-surface-500 mt-1">
            <span>Shorter</span><span>Longer</span>
          </div>
        </div>

        <button onClick={handleSummarize} className="mt-4 px-4 py-2 text-white rounded-xl font-medium transition-colors" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
          Summarize
        </button>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>

      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex gap-4 text-sm">
            <div className="rounded-xl px-4 py-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="font-bold text-surface-100">{result.origWords}</div>
              <div className="text-surface-500 text-xs">Original words</div>
            </div>
            <div className="rounded-xl px-4 py-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="font-bold text-surface-100">{result.summWords}</div>
              <div className="text-surface-500 text-xs">Summary words</div>
            </div>
            <div className="rounded-xl px-4 py-2 text-center" style={{ background: 'rgba(255,99,99,0.06)' }}>
              <div className="font-bold text-primary-400">{result.ratio}%</div>
              <div className="text-surface-500 text-xs">Compressed</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Summary</label>
            <p className="text-sm text-surface-200 leading-relaxed rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>{result.summary}</p>
          </div>

          <button onClick={copy} className="px-4 py-2 text-white rounded-xl font-medium transition-colors text-sm" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
            {copied ? '✓ Copied!' : 'Copy Summary'}
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
