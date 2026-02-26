import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { countWords, fleschKincaidGrade, gradeLabel } from '../../../utils/textUtils';

// ── Expanded misspellings (100+ entries) ─────────────────────────────
const MISSPELLINGS = {
  'teh':'the','recieve':'receive','occured':'occurred','seperate':'separate',
  'definately':'definitely','accomodate':'accommodate','occurance':'occurrence',
  'existance':'existence','independant':'independent','neccessary':'necessary',
  'perseverence':'perseverance','priviledge':'privilege','publically':'publicly',
  'questionaire':'questionnaire','recomend':'recommend','relevent':'relevant',
  'rythm':'rhythm','sieze':'seize','supercede':'supersede','tendancy':'tendency',
  'untill':'until','wierd':'weird','writting':'writing','acheive':'achieve',
  'arguement':'argument','beleive':'believe','calender':'calendar','cemetary':'cemetery',
  'collegue':'colleague','concious':'conscious','dissapear':'disappear','embarass':'embarrass',
  'enviroment':'environment','excercise':'exercise','familar':'familiar','foriegn':'foreign',
  'goverment':'government','grammer':'grammar','harrass':'harass','humourous':'humorous',
  'ignorence':'ignorance','immedietly':'immediately','innoculate':'inoculate','intresting':'interesting',
  'knowlege':'knowledge','liason':'liaison','maintainance':'maintenance','millenium':'millennium',
  'mischievious':'mischievous','noticable':'noticeable','occassion':'occasion','paralell':'parallel',
  'persistance':'persistence','posession':'possession','pronounciation':'pronunciation',
  'absense':'absence','accidentaly':'accidentally','adress':'address','agressive':'aggressive',
  'amature':'amateur','apparant':'apparent','assasination':'assassination','basicly':'basically',
  'begining':'beginning','buisness':'business','camoflage':'camouflage','carribean':'caribbean',
  'catagory':'category','changable':'changeable','comming':'coming','commited':'committed',
  'comparision':'comparison','competance':'competence','completly':'completely','concensus':'consensus',
  'contraversy':'controversy','convienient':'convenient','curiousity':'curiosity','decieve':'deceive',
  'desparate':'desperate','develope':'develop','dilema':'dilemma','disipline':'discipline',
  'drunkeness':'drunkenness','dumbell':'dumbbell','embarassment':'embarrassment','equiptment':'equipment',
  'exagerate':'exaggerate','exellent':'excellent','exsistence':'existence','experiance':'experience',
  'facinate':'fascinate','firey':'fiery','flourescent':'fluorescent','freind':'friend',
  'fulfil':'fulfill','gaurd':'guard','glamourous':'glamorous',
  'gratefull':'grateful','garantee':'guarantee','happyness':'happiness','harasment':'harassment',
  'heighth':'height','heirarchy':'hierarchy','hygeine':'hygiene','idiosyncracy':'idiosyncrasy',
  'immitate':'imitate','incidently':'incidentally','independance':'independence','innocense':'innocence',
  'inteligence':'intelligence','jewlery':'jewelry','judgement':'judgment','kernal':'kernel',
  'liesure':'leisure','lenght':'length','libary':'library','liscense':'license',
  'logicaly':'logically','lonliness':'loneliness','manuever':'maneuver','medeval':'medieval',
  'memento':'memento','minature':'miniature','mispell':'misspell','morgage':'mortgage',
  'naturaly':'naturally','neice':'niece','nineth':'ninth','ocasionally':'occasionally',
  'occurence':'occurrence','omision':'omission','oportunity':'opportunity','outragous':'outrageous',
  'parliment':'parliament','passtime':'pastime','peice':'piece','percieve':'perceive',
  'performence':'performance','permanant':'permanent','persue':'pursue','plagarism':'plagiarism',
  'politican':'politician','portugese':'portuguese','preceed':'precede','prefered':'preferred',
  'presance':'presence','privelege':'privilege','professer':'professor','progam':'program',
  'promiss':'promise','realy':'really','refered':'referred',
  'religous':'religious','repitition':'repetition','resistence':'resistance','responsable':'responsible',
  'restraunt':'restaurant','sacrilegious':'sacrilegious','sargent':'sergeant','shedule':'schedule',
  'sentance':'sentence','speach':'speech','strenght':'strength','succesful':'successful',
  'suprise':'surprise','temperture':'temperature','tommorow':'tomorrow','tounge':'tongue',
  'truely':'truly','tyrany':'tyranny','underate':'underrate','unfortunatly':'unfortunately',
  'vaccuum':'vacuum','vegatable':'vegetable','vehical':'vehicle','visious':'vicious',
  'wether':'whether','wich':'which','withdrawl':'withdrawal',
};

