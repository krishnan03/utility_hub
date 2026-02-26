import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Word maps per mode ─────────────────────────────────────────────── */

const BASE_SYNONYMS = {
  'good':['great','excellent','fine'],'bad':['poor','terrible','awful'],
  'big':['large','huge','enormous'],'small':['tiny','little','compact'],
  'fast':['quick','rapid','swift'],'slow':['gradual','leisurely','unhurried'],
  'happy':['joyful','pleased','delighted'],'sad':['unhappy','sorrowful','gloomy'],
  'important':['significant','crucial','essential'],'easy':['simple','straightforward','effortless'],
  'hard':['difficult','challenging','tough'],'new':['fresh','novel','recent'],
  'old':['ancient','aged','vintage'],'beautiful':['gorgeous','stunning','lovely'],
  'smart':['intelligent','clever','bright'],'strong':['powerful','robust','sturdy'],
  'weak':['feeble','fragile','frail'],'rich':['wealthy','affluent','prosperous'],
  'funny':['amusing','humorous','comical'],'serious':['grave','solemn','earnest'],
  'strange':['unusual','peculiar','odd'],'normal':['typical','standard','ordinary'],
  'show':['display','reveal','demonstrate'],'tell':['inform','notify','advise'],
  'get':['obtain','acquire','receive'],'make':['create','produce','build'],
  'use':['utilize','employ','apply'],'think':['believe','consider','suppose'],
  'know':['understand','realize','recognize'],'want':['desire','wish','seek'],
  'need':['require','demand','necessitate'],'help':['assist','support','aid'],
  'start':['begin','commence','initiate'],'stop':['cease','halt','discontinue'],
  'change':['alter','modify','transform'],'increase':['grow','expand','rise'],
  'decrease':['reduce','decline','diminish'],'problem':['issue','challenge','difficulty'],
  'solution':['answer','resolution','remedy'],'idea':['concept','notion','thought'],
  'plan':['strategy','approach','scheme'],'work':['function','operate','perform'],
  'place':['location','site','position'],'time':['period','moment','duration'],
  'way':['method','approach','manner'],'part':['portion','section','component'],
  'group':['team','collection','set'],'large':['substantial','considerable','extensive'],
  'many':['numerous','several','multiple'],'few':['limited','scarce','minimal'],
  'often':['frequently','regularly','commonly'],'always':['constantly','perpetually','invariably'],
  'never':['not ever','at no time','not once'],
};

const FORMAL_MAP = {
  'get':['obtain','acquire'],'got':['obtained','acquired'],'give':['provide','furnish'],
  'help':['assist','facilitate'],'show':['demonstrate','illustrate'],'use':['utilize','employ'],
  'need':['require','necessitate'],'want':['desire','intend'],'think':['consider','believe'],
  'start':['commence','initiate'],'end':['conclude','terminate'],'buy':['purchase','procure'],
  'ask':['inquire','request'],'try':['attempt','endeavor'],'find':['discover','ascertain'],
  'tell':['inform','advise'],'keep':['maintain','retain'],'let':['permit','allow'],
  'seem':['appear','indicate'],'look':['examine','observe'],'big':['substantial','significant'],
  'small':['minor','negligible'],'good':['satisfactory','commendable'],'bad':['unsatisfactory','inadequate'],
  'nice':['pleasant','agreeable'],'pretty':['rather','fairly'],'really':['considerably','substantially'],
  'very':['exceedingly','remarkably'],'a lot':['considerably','substantially'],
  'about':['approximately','regarding'],'enough':['sufficient','adequate'],
  'but':['however','nevertheless'],'so':['therefore','consequently'],
  'also':['additionally','furthermore'],'like':['such as','similar to'],
};

