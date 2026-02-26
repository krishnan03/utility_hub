import { useState } from 'react';
import { motion } from 'framer-motion';

const STOP_WORDS = new Set([
  'the','a','an','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','could','should','may','might','shall','can',
  'to','of','in','for','on','with','at','by','from','as','into','through',
  'and','but','or','nor','so','yet','both','either','neither','not','no',
  'this','that','these','those','it','its','i','you','he','she','we','they',
  'me','him','her','us','them','my','your','his','our','their','what','which',
  'who','whom','when','where','why','how','all','each','every','any','some',
]);

export default function WordFrequencyCounter() {
  const [input, setInput] = useState('');
  const [ignoreStopWords, setIgnoreStopWords] = useState(true);
  const [caseInsensitive, setCaseInsensitive] = useState(true);
  const [minLength, setMinLength] = useState(2);
  const [copied, setCopied] = useState(false);

  const words = input.trim()
    ? input.match(/\b[a-zA-Z']+\b/g) || []
    : [];

  const processed = words
    .map(w => caseInsensitive ? w.toLowerCase() : w)
    .filter(w => w.length >= minLength)
    .filter(w => !ignoreStopWords || !STOP_WORDS.has(w.toLowerCase()));

  const freqMap = {};
  for (const w of processed) freqMap[w] = (freqMap[w] || 0) + 1;

  const sorted = Object.entries(freqMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  const maxFreq = sorted[0]?.[1] || 1;
  const totalWords = words.length;
  const uniqueWords = Object.keys(freqMap).length;
  const avgLen = words.length
    ? (words.reduce((s, w) => s + w.length, 0) / words.length).toFixed(1)
    : 0;

  const copyCSV = () => {
    const csv = 'Word,Count,Percentage\n' +
      sorted.map(([w, c]) => `${w},${c},${((c / totalWords) * 100).toFixed(1)}%`).join('\n');
    navigator.clipboard.writeText(csv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none text-sm"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          placeholder="Paste your text here..."
        />

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={ignoreStopWords} onChange={e => setIgnoreStopWords(e.target.checked)} className="accent-primary-500 w-4 h-4" />
            <span className="text-surface-300">Ignore common words</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={caseInsensitive} onChange={e => setCaseInsensitive(e.target.checked)} className="accent-primary-500 w-4 h-4" />
            <span className="text-surface-300">Case-insensitive</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-surface-300">Min length:</span>
            <input type="number" min={1} max={10} value={minLength} onChange={e => setMinLength(Number(e.target.value))}
              className="w-14 px-2 py-1 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </label>
        </div>
      </div>

      {input.trim() && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex gap-4 flex-wrap text-sm">
            {[['Total words', totalWords], ['Unique words', uniqueWords], ['Avg length', avgLen]].map(([label, val]) => (
              <div key={label} className="rounded-xl px-4 py-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="font-bold text-surface-100 font-mono">{val}</div>
                <div className="text-surface-500 text-xs">{label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-surface-300">Top 20 Words</h3>
              <button onClick={copyCSV} className="px-3 py-1.5 text-white rounded-xl font-medium transition-colors text-xs" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
                {copied ? '✓ Copied!' : 'Copy CSV'}
              </button>
            </div>
            {sorted.map(([word, count]) => (
              <div key={word} className="flex items-center gap-3">
                <span className="w-28 text-sm font-mono text-surface-200 truncate">{word}</span>
                <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / maxFreq) * 100}%` }}
                    transition={{ duration: 0.4 }}
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
                  />
                </div>
                <span className="w-8 text-xs text-surface-500 text-right font-mono">{count}</span>
                <span className="w-12 text-xs text-surface-500 text-right">{((count / totalWords) * 100).toFixed(1)}%</span>
              </div>
            ))}
            {sorted.length === 0 && <p className="text-sm text-surface-500">No words match the current filters.</p>}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
