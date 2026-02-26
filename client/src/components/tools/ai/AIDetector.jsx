import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Constants ─────────────────────────────────────────────────────────
const AI_PHRASES = [
  "certainly", "absolutely", "i'd be happy to", "as an ai", "it's worth noting",
  "in conclusion", "furthermore", "moreover", "additionally", "it is important to note",
  "it is worth mentioning", "needless to say", "in summary", "to summarize",
  "in essence", "as previously mentioned", "it goes without saying", "delve",
  "leverage", "utilize", "facilitate", "implement", "ensure", "provide",
  "comprehensive", "straightforward", "robust", "seamless", "cutting-edge",
  "state-of-the-art", "best practices", "key takeaways", "moving forward",
  "at the end of the day", "in today's world", "in the realm of",
];

const FORMAL_WORDS = [
  "therefore", "however", "nevertheless", "consequently", "subsequently",
  "aforementioned", "henceforth", "therein", "wherein", "thereby",
  "notwithstanding", "heretofore", "inasmuch", "insofar", "thereof",
  "herein", "pursuant", "vis-à-vis", "ergo",
];

const TRANSITION_WORDS = [
  "however", "moreover", "furthermore", "additionally", "consequently",
  "nevertheless", "nonetheless", "meanwhile", "subsequently", "therefore",
  "thus", "hence", "accordingly", "similarly", "likewise", "conversely",
  "in contrast", "on the other hand", "in addition", "as a result",
];

const card = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' };
const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' };

// ── Sentence splitter ─────────────────────────────────────────────────
function splitSentences(text) {
  const raw = text.match(/[^.!?]+[.!?]+[\s]*/g) || [text];
  return raw.map(s => s.trim()).filter(s => s.length > 2);
}

// ── Perplexity (word frequency-based proxy) ───────────────────────────
function calcPerplexity(words) {
  if (words.length < 5) return 0;
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  const total = words.length;
  let entropy = 0;
  Object.values(freq).forEach(count => {
    const p = count / total;
    if (p > 0) entropy -= p * Math.log2(p);
  });
  // Normalize to 0-100 scale; higher entropy = more diverse = more human-like
  return Math.min(100, Math.round((entropy / Math.log2(Math.min(total, 1000))) * 100));
}

