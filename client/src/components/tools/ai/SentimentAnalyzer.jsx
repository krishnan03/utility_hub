import { useState } from 'react';
import { motion } from 'framer-motion';

const POSITIVE = new Set([
  'good','great','excellent','amazing','wonderful','love','happy','joy','joyful','fantastic',
  'awesome','brilliant','superb','outstanding','perfect','beautiful','best','better','nice',
  'pleasant','delightful','enjoy','enjoyed','enjoying','positive','success','successful',
  'win','winning','won','glad','pleased','thrilled','excited','exciting','impressive',
  'incredible','magnificent','marvelous','splendid','terrific','fabulous','glorious',
  'cheerful','content','grateful','thankful','blessed','fortunate','lucky','proud',
  'confident','optimistic','hopeful','inspired','motivated','energetic','enthusiastic',
  'passionate','dedicated','committed','loyal','trustworthy','reliable','honest',
  'kind','generous','caring','compassionate','empathetic','supportive','helpful',
  'creative','innovative','talented','skilled','capable','strong','powerful','smart',
  'intelligent','wise','clever','bright','sharp','quick','efficient','effective',
  'productive','valuable','useful','beneficial','rewarding','satisfying','fulfilling',
  'meaningful','significant','important','worthy','deserving','admirable','respectable',
  'charming','elegant','graceful','stylish','attractive','appealing','engaging',
  'fun','entertaining','amusing','hilarious','funny','witty','playful','lively',
  'vibrant','dynamic','energizing','refreshing','uplifting','encouraging','inspiring',
  'peaceful','calm','serene','relaxing','comfortable','cozy','warm','welcoming',
  'safe','secure','stable','reliable','consistent','dependable','trustworthy',
  'progress','improvement','growth','achievement','accomplishment','milestone',
]);

const NEGATIVE = new Set([
  'bad','terrible','awful','hate','horrible','sad','angry','upset','disappointed',
  'disgusting','dreadful','pathetic','useless','worthless','failure','failed','fail',
  'wrong','mistake','error','problem','issue','trouble','difficult','hard','tough',
  'painful','hurt','harm','damage','destroy','ruin','waste','loss','lose','lost',
  'fear','afraid','scared','terrified','anxious','worried','stressed','overwhelmed',
  'frustrated','annoyed','irritated','angry','furious','rage','hate','despise',
  'dislike','reject','refuse','deny','ignore','neglect','abandon','betray',
  'lie','cheat','steal','corrupt','evil','wicked','cruel','mean','rude','harsh',
  'aggressive','violent','dangerous','threatening','harmful','toxic','poisonous',
  'sick','ill','disease','pain','suffer','suffering','miserable','unhappy','depressed',
  'lonely','isolated','abandoned','rejected','excluded','discriminated','bullied',
  'weak','powerless','helpless','hopeless','desperate','hopeless','worthless',
  'boring','dull','tedious','monotonous','repetitive','stagnant','stuck','trapped',
  'confusing','unclear','vague','ambiguous','misleading','deceptive','dishonest',
  'unfair','unjust','biased','prejudiced','discriminatory','oppressive','abusive',
  'expensive','costly','overpriced','wasteful','inefficient','ineffective','useless',
  'slow','delayed','late','missed','broken','damaged','defective','faulty','flawed',
  'dirty','messy','chaotic','disorganized','cluttered','overwhelming','excessive',
  'regret','regretful','sorry','apologize','shame','guilt','embarrassed','humiliated',
  'doubt','uncertain','unsure','confused','lost','overwhelmed','exhausted','tired',
]);

const INTENSIFIERS = new Set(['very','extremely','really','quite','absolutely','totally','completely','utterly','incredibly','remarkably','exceptionally','highly','deeply','strongly','greatly']);
const NEGATORS = new Set(['not','never','no','neither','nor','hardly','barely','scarcely','without','lack','lacking','cannot','cant',"can't","don't","doesn't","didn't","won't","wouldn't","shouldn't","couldn't","isn't","aren't","wasn't","weren't"]);

function tokenize(text) {
  return text.toLowerCase().match(/\b[\w']+\b/g) || [];
}

function analyzeSentence(sentence) {
  const tokens = tokenize(sentence);
  let score = 0;
  const posWords = [], negWords = [];

  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i];
    const isNegated = i > 0 && NEGATORS.has(tokens[i - 1]);
    const isIntensified = i > 0 && INTENSIFIERS.has(tokens[i - 1]);
    const multiplier = isIntensified ? 1.5 : 1;

    if (POSITIVE.has(w)) {
      const val = isNegated ? -1 * multiplier : 1 * multiplier;
      score += val;
      if (val > 0) posWords.push(w); else negWords.push(w);
    } else if (NEGATIVE.has(w)) {
      const val = isNegated ? 1 * multiplier : -1 * multiplier;
      score += val;
      if (val < 0) negWords.push(w); else posWords.push(w);
    }
  }

  return { score, posWords, negWords };
}