const SIMPLE_MAP = {
  'utilize':['use'],'commence':['start','begin'],'terminate':['end','stop'],
  'facilitate':['help'],'demonstrate':['show'],'approximately':['about','around'],
  'sufficient':['enough'],'endeavor':['try'],'ascertain':['find out'],
  'procure':['get','buy'],'furnish':['give'],'inquire':['ask'],
  'substantial':['big','large'],'negligible':['small','tiny'],
  'consequently':['so'],'nevertheless':['but','still'],'furthermore':['also'],
  'regarding':['about'],'adequate':['enough'],'considerable':['big','a lot of'],
  'implement':['do','carry out'],'subsequent':['next','later'],'prior':['before','earlier'],
  'obtain':['get'],'acquire':['get'],'require':['need'],'assist':['help'],
  'purchase':['buy'],'indicate':['show'],'observe':['see','watch'],
  'numerous':['many'],'minimal':['small','few'],'significant':['important','big'],
  'essential':['needed','key'],'challenging':['hard','tough'],
};

const CREATIVE_MAP = {
  'good':['remarkable','splendid','stellar'],'bad':['dreadful','abysmal','ghastly'],
  'big':['colossal','mammoth','towering'],'small':['minuscule','petite','microscopic'],
  'happy':['ecstatic','elated','overjoyed'],'sad':['melancholy','heartbroken','despondent'],
  'beautiful':['breathtaking','exquisite','radiant'],'fast':['lightning-fast','blazing','breakneck'],
  'important':['paramount','pivotal','monumental'],'interesting':['captivating','riveting','enthralling'],
  'said':['exclaimed','declared','proclaimed'],'walked':['strolled','sauntered','marched'],
  'looked':['gazed','peered','scrutinized'],'think':['envision','ponder','muse'],
  'very':['incredibly','extraordinarily','immensely'],'nice':['delightful','charming','enchanting'],
  'great':['magnificent','phenomenal','extraordinary'],
};

const EXPAND_TRANSITIONS = [
  'In other words, ','To elaborate, ','More specifically, ','That is to say, ',
  'To put it another way, ','In essence, ','Notably, ','It is worth mentioning that ',
];

const FILLER_WORDS = new Set([
  'really','very','just','quite','basically','actually','literally','simply',
  'definitely','certainly','absolutely','totally','completely','honestly','obviously',
  'clearly','essentially','practically','virtually','somewhat','rather','pretty',
]);

const CONTRACTIONS = {
  "don't":"do not","doesn't":"does not","didn't":"did not","can't":"cannot",
  "won't":"will not","wouldn't":"would not","shouldn't":"should not",
  "couldn't":"could not","isn't":"is not","aren't":"are not","wasn't":"was not",
  "weren't":"were not","hasn't":"has not","haven't":"have not","hadn't":"had not",
  "it's":"it is","that's":"that is","there's":"there is","here's":"here is",
  "what's":"what is","who's":"who is","let's":"let us","i'm":"I am",
  "you're":"you are","we're":"we are","they're":"they are","i've":"I have",
  "you've":"you have","we've":"we have","they've":"they have","i'll":"I will",
  "you'll":"you will","we'll":"we will","they'll":"they will","i'd":"I would",
  "you'd":"you would","we'd":"we would","they'd":"they would",
};

/* ── Mode definitions ───────────────────────────────────────────────── */

const MODES = [
  { id: 'standard',  label: 'Standard', icon: '✏️',  desc: 'Balanced rewrite with synonym replacement' },
  { id: 'fluency',   label: 'Fluency',  icon: '💧',  desc: 'Improve readability and flow' },
  { id: 'formal',    label: 'Formal',   icon: '🎩',  desc: 'Professional and academic tone' },
  { id: 'simple',    label: 'Simple',   icon: '🔤',  desc: 'Simplify complex language' },
  { id: 'creative',  label: 'Creative', icon: '🎨',  desc: 'Expressive, varied vocabulary' },
  { id: 'expand',    label: 'Expand',   icon: '📐',  desc: 'Add detail and elaboration' },
  { id: 'shorten',   label: 'Shorten',  icon: '✂️',  desc: 'Condense while keeping meaning' },
];

/* ── Transformation engine ──────────────────────────────────────────── */