// ── Commonly confused words ──────────────────────────────────────────
const CONFUSED_WORDS = [
  { wrong: /\btheir\b(?=\s+(is|was|are|were|has|have|will|shall|can|could|would|should|might|may)\b)/gi, fix: 'there', msg: 'Did you mean "there"? ("their" = possessive)' },
  { wrong: /\bthere\b(?=\s+(car|house|dog|cat|book|idea|plan|work|team|name|own)\b)/gi, fix: 'their', msg: 'Did you mean "their"? ("there" = location)' },
  { wrong: /\byour\b(?=\s+(going|welcome|right|wrong|the\s+best|the\s+one|not|never|always|very)\b)/gi, fix: "you're", msg: 'Did you mean "you\'re" (you are)?' },
  { wrong: /\bits\b(?=\s+(a\s+good|a\s+bad|a\s+great|important|necessary|clear|obvious|true|possible|time)\b)/gi, fix: "it's", msg: 'Did you mean "it\'s" (it is)?' },
  { wrong: /\bthen\b(?=\s+(me|him|her|them|us|you|expected|usual|average)\b)/gi, fix: 'than', msg: 'Did you mean "than" (comparison)?' },
  { wrong: /\bloose\b(?=\s+(my|your|his|her|their|the|a|this|that|it)\b)/gi, fix: 'lose', msg: 'Did you mean "lose" (to misplace)?' },
  { wrong: /\bwho's\b(?=\s+(car|house|dog|book|idea|fault|turn|responsibility)\b)/gi, fix: 'whose', msg: 'Did you mean "whose" (possessive)?' },
  { wrong: /\baffect\b(?=\s+(of|is|was|has|will)\b)/gi, fix: 'effect', msg: 'Did you mean "effect" (noun)?' },
  { wrong: /\beffect\b(?=\s+(the|a|your|his|her|their|my|our|change|how)\b)/gi, fix: 'affect', msg: 'Did you mean "affect" (verb)?' },
];

// ── Subject-verb agreement patterns ──────────────────────────────────
const SUBJECT_VERB = [
  { pattern: /\bhe don't\b/gi, fix: "he doesn't", msg: 'Subject-verb agreement: "he doesn\'t"' },
  { pattern: /\bshe don't\b/gi, fix: "she doesn't", msg: 'Subject-verb agreement: "she doesn\'t"' },
  { pattern: /\bit don't\b/gi, fix: "it doesn't", msg: 'Subject-verb agreement: "it doesn\'t"' },
  { pattern: /\bthey was\b/gi, fix: 'they were', msg: 'Subject-verb agreement: "they were"' },
  { pattern: /\bwe was\b/gi, fix: 'we were', msg: 'Subject-verb agreement: "we were"' },
  { pattern: /\bI is\b/gi, fix: 'I am', msg: 'Subject-verb agreement: "I am"' },
  { pattern: /\byou is\b/gi, fix: 'you are', msg: 'Subject-verb agreement: "you are"' },
  { pattern: /\bhe have\b/gi, fix: 'he has', msg: 'Subject-verb agreement: "he has"' },
  { pattern: /\bshe have\b/gi, fix: 'she has', msg: 'Subject-verb agreement: "she has"' },
  { pattern: /\bit have\b/gi, fix: 'it has', msg: 'Subject-verb agreement: "it has"' },
];

// ── Introductory phrases needing commas ──────────────────────────────
const INTRO_PHRASES = [
  'however','therefore','meanwhile','furthermore','moreover','nevertheless',
  'consequently','additionally','unfortunately','fortunately','surprisingly',
  'obviously','clearly','apparently','certainly','indeed','finally',
  'similarly','likewise','accordingly','alternatively','conversely',
  'incidentally','naturally','presumably','undoubtedly',
];

const PAST_PARTICIPLES = new Set([
  'written','taken','given','known','seen','done','gone','been','made','said',
  'found','thought','told','felt','left','kept','brought','bought','caught','taught',
  'broken','chosen','driven','eaten','fallen','forgotten','frozen','grown','hidden',
  'ridden','risen','spoken','stolen','thrown','worn','woken','beaten','begun','blown',
]);

function checkGrammar(text) {
  if (!text.trim()) return [];
  const issues = [];
  const lines = text.split('\n');

  lines.forEach((line, lineIdx) => {
    const lineNum = lineIdx + 1;

    // Double spaces
    for (const m of line.matchAll(/  +/g)) {
      issues.push({ type: 'style', line: lineNum, col: m.index + 1, offset: m.index, length: m[0].length, message: 'Double space detected', severity: 'low', fix: ' ' });
    }

    // Sentence capitalization
    const sentences = line.match(/[^.!?]*[.!?]*/g) || [];
    let pos = 0;
    for (const sentence of sentences) {
      const trimmed = sentence.trimStart();
      if (trimmed.length > 1 && /[a-z]/.test(trimmed[0])) {
        const offset = pos + (sentence.length - trimmed.length);
        issues.push({ type: 'grammar', line: lineNum, col: offset + 1, offset, length: 1, message: 'Sentence should start with a capital letter', severity: 'medium', fix: trimmed[0].toUpperCase() });
      }
      pos += sentence.length;
    }

    // Misspellings
    for (const m of line.matchAll(/\b([a-zA-Z]+)\b/g)) {
      const lower = m[1].toLowerCase();
      if (MISSPELLINGS[lower]) {
        const fix = m[1][0] === m[1][0].toUpperCase()
          ? MISSPELLINGS[lower][0].toUpperCase() + MISSPELLINGS[lower].slice(1)
          : MISSPELLINGS[lower];
        issues.push({ type: 'spelling', line: lineNum, col: m.index + 1, offset: m.index, length: m[1].length, message: `Misspelling: "${m[1]}" → "${fix}"`, severity: 'high', fix, original: m[1] });
      }
    }

    // Repeated words
    for (const m of line.matchAll(/\b(\w+)\s+\1\b/gi)) {
      issues.push({ type: 'grammar', line: lineNum, col: m.index + 1, offset: m.index, length: m[0].length, message: `Repeated word: "${m[1]}"`, severity: 'medium', fix: m[1] });
    }

    // Commonly confused words
    for (const rule of CONFUSED_WORDS) {
      for (const m of line.matchAll(rule.wrong)) {
        issues.push({ type: 'grammar', line: lineNum, col: m.index + 1, offset: m.index, length: m[0].length, message: rule.msg, severity: 'medium', fix: rule.fix });
      }
    }

    // Subject-verb agreement
    for (const rule of SUBJECT_VERB) {
      for (const m of line.matchAll(rule.pattern)) {
        issues.push({ type: 'grammar', line: lineNum, col: m.index + 1, offset: m.index, length: m[0].length, message: rule.msg, severity: 'medium', fix: rule.fix });
      }
    }

    // Missing comma after introductory phrases
    for (const phrase of INTRO_PHRASES) {
      const regex = new RegExp(`\\b(${phrase})\\s+(?=[a-z])`, 'gi');
      for (const m of line.matchAll(regex)) {
        const afterPhrase = m[0].trimEnd();
        if (!line.slice(m.index + afterPhrase.length).startsWith(',')) {
          issues.push({ type: 'grammar', line: lineNum, col: m.index + 1, offset: m.index, length: afterPhrase.length, message: `Missing comma after "${afterPhrase}"`, severity: 'medium', fix: afterPhrase + ',' });
        }
      }
    }

    // Passive voice
    for (const m of line.matchAll(/\b(was|were|is|are|been|being)\s+(\w{2,})\b/gi)) {
      const participle = m[2].toLowerCase();
      if (PAST_PARTICIPLES.has(participle) || participle.endsWith('ed')) {
        issues.push({ type: 'style', line: lineNum, col: m.index + 1, offset: m.index, length: m[0].length, message: `Passive voice: "${m[0]}"`, severity: 'low' });
      }
    }

    // Very long sentences
    for (const s of line.split(/[.!?]/)) {
      const wc = s.trim().split(/\s+/).filter(Boolean).length;
      if (wc > 40) {
        issues.push({ type: 'style', line: lineNum, col: 1, offset: 0, length: 0, message: `Very long sentence (${wc} words) — consider splitting`, severity: 'low' });
      }
    }
  });

  return issues;
}


// ── Severity config ──────────────────────────────────────────────────
const SEVERITY_COLORS = {
  high: 'border-red-500/30 text-red-400',
  medium: 'border-yellow-500/30 text-yellow-400',
  low: 'border-blue-500/30 text-blue-400',
};
const SEVERITY_BG = {
  high: { background: 'rgba(239,68,68,0.08)' },
  medium: { background: 'rgba(234,179,8,0.08)' },
  low: { background: 'rgba(59,130,246,0.08)' },
};
const UNDERLINE_COLORS = { high: '#EF4444', medium: '#F59E0B', low: '#3B82F6' };
const TYPE_ICONS = { spelling: '🔤', grammar: '📝', style: '✨' };
const TYPE_LABELS = { spelling: 'Spelling', grammar: 'Grammar', style: 'Style' };

// ── Highlighted text renderer ────────────────────────────────────────
function HighlightedView({ text, issues, onClickIssue }) {
  if (!text) return null;

  // Build a flat list of character-level annotations per line
  const lines = text.split('\n');
  const lineOffsets = [];
  let running = 0;
  for (const l of lines) {
    lineOffsets.push(running);
    running += l.length + 1; // +1 for \n
  }

  // Map issues to absolute offsets
  const annotations = issues
    .filter(i => i.length > 0)
    .map((issue, idx) => {
      const absOffset = lineOffsets[issue.line - 1] + issue.offset;
      return { start: absOffset, end: absOffset + issue.length, severity: issue.severity, idx, issue };
    })
    .sort((a, b) => a.start - b.start);

  // Build segments
  const segments = [];
  let cursor = 0;
  for (const ann of annotations) {
    if (ann.start > cursor) {
      segments.push({ text: text.slice(cursor, ann.start), issue: null });
    }
    if (ann.start >= cursor) {
      segments.push({ text: text.slice(ann.start, ann.end), issue: ann });
      cursor = ann.end;
    }
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), issue: null });
  }

  return (
    <div
      className="w-full px-3 py-2 rounded-xl text-sm font-mono whitespace-pre-wrap break-words leading-relaxed"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
      aria-label="Highlighted text with grammar issues"
    >
      {segments.map((seg, i) =>
        seg.issue ? (
          <span
            key={i}
            role="button"
            tabIndex={0}
            onClick={() => onClickIssue(seg.issue.issue)}
            onKeyDown={(e) => e.key === 'Enter' && onClickIssue(seg.issue.issue)}
            className="cursor-pointer relative group"
            style={{
              borderBottom: `2px solid ${UNDERLINE_COLORS[seg.issue.severity]}`,
              paddingBottom: '1px',
            }}
            title={seg.issue.issue.message}
          >
            {seg.text}
            <span
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50"
              style={{ background: 'rgba(30,30,32,0.95)', border: '1px solid rgba(255,255,255,0.15)', color: '#e5e5e5' }}
            >
              {seg.issue.issue.message}
              {seg.issue.issue.fix && (
                <span className="ml-1.5 text-green-400">→ {seg.issue.issue.fix}</span>
              )}
            </span>
          </span>
        ) : (
          <span key={i} className="text-surface-300">{seg.text}</span>
        )
      )}
    </div>
  );
}

