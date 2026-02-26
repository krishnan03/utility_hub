import { useState } from 'react';
import { motion } from 'framer-motion';

const STOP_WORDS = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','shall','can','this','that','these','those','it','its','i','you','he','she','we','they','me','him','her','us','them','my','your','his','our','their','what','which','who','how','when','where','why','not','no','so','if','as','up','out','about','into','than','then','there','here','also','just','more','some','all','any','each','other','such','only','very','too','much','many','most','own','same','both','few','new','old','first','last','long','great','little','good','well','even','back','still','way','take','come','go','get','make','know','think','see','look','want','give','use','find','tell','ask','seem','feel','try','leave','call','keep','let','begin','show','hear','play','run','move','live','believe','hold','bring','happen','write','provide','sit','stand','lose','pay','meet','include','continue','set','learn','change','lead','understand','watch','follow','stop','create','speak','read','spend','grow','open','walk','win','offer','remember','love','consider','appear','buy','wait','serve','die','send','expect','build','stay','fall','cut','reach','kill','remain','suggest','raise','pass','sell','require','report','decide','pull']);

function tokenize(text) {
  return text.toLowerCase().match(/\b[a-z]{2,}\b/g) || [];
}

export default function KeywordDensityChecker() {
  const [content, setContent] = useState('');
  const [target, setTarget] = useState('');

  const words = tokenize(content);
  const totalWords = words.length;
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

  const freq = {};
  for (const w of words) {
    if (!STOP_WORDS.has(w)) freq[w] = (freq[w] || 0) + 1;
  }

  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 20);

  const targetWord = target.trim().toLowerCase();
  const targetCount = targetWord ? (freq[targetWord] || 0) : 0;
  const targetDensity = totalWords > 0 ? ((targetCount / totalWords) * 100).toFixed(2) : 0;

  const densityColor = (count) => {
    const d = (count / totalWords) * 100;
    if (d < 0.5) return 'bg-gray-200 dark:bg-gray-700';
    if (d <= 3) return 'bg-green-400';
    return 'bg-red-400';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">Content</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={6}
            placeholder="Paste your content here to analyze keyword density..."
            className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">Target Keyword</label>
          <input value={target} onChange={e => setTarget(e.target.value)} placeholder="e.g. keyword"
            className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}/>
        </div>
      </div>

      {totalWords > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[['Words', totalWords], ['Sentences', sentences], ['Unique Keywords', Object.keys(freq).length]].map(([label, val]) => (
              <div key={label} className="rounded-2xl p-4 text-center" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="text-2xl font-bold text-primary-400">{val.toLocaleString()}</div>
                <div className="text-xs text-surface-400 mt-1">{label}</div>
              </div>
            ))}
          </div>

          {targetWord && (
            <div className={`rounded-2xl p-6 ${parseFloat(targetDensity) >= 1 && parseFloat(targetDensity) <= 3 ? 'border-green-400/60' : 'border-amber-400/60'}`} style={{ background: 'rgba(44,44,46,0.8)' }}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-semibold text-surface-100">"{targetWord}"</div>
                  <div className="text-sm text-surface-400">{targetCount} occurrences · {targetDensity}% density</div>
                </div>
                <div className={`text-sm font-medium px-3 py-1 rounded-full ${parseFloat(targetDensity) >= 1 && parseFloat(targetDensity) <= 3 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : parseFloat(targetDensity) < 1 ? 'bg-blue-100 dark:bg-blue-900/30 text-primary-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                  {parseFloat(targetDensity) < 1 ? 'Too low' : parseFloat(targetDensity) <= 3 ? '✓ Optimal' : 'Too high'}
                </div>
              </div>
              <div className="text-xs text-surface-500 mt-2">Recommended density: 1–3%</div>
            </div>
          )}

          <div className="rounded-2xl p-6 space-y-3" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-sm font-semibold text-surface-300">Top 20 Keywords</h3>
            <div className="space-y-2">
              {sorted.map(([word, count]) => {
                const density = ((count / totalWords) * 100).toFixed(2);
                const barWidth = Math.min((count / sorted[0][1]) * 100, 100);
                return (
                  <div key={word} className="flex items-center gap-3">
                    <span className="w-28 text-sm font-mono text-surface-100 truncate">{word}</span>
                    <div className="flex-1 rounded-full h-2 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${densityColor(count)}`} style={{ width: `${barWidth}%` }} />
                    </div>
                    <span className="text-xs text-surface-400 w-8 text-right">{count}</span>
                    <span className="text-xs text-surface-500 w-12 text-right">{density}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