function replaceWords(text, map, probability = 0.6) {
  return text.replace(/\b([a-zA-Z']+)\b/g, (match) => {
    const lower = match.toLowerCase();
    const syns = map[lower];
    if (!syns || Math.random() > probability) return match;
    const syn = syns[Math.floor(Math.random() * syns.length)];
    if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
      return syn.charAt(0).toUpperCase() + syn.slice(1);
    }
    return syn;
  });
}

function expandContractions(text) {
  return text.replace(/\b([a-zA-Z']+)\b/g, (match) => {
    const expanded = CONTRACTIONS[match.toLowerCase()];
    if (!expanded) return match;
    if (match[0] === match[0].toUpperCase()) return expanded.charAt(0).toUpperCase() + expanded.slice(1);
    return expanded;
  });
}

function removeFiller(text) {
  return text.replace(/\b([a-zA-Z]+)\b/g, (match) => {
    return FILLER_WORDS.has(match.toLowerCase()) ? '' : match;
  }).replace(/\s{2,}/g, ' ').replace(/\s([.,;:!?])/g, '$1');
}

function paraphraseByMode(text, mode) {
  switch (mode) {
    case 'standard':
      return replaceWords(text, BASE_SYNONYMS, 0.5);

    case 'fluency': {
      let out = replaceWords(text, BASE_SYNONYMS, 0.3);
      // Smooth transitions between sentences
      const sentences = out.split(/(?<=[.!?])\s+/);
      if (sentences.length > 2) {
        const transitions = ['Additionally, ','Moreover, ','Furthermore, ','In addition, '];
        out = sentences.map((s, i) => {
          if (i > 0 && i % 2 === 0 && Math.random() > 0.5) {
            const t = transitions[Math.floor(Math.random() * transitions.length)];
            return t + s.charAt(0).toLowerCase() + s.slice(1);
          }
          return s;
        }).join(' ');
      }
      return out;
    }

    case 'formal': {
      let out = expandContractions(text);
      out = replaceWords(out, FORMAL_MAP, 0.7);
      return out;
    }

    case 'simple': {
      let out = replaceWords(text, SIMPLE_MAP, 0.7);
      // Break long sentences
      out = out.replace(/([^.!?]{120,?})(,\s)/g, '$1. ');
      return out;
    }

    case 'creative':
      return replaceWords(text, CREATIVE_MAP, 0.6);

    case 'expand': {
      const sentences = text.split(/(?<=[.!?])\s+/);
      return sentences.map((s, i) => {
        if (i > 0 && Math.random() > 0.5) {
          const t = EXPAND_TRANSITIONS[Math.floor(Math.random() * EXPAND_TRANSITIONS.length)];
          return t.toLowerCase() + s.charAt(0).toLowerCase() + s.slice(1);
        }
        return replaceWords(s, BASE_SYNONYMS, 0.3);
      }).join(' ');
    }

    case 'shorten': {
      let out = removeFiller(text);
      out = replaceWords(out, BASE_SYNONYMS, 0.2);
      // Combine short consecutive sentences
      out = out.replace(/\.\s+([A-Z])/g, (_, c) => Math.random() > 0.6 ? `, and ${c.toLowerCase()}` : `. ${c}`);
      return out;
    }

    default:
      return replaceWords(text, BASE_SYNONYMS, 0.5);
  }
}

/* ── Similarity score ───────────────────────────────────────────────── */

function calcSimilarity(original, paraphrased) {
  const origWords = original.toLowerCase().split(/\s+/).filter(Boolean);
  const paraWords = paraphrased.toLowerCase().split(/\s+/).filter(Boolean);
  if (!origWords.length) return 100;
  let changed = 0;
  const len = Math.max(origWords.length, paraWords.length);
  for (let i = 0; i < len; i++) {
    if (origWords[i] !== paraWords[i]) changed++;
  }
  return Math.max(0, Math.round((1 - changed / len) * 100));
}

function wordCount(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/* ── Diff view ──────────────────────────────────────────────────────── */

function DiffView({ original, paraphrased }) {
  const origWords = original.split(/\s+/);
  const paraWords = paraphrased.split(/\s+/);
  const origSet = new Set(origWords.map(w => w.toLowerCase()));
  const paraSet = new Set(paraWords.map(w => w.toLowerCase()));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="rounded-xl p-3 text-sm leading-relaxed" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <p className="text-xs font-semibold text-surface-400 mb-2">Original</p>
        <p className="text-surface-200">
          {origWords.map((w, i) => {
            const isRemoved = !paraSet.has(w.toLowerCase());
            return <span key={i} className={isRemoved ? 'bg-red-500/20 text-red-400 rounded px-0.5' : ''}>{w} </span>;
          })}
        </p>
      </div>
      <div className="rounded-xl p-3 text-sm leading-relaxed" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <p className="text-xs font-semibold text-surface-400 mb-2">Paraphrased</p>
        <p className="text-surface-200">
          {paraWords.map((w, i) => {
            const isNew = !origSet.has(w.toLowerCase());
            return <span key={i} className={isNew ? 'bg-emerald-500/20 text-emerald-400 rounded px-0.5' : ''}>{w} </span>;
          })}
        </p>
      </div>
    </div>
  );
}

/* ── Component ──────────────────────────────────────────────────────── */

export default function Paraphraser() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('standard');
  const [output, setOutput] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = () => setOutput(paraphraseByMode(input, mode));

  const similarity = useMemo(() => (output ? calcSimilarity(input, output) : null), [input, output]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-xl px-4 py-3 text-sm text-amber-400" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
        Rule-based synonym replacement — results may need manual review.
      </div>

      {/* Mode selector */}
      <div className="overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex gap-2 min-w-max">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); if (output) setOutput(paraphraseByMode(input, m.id)); }}
              title={m.desc}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap min-h-[44px] ${mode === m.id ? 'text-white scale-[1.03]' : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'}`}
              style={mode === m.id ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mode description */}
      <p className="text-xs text-surface-400">
        {MODES.find((m) => m.id === mode)?.desc}
      </p>

      {/* Input area */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none text-sm"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          placeholder="Enter text to paraphrase..."
        />
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-surface-500">{wordCount(input)} words</p>
          <button
            onClick={run}
            disabled={!input.trim()}
            className="px-5 py-2.5 min-h-[44px] disabled:opacity-50 text-white rounded-xl font-semibold transition-all duration-200"
            style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
          >
            Paraphrase
          </button>
        </div>
      </div>

      {/* Output */}
      <AnimatePresence>
        {output && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Stats bar */}
            <div className="flex items-center gap-4 flex-wrap text-xs">
              <span className="text-surface-400">Output: {wordCount(output)} words</span>
              {similarity !== null && (
                <span className={`font-semibold ${similarity > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {100 - similarity}% changed
                </span>
              )}
              <button
                onClick={() => setShowDiff((d) => !d)}
                className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[44px] flex items-center"
                style={{ background: showDiff ? 'rgba(255,99,99,0.15)' : 'rgba(255,255,255,0.06)' }}
              >
                <span className={showDiff ? 'text-primary-400' : 'text-surface-400'}>{showDiff ? 'Hide diff' : 'Show diff'}</span>
              </button>
            </div>

            {/* Diff view */}
            {showDiff && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <DiffView original={input} paraphrased={output} />
              </motion.div>
            )}

            {/* Side-by-side result */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[['Original', input], ['Paraphrased', output]].map(([label, text]) => (
                <div key={label} className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-surface-300">{label}</h3>
                    <button
                      onClick={() => handleCopy(text)}
                      className="text-xs text-surface-500 hover:text-surface-200 transition-colors min-h-[44px] px-2 flex items-center"
                    >
                      {copied && text === output ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-sm text-surface-200 leading-relaxed rounded-xl p-3 min-h-[80px]" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