// ── Statistics bar ───────────────────────────────────────────────────
function StatsBar({ text, issues }) {
  const wc = countWords(text);
  const grade = wc > 0 ? fleschKincaidGrade(text) : 0;
  const label = wc > 0 ? gradeLabel(Math.max(0, grade)) : '—';
  const spellingCount = issues.filter(i => i.type === 'spelling').length;
  const grammarCount = issues.filter(i => i.type === 'grammar').length;
  const styleCount = issues.filter(i => i.type === 'style').length;

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <span className="px-2.5 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <span className="text-surface-400">{issues.length}</span>
        <span className="text-surface-500 ml-1">issues</span>
      </span>
      {spellingCount > 0 && (
        <span className="px-2.5 py-1 rounded-lg border border-red-500/20 text-red-400" style={{ background: 'rgba(239,68,68,0.06)' }}>
          🔤 {spellingCount}
        </span>
      )}
      {grammarCount > 0 && (
        <span className="px-2.5 py-1 rounded-lg border border-yellow-500/20 text-yellow-400" style={{ background: 'rgba(234,179,8,0.06)' }}>
          📝 {grammarCount}
        </span>
      )}
      {styleCount > 0 && (
        <span className="px-2.5 py-1 rounded-lg border border-blue-500/20 text-blue-400" style={{ background: 'rgba(59,130,246,0.06)' }}>
          ✨ {styleCount}
        </span>
      )}
      <span className="ml-auto px-2.5 py-1 rounded-lg text-surface-400" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {wc} words
      </span>
      <span className="px-2.5 py-1 rounded-lg text-surface-400" style={{ background: 'rgba(255,255,255,0.06)' }}>
        📖 {label}
      </span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────
export default function GrammarChecker() {
  const [input, setInput] = useState('');
  const [issues, setIssues] = useState([]);
  const [expandedType, setExpandedType] = useState(null);
  const [activeIssue, setActiveIssue] = useState(null);
  const debounceRef = useRef(null);

  // Debounced live checking at 300ms
  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setIssues(checkGrammar(val));
    }, 300);
  }, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // Fix All — apply all auto-fixable suggestions
  const fixAll = useCallback(() => {
    let fixed = input;
    // Sort issues by offset descending so replacements don't shift positions
    const lines = fixed.split('\n');
    const lineOffsets = [];
    let running = 0;
    for (const l of lines) { lineOffsets.push(running); running += l.length + 1; }

    const fixable = issues
      .filter(i => i.fix && i.length > 0)
      .map(i => ({ ...i, absOffset: lineOffsets[i.line - 1] + i.offset }))
      .sort((a, b) => b.absOffset - a.absOffset);

    for (const issue of fixable) {
      fixed = fixed.slice(0, issue.absOffset) + issue.fix + fixed.slice(issue.absOffset + issue.length);
    }
    setInput(fixed);
    setIssues(checkGrammar(fixed));
  }, [input, issues]);

  const fixableCount = issues.filter(i => i.fix && i.length > 0).length;
  const grouped = { spelling: [], grammar: [], style: [] };
  for (const i of issues) { if (grouped[i.type]) grouped[i.type].push(i); }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-xl px-4 py-3 text-sm text-primary-300" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.2)' }}>
        Real-time rule-based checker — spelling, grammar, confused words, subject-verb agreement, passive voice, and style. Not AI-powered.
      </div>

      {/* Textarea */}
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <textarea
          value={input}
          onChange={handleChange}
          rows={8}
          className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none text-sm"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          placeholder="Start typing or paste your text here — issues appear in real-time..."
          aria-label="Text input for grammar checking"
        />
      </div>

      {/* Stats bar */}
      {input.trim() && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          <StatsBar text={input} issues={issues} />
        </motion.div>
      )}

      {/* Highlighted text view */}
      {input.trim() && issues.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6 space-y-3" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Highlighted Preview</h3>
          <HighlightedView text={input} issues={issues} onClickIssue={setActiveIssue} />
        </motion.div>
      )}

      {/* Active issue detail popover */}
      <AnimatePresence>
        {activeIssue && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="rounded-xl px-4 py-3 flex items-center gap-3 text-sm"
            style={{ background: 'rgba(44,44,46,0.95)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <span className="text-lg">{TYPE_ICONS[activeIssue.type]}</span>
            <div className="flex-1 min-w-0">
              <span className={`font-medium ${activeIssue.severity === 'high' ? 'text-red-400' : activeIssue.severity === 'medium' ? 'text-yellow-400' : 'text-blue-400'}`}>
                {activeIssue.message}
              </span>
              <span className="ml-2 text-surface-500 text-xs">Line {activeIssue.line}</span>
            </div>
            <button onClick={() => setActiveIssue(null)} className="text-surface-500 hover:text-surface-300 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Dismiss">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Issues list grouped by type */}
      {input.trim() && issues.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6 space-y-3" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-surface-300">
              {issues.length} issue{issues.length !== 1 ? 's' : ''} found
            </h3>
          </div>

          {['spelling', 'grammar', 'style'].map(type => {
            const group = grouped[type];
            if (!group.length) return null;
            const isOpen = expandedType === type;
            return (
              <div key={type}>
                <button
                  onClick={() => setExpandedType(isOpen ? null : type)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5 min-h-[44px]"
                >
                  <span>{TYPE_ICONS[type]}</span>
                  <span className="text-surface-300">{TYPE_LABELS[type]}</span>
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${SEVERITY_COLORS[group[0].severity]}`} style={SEVERITY_BG[group[0].severity]}>
                    {group.length}
                  </span>
                  <span className="ml-auto text-surface-500 text-xs">{isOpen ? '▲' : '▼'}</span>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1.5 pl-2 pt-1 max-h-60 overflow-y-auto">
                        {group.map((issue, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className={`flex items-start gap-3 px-3 py-2 rounded-xl border text-sm ${SEVERITY_COLORS[issue.severity]}`}
                            style={SEVERITY_BG[issue.severity]}
                          >
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">{issue.message}</span>
                              <span className="ml-2 opacity-60 text-xs">Line {issue.line}, Col {issue.col}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Fix All button */}
      {fixableCount > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <button
            onClick={fixAll}
            className="px-5 py-2.5 text-white rounded-xl font-medium transition-all hover:scale-[1.02] active:scale-[0.98] min-h-[44px]"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
          >
            ✨ Fix All ({fixableCount} fixable)
          </button>
        </motion.div>
      )}

      {/* No issues state */}
      {input.trim() && issues.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6 text-center" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-green-400 font-medium">✅ No issues found!</p>
          <p className="text-sm text-surface-500 mt-1">Your text looks good based on our rule-based checks.</p>
        </motion.div>
      )}
    </motion.div>
  );
}