// ── Burstiness (sentence length variance) ─────────────────────────────
function calcBurstiness(sentences) {
  if (sentences.length < 3) return 0;
  const lengths = sentences.map(s => s.split(/\s+/).length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / lengths.length;
  const cv = avg > 0 ? Math.sqrt(variance) / avg : 0;
  // Normalize: higher CV = more bursty = more human-like
  return Math.min(100, Math.round(cv * 100));
}

// ── Sentence-level scoring ────────────────────────────────────────────
function scoreSentence(sentence) {
  const lower = sentence.toLowerCase();
  const words = lower.match(/\b\w+\b/g) || [];
  const len = words.length;
  let score = 0;

  // AI phrase hits
  const phraseHits = AI_PHRASES.filter(p => lower.includes(p));
  score += Math.min(phraseHits.length * 15, 40);

  // Transition word at start
  const firstFew = words.slice(0, 3).join(' ');
  if (TRANSITION_WORDS.some(tw => firstFew.startsWith(tw))) score += 10;

  // Formal vocabulary density
  const formalHits = FORMAL_WORDS.filter(w => lower.includes(w));
  score += Math.min(formalHits.length * 5, 15);

  // Sentence length penalty: AI tends toward 15-25 word sentences
  if (len >= 14 && len <= 26) score += 8;

  // Low contraction usage (AI avoids contractions)
  const contractions = (sentence.match(/\b\w+'\w+/g) || []).length;
  if (contractions === 0 && len > 8) score += 5;

  return Math.min(Math.round(score), 100);
}

// ── Repetition detection ──────────────────────────────────────────────
function detectRepetition(sentences) {
  if (sentences.length < 4) return { score: 0, detail: '' };
  const starters = sentences.map(s => {
    const words = s.trim().split(/\s+/).slice(0, 3).join(' ').toLowerCase();
    return words;
  });
  const freq = {};
  starters.forEach(s => { freq[s] = (freq[s] || 0) + 1; });
  const repeated = Object.entries(freq).filter(([, c]) => c > 1);
  const ratio = repeated.reduce((a, [, c]) => a + c, 0) / sentences.length;
  if (ratio > 0.3) {
    return { score: Math.round(ratio * 25), detail: `${repeated.length} repeated sentence openings detected` };
  }
  return { score: 0, detail: '' };
}

// ── Paragraph structure analysis ──────────────────────────────────────
function analyzeParagraphs(text) {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 10);
  if (paragraphs.length < 2) return { score: 0, detail: '' };
  const lengths = paragraphs.map(p => p.split(/\s+/).length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / lengths.length;
  const cv = avg > 0 ? Math.sqrt(variance) / avg : 0;
  // Low CV = uniform paragraphs = more AI-like
  if (cv < 0.3 && paragraphs.length >= 3) {
    return { score: 12, detail: `Uniform paragraph lengths (CV: ${cv.toFixed(2)})` };
  }
  return { score: 0, detail: '' };
}

// ── Main analysis ─────────────────────────────────────────────────────
function analyze(text) {
  if (!text.trim()) return null;
  const lower = text.toLowerCase();
  const words = lower.match(/\b\w+\b/g) || [];
  const sentences = splitSentences(text);
  const totalWords = words.length;

  // Sentence-level scores
  const sentenceScores = sentences.map(s => ({ text: s, score: scoreSentence(s) }));

  // AI phrase detection
  const foundPhrases = AI_PHRASES.filter(p => lower.includes(p));

  // Sentence length uniformity
  const sentLengths = sentences.map(s => s.trim().split(/\s+/).length);
  const avgLen = sentLengths.reduce((a, b) => a + b, 0) / (sentLengths.length || 1);
  const variance = sentLengths.reduce((a, b) => a + Math.pow(b - avgLen, 2), 0) / (sentLengths.length || 1);
  const uniformity = Math.max(0, 1 - (Math.sqrt(variance) / (avgLen || 1)));

  // Personal pronouns
  const personalPronouns = (lower.match(/\b(i|me|my|mine|myself|we|us|our|ours)\b/g) || []).length;
  const pronounRatio = personalPronouns / (totalWords || 1);
  const lowPronouns = pronounRatio < 0.02;

  // Formal vocabulary
  const formalCount = FORMAL_WORDS.filter(w => lower.includes(w)).length;
  const formalRatio = formalCount / (totalWords / 100 || 1);

  // Transition word frequency
  const transitionCount = TRANSITION_WORDS.filter(tw => lower.includes(tw)).length;
  const transitionRatio = transitionCount / (sentences.length || 1);

  // Word frequency distribution (Shannon entropy)
  const wordFreq = {};
  words.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
  const uniqueRatio = Object.keys(wordFreq).length / (totalWords || 1);

  // Repetition
  const repetition = detectRepetition(sentences);

  // Paragraph structure
  const paraAnalysis = analyzeParagraphs(text);

  // Perplexity & burstiness
  const perplexity = calcPerplexity(words);
  const burstiness = calcBurstiness(sentences);

  // ── Scoring ───────────────────────────────────────────────────────
  let score = 0;
  const signals = [];

  if (foundPhrases.length > 0) {
    const pts = Math.min(foundPhrases.length * 8, 35);
    score += pts;
    signals.push({ label: 'AI-typical phrases detected', detail: foundPhrases.slice(0, 5).map(p => `"${p}"`).join(', '), weight: pts, type: 'high' });
  }

  if (uniformity > 0.7) {
    const pts = Math.round(uniformity * 20);
    score += pts;
    signals.push({ label: 'Uniform sentence lengths', detail: `Avg ${avgLen.toFixed(1)} words/sentence, low variation`, weight: pts, type: 'medium' });
  }

  if (lowPronouns && totalWords > 50) {
    score += 15;
    signals.push({ label: 'Low personal pronoun usage', detail: `${(pronounRatio * 100).toFixed(1)}% of words are personal pronouns`, weight: 15, type: 'medium' });
  }

  if (formalRatio > 1) {
    const pts = Math.min(Math.round(formalRatio * 3), 15);
    score += pts;
    signals.push({ label: 'High formal vocabulary', detail: `${formalCount} formal/academic words found`, weight: pts, type: 'low' });
  }

  if (transitionRatio > 0.4) {
    const pts = Math.min(Math.round(transitionRatio * 12), 12);
    score += pts;
    signals.push({ label: 'Excessive transition words', detail: `${transitionCount} transition words across ${sentences.length} sentences`, weight: pts, type: 'medium' });
  }

  if (uniqueRatio < 0.45 && totalWords > 50) {
    const pts = Math.round((0.5 - uniqueRatio) * 30);
    score += pts;
    signals.push({ label: 'Low vocabulary diversity', detail: `${(uniqueRatio * 100).toFixed(1)}% unique words`, weight: pts, type: 'low' });
  }

  if (repetition.score > 0) {
    score += repetition.score;
    signals.push({ label: 'Repetitive sentence structure', detail: repetition.detail, weight: repetition.score, type: 'medium' });
  }

  if (paraAnalysis.score > 0) {
    score += paraAnalysis.score;
    signals.push({ label: 'Uniform paragraph structure', detail: paraAnalysis.detail, weight: paraAnalysis.score, type: 'low' });
  }

  // Low burstiness = AI-like
  if (burstiness < 30 && sentences.length > 4) {
    const pts = Math.round((30 - burstiness) * 0.4);
    score += pts;
    signals.push({ label: 'Low burstiness', detail: 'Sentence complexity is unusually uniform', weight: pts, type: 'low' });
  }

  score = Math.min(Math.round(score), 98);
  const confidence = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low';
  const verdict = score >= 70 ? 'Likely AI-generated' : score >= 40 ? 'Possibly AI-assisted' : 'Likely human-written';

  return { score, confidence, verdict, signals, totalWords, sentences: sentences.length, sentenceScores, perplexity, burstiness };
}

// ── Gauge component ───────────────────────────────────────────────────
function Gauge({ value, label, description, invert }) {
  // invert: high value = human-like (green), low = AI-like (red)
  const color = invert
    ? (value >= 60 ? '#22c55e' : value >= 35 ? '#eab308' : '#ef4444')
    : (value < 30 ? '#22c55e' : value < 60 ? '#eab308' : '#ef4444');
  const pct = Math.max(0, Math.min(100, value));
  const radius = 40;
  const circumference = Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center text-center">
      <svg width="100" height="60" viewBox="0 0 100 60" aria-hidden="true">
        <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" strokeLinecap="round" />
        <motion.path
          d="M 10 55 A 40 40 0 0 1 90 55"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="text-2xl font-bold font-mono mt-1" style={{ color }}>{pct}</div>
      <div className="text-xs font-semibold text-surface-200 mt-0.5">{label}</div>
      <div className="text-[10px] text-surface-500 mt-0.5 max-w-[140px]">{description}</div>
    </div>
  );
}

// ── Sentence highlight component ──────────────────────────────────────
function SentenceHighlight({ sentenceScores }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-[10px] text-surface-500 mb-2">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Likely human (&lt;30%)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> Uncertain (30-70%)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Likely AI (&gt;70%)</span>
      </div>
      <div className="rounded-xl p-4 text-sm leading-relaxed" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {sentenceScores.map((s, i) => {
          const bg = s.score >= 70
            ? 'rgba(239,68,68,0.15)'
            : s.score >= 30
            ? 'rgba(234,179,8,0.12)'
            : 'rgba(34,197,94,0.1)';
          const borderColor = s.score >= 70
            ? 'rgba(239,68,68,0.4)'
            : s.score >= 30
            ? 'rgba(234,179,8,0.3)'
            : 'rgba(34,197,94,0.25)';
          return (
            <span
              key={i}
              className="relative cursor-default rounded px-0.5 transition-all"
              style={{ background: bg, borderBottom: `2px solid ${borderColor}` }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {s.text}{' '}
              {hoveredIdx === i && (
                <span
                  className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-xs font-mono whitespace-nowrap z-10 shadow-lg"
                  style={{ background: 'rgba(20,20,22,0.95)', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  AI: {s.score}%
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Report export ─────────────────────────────────────────────────────
function exportReport(result, text) {
  const lines = [
    '═══════════════════════════════════════',
    '       AI CONTENT DETECTION REPORT',
    '═══════════════════════════════════════',
    '',
    `Overall Score: ${result.score}% AI probability`,
    `Verdict: ${result.verdict}`,
    `Confidence: ${result.confidence}`,
    `Words: ${result.totalWords} | Sentences: ${result.sentences}`,
    `Perplexity: ${result.perplexity}/100 | Burstiness: ${result.burstiness}/100`,
    '',
    '── Detected Patterns ──────────────────',
    ...result.signals.map(s => `• ${s.label} (+${s.weight}pts)\n  ${s.detail}`),
    '',
    '── Sentence Breakdown ─────────────────',
    ...result.sentenceScores.map((s, i) =>
      `[${String(i + 1).padStart(2, '0')}] ${s.score}% AI — ${s.text}`
    ),
    '',
    '═══════════════════════════════════════',
    'Generated by ToolsPilot AI Detector',
    'Heuristic-based — not a definitive result.',
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ai-detection-report.txt';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Component ────────────────────────────────────────────────────
export default function AIDetector() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState('overview');

  const run = () => { setResult(analyze(text)); setTab('overview'); };

  const scoreColor = result
    ? result.score >= 70 ? 'text-red-500' : result.score >= 40 ? 'text-yellow-500' : 'text-green-500'
    : '';
  const barColor = result
    ? result.score >= 70 ? 'bg-red-500' : result.score >= 40 ? 'bg-yellow-500' : 'bg-green-500'
    : 'bg-primary-500';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Warning banner */}
      <div className="rounded-2xl px-4 py-3 text-sm text-amber-400" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
        ⚠️ Heuristic-based detection — not a definitive AI detector. Results are indicative only.
      </div>

      {/* Input */}
      <div className="rounded-2xl p-6 space-y-4" style={card}>
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">Text to Analyze</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={7}
            placeholder="Paste text here to check if it was written by AI..."
            className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none text-sm"
            style={inputStyle}
          />
          <p className="text-xs text-surface-500 mt-1">{text.split(/\s+/).filter(Boolean).length} words</p>
        </div>
        <button
          onClick={run}
          disabled={text.trim().length < 20}
          className="px-4 py-2.5 text-white rounded-xl font-medium transition-colors disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)', minHeight: 44 }}
        >
          Analyze Text
        </button>
      </div>

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Score header */}
          <div className="rounded-2xl p-6 space-y-5" style={card}>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="text-center">
                <div className={`text-5xl font-bold ${scoreColor}`}>{result.score}%</div>
                <div className="text-xs text-surface-400 mt-1">AI Probability</div>
              </div>
              <div className="flex-1 space-y-2 min-w-[200px]">
                <div className="flex items-center justify-between text-sm">
                  <span className={`font-semibold ${scoreColor}`}>{result.verdict}</span>
                  <span className="text-surface-400">Confidence: {result.confidence}</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div
                    className={`h-full rounded-full ${barColor}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${result.score}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex justify-between text-xs text-surface-500">
                  <span>Human</span><span>AI</span>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {[
                ['Words', result.totalWords],
                ['Sentences', result.sentences],
                ['Perplexity', result.perplexity],
                ['Burstiness', result.burstiness],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl px-4 py-2 flex justify-between" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <span className="text-surface-400">{l}</span>
                  <span className="font-semibold text-surface-100 font-mono">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Gauges */}
          <div className="rounded-2xl p-6" style={card}>
            <h3 className="text-sm font-semibold text-surface-300 mb-4">Linguistic Metrics</h3>
            <div className="flex justify-around flex-wrap gap-6">
              <Gauge value={result.perplexity} label="Perplexity" description="Higher = more diverse vocabulary (human-like)" invert />
              <Gauge value={result.burstiness} label="Burstiness" description="Higher = more varied sentence lengths (human-like)" invert />
              <Gauge value={result.score} label="AI Score" description="Overall AI probability based on all signals" invert={false} />
            </div>
          </div>

          {/* Tabs for detailed views */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'overview', label: '📊 Patterns' },
              { key: 'highlight', label: '🖍️ Sentence Highlight' },
              { key: 'breakdown', label: '📋 Breakdown Table' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  tab === t.key
                    ? 'text-white shadow-lg'
                    : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'
                }`}
                style={tab === t.key
                  ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', minHeight: 44 }
                  : { ...inputStyle, minHeight: 44 }
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-2xl p-6 space-y-3" style={card}>
                <h3 className="text-sm font-semibold text-surface-300">Detected Patterns</h3>
                {result.signals.length === 0 && (
                  <p className="text-sm text-surface-500">No strong AI signals detected.</p>
                )}
                {result.signals.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-xl px-4 py-3 text-sm"
                    style={
                      s.type === 'high'
                        ? { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }
                        : s.type === 'medium'
                        ? { background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }
                        : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-surface-100">{s.label}</span>
                      <span className="text-xs text-surface-400">+{s.weight}pts</span>
                    </div>
                    <div className="text-xs text-surface-400 mt-0.5">{s.detail}</div>
                  </div>
                ))}
              </motion.div>
            )}

            {tab === 'highlight' && (
              <motion.div key="highlight" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-2xl p-6" style={card}>
                <h3 className="text-sm font-semibold text-surface-300 mb-3">Sentence-Level Analysis</h3>
                <SentenceHighlight sentenceScores={result.sentenceScores} />
              </motion.div>
            )}

            {tab === 'breakdown' && (
              <motion.div key="breakdown" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-2xl p-6 space-y-4" style={card}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-surface-300">Sentence Breakdown</h3>
                  <button
                    onClick={() => exportReport(result, text)}
                    className="px-3 py-2 rounded-lg text-xs font-medium text-primary-400 hover:bg-primary-500/10 transition-colors"
                    style={{ minHeight: 44 }}
                  >
                    📥 Export Report
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-surface-500 border-b border-white/5">
                        <th className="pb-2 pr-3 w-10">#</th>
                        <th className="pb-2 pr-3">Sentence</th>
                        <th className="pb-2 w-20 text-right">AI %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.sentenceScores.map((s, i) => {
                        const color = s.score >= 70 ? 'text-red-400' : s.score >= 30 ? 'text-yellow-400' : 'text-green-400';
                        return (
                          <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                            <td className="py-2 pr-3 text-surface-500 font-mono text-xs">{i + 1}</td>
                            <td className="py-2 pr-3 text-surface-300 text-xs leading-relaxed">{s.text}</td>
                            <td className={`py-2 text-right font-mono font-semibold ${color}`}>{s.score}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
