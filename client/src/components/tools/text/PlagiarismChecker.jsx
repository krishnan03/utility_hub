import { useState } from 'react';
import { motion } from 'framer-motion';

function tokenize(text) {
  return text.toLowerCase().match(/\b[a-z]+\b/g) || [];
}

function jaccardSimilarity(a, b) {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 && setB.size === 0) return 0;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

function getNgrams(text, n) {
  const words = tokenize(text);
  const ngrams = [];
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(' '));
  }
  return ngrams;
}

function findCommonPhrases(a, b, minN = 3) {
  const ngramsA = new Set(getNgrams(a, minN));
  const ngramsB = new Set(getNgrams(b, minN));
  return [...ngramsA].filter(ng => ngramsB.has(ng));
}

function highlightPhrases(text, phrases) {
  if (!phrases.length) return text;
  const escaped = phrases.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-500/30 rounded px-0.5">$1</mark>');
}

export default function PlagiarismChecker() {
  const [original, setOriginal] = useState('');
  const [comparison, setComparison] = useState('');
  const [result, setResult] = useState(null);

  const check = () => {
    const similarity = jaccardSimilarity(original, comparison);
    const phrases = findCommonPhrases(original, comparison, 3);
    setResult({ similarity: (similarity * 100).toFixed(1), phrases });
  };

  const similarityColor = result
    ? result.similarity >= 70 ? 'text-red-500' : result.similarity >= 40 ? 'text-yellow-500' : 'text-green-500'
    : '';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-xl px-4 py-3 text-sm text-amber-400" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
        This is a basic similarity check using Jaccard similarity on word sets — not a full plagiarism detection service.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[['Original Text', original, setOriginal], ['Comparison Text', comparison, setComparison]].map(([label, val, setter]) => (
          <div key={label} className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <label className="block text-sm font-medium text-surface-300">{label}</label>
            <textarea
              value={val}
              onChange={(e) => setter(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              placeholder="Paste text here..."
            />
          </div>
        ))}
      </div>

      <button
        onClick={check}
        disabled={!original.trim() || !comparison.trim()}
        className="px-4 py-2 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
        style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
      >
        Check Similarity
      </button>

      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className={`text-4xl font-extrabold font-mono ${similarityColor}`}>{result.similarity}%</div>
              <div className="text-xs text-surface-500 mt-1">Similarity</div>
            </div>
            <div className="flex-1 rounded-full h-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${result.similarity}%` }}
                transition={{ duration: 0.6 }}
                className={`h-full rounded-full ${Number(result.similarity) >= 70 ? 'bg-red-500' : Number(result.similarity) >= 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
              />
            </div>
          </div>

          {result.phrases.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-surface-300 mb-2">
                Common Phrases ({result.phrases.length} found)
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.phrases.slice(0, 20).map((p, i) => (
                  <span key={i} className="text-yellow-200 text-xs px-2 py-1 rounded-lg font-mono" style={{ background: 'rgba(234,179,8,0.15)' }}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[['Original', original], ['Comparison', comparison]].map(([label, text]) => (
              <div key={label}>
                <p className="text-xs font-medium text-surface-500 mb-1">{label} (highlighted)</p>
                <div
                  className="text-sm text-surface-200 rounded-xl p-3 max-h-40 overflow-y-auto leading-relaxed"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                  dangerouslySetInnerHTML={{ __html: highlightPhrases(text, result.phrases) }}
                />
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