function analyzeText(text) {
  const sentences = text.split(/(?<=[.!?])\s+|(?<=\n)/).filter(s => s.trim().length > 2);
  const results = sentences.map(s => ({ text: s.trim(), ...analyzeSentence(s) }));

  const totalScore = results.reduce((a, b) => a + b.score, 0);
  const allPos = results.flatMap(r => r.posWords);
  const allNeg = results.flatMap(r => r.negWords);

  const maxPossible = Math.max(tokenize(text).length * 0.3, 1);
  const normalized = Math.max(-1, Math.min(1, totalScore / maxPossible));
  const confidence = Math.min(Math.abs(normalized) * 100 + 20, 95);

  const sentiment = normalized > 0.05 ? 'Positive' : normalized < -0.05 ? 'Negative' : 'Neutral';

  return { sentiment, score: normalized, confidence, sentences: results, posWords: [...new Set(allPos)], negWords: [...new Set(allNeg)] };
}

export default function SentimentAnalyzer() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);

  const run = () => { if (text.trim()) setResult(analyzeText(text)); };

  const sentimentColor = result
    ? result.sentiment === 'Positive' ? 'text-green-500' : result.sentiment === 'Negative' ? 'text-red-500' : 'text-surface-500'
    : '';

  const sentimentBg = result
    ? result.sentiment === 'Positive' ? 'bg-green-500' : result.sentiment === 'Negative' ? 'bg-red-500' : 'bg-gray-400'
    : '';

  const barPos = result ? Math.round(((result.score + 1) / 2) * 100) : 50;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">Text to Analyze</label>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={6}
            placeholder="Enter text to analyze its sentiment..."
            className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none text-sm"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
        <button onClick={run} disabled={text.trim().length < 5}
          className="px-4 py-2 text-white rounded-xl font-medium transition-colors disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
          Analyze Sentiment
        </button>
      </div>

      {result && (
        <>
          <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="text-center">
                <div className={`text-4xl font-bold ${sentimentColor}`}>{result.sentiment}</div>
                <div className="text-xs text-surface-400 mt-1">Overall Sentiment</div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-xs text-surface-400">
                  <span>Negative</span>
                  <span>Confidence: {result.confidence.toFixed(0)}%</span>
                  <span>Positive</span>
                </div>
                <div className="relative h-3 rounded-full" style={{ background: 'linear-gradient(to right, rgba(239,68,68,0.3), rgba(255,255,255,0.06), rgba(48,209,88,0.3))' }}>
                  <motion.div className={`absolute top-0 w-4 h-3 rounded-full ${sentimentBg} shadow-lg`}
                    initial={{ left: '50%' }} animate={{ left: `calc(${barPos}% - 8px)` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {result.posWords.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-accent-green mb-2">Positive Words</div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.posWords.slice(0, 12).map(w => (
                      <span key={w} className="px-2 py-0.5 text-green-300 rounded-lg text-xs font-medium" style={{ background: 'rgba(48,209,88,0.12)' }}>{w}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.negWords.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-red-400 mb-2">Negative Words</div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.negWords.slice(0, 12).map(w => (
                      <span key={w} className="px-2 py-0.5 text-red-300 rounded-lg text-xs font-medium" style={{ background: 'rgba(239,68,68,0.12)' }}>{w}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {result.sentences.length > 1 && (
            <div className="rounded-2xl p-6 space-y-3" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-sm font-semibold text-surface-300">Sentence Breakdown</h3>
              <div className="space-y-2">
                {result.sentences.map((s, i) => {
                  const sent = s.score > 0.1 ? 'Positive' : s.score < -0.1 ? 'Negative' : 'Neutral';
                  const dot = sent === 'Positive' ? 'bg-green-500' : sent === 'Negative' ? 'bg-red-500' : 'bg-gray-400';
                  return (
                    <div key={i} className="flex gap-3 items-start rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dot}`} />
                      <span className="text-sm text-surface-300 flex-1">{s.text}</span>
                      <span className={`text-xs font-medium shrink-0 ${sent === 'Positive' ? 'text-green-500' : sent === 'Negative' ? 'text-red-500' : 'text-surface-500'}`}>{sent}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
