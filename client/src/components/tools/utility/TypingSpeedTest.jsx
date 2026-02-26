import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Text samples per difficulty ---
const TEXTS = {
  easy: [
    "The sun is warm today. I like to walk in the park. Birds sing in the trees.",
    "She went to the store to buy some milk and bread. It was a nice day outside.",
    "The cat sat on the mat. It was soft and warm. The cat purred happily.",
    "I love reading books before bed. My favorite genre is science fiction.",
  ],
  medium: [
    "Technology is best when it brings people together. The science of today is the technology of tomorrow. Innovation distinguishes between a leader and a follower.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts. The only way to do great work is to love what you do.",
    "To be or not to be, that is the question. Whether tis nobler in the mind to suffer the slings and arrows of outrageous fortune.",
    "In the beginning was the Word, and the Word was with God. The universe is under no obligation to make sense to you.",
  ],
  hard: [
    'const arr = [1, 2, 3].map((x) => x * 2); if (arr.length > 0) { console.log(`Result: ${arr.join(", ")}`); }',
    'function debounce(fn, ms = 300) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; }',
    'const obj = { ...defaults, ...overrides }; Object.keys(obj).forEach((k) => { if (obj[k] === null) delete obj[k]; });',
    'export default async (req, res) => { try { const data = await fetch(url); res.json({ ok: true, data }); } catch (e) { res.status(500).json({ error: e.message }); } };',
  ],
};

const DIFFICULTY_META = {
  easy: { label: 'Easy', desc: 'Short sentences', color: 'text-green-400' },
  medium: { label: 'Medium', desc: 'Paragraphs', color: 'text-yellow-400' },
  hard: { label: 'Hard', desc: 'Code snippets', color: 'text-red-400' },
};

const TIME_OPTIONS = [30, 60, 120];

const GRADES = [
  { min: 100, label: 'Pro', color: 'text-primary-400', bg: 'rgba(255,149,0,0.15)' },
  { min: 70, label: 'Fast', color: 'text-green-400', bg: 'rgba(74,222,128,0.12)' },
  { min: 50, label: 'Good', color: 'text-blue-400', bg: 'rgba(96,165,250,0.12)' },
  { min: 30, label: 'Average', color: 'text-yellow-400', bg: 'rgba(250,204,21,0.12)' },
  { min: 0, label: 'Beginner', color: 'text-surface-400', bg: 'rgba(255,255,255,0.06)' },
];

const getGrade = (wpm) => GRADES.find((g) => wpm >= g.min) || GRADES[GRADES.length - 1];

const PB_KEY = 'typing-test-pb';

function loadPersonalBests() {
  try { return JSON.parse(localStorage.getItem(PB_KEY)) || {}; } catch { return {}; }
}

function savePersonalBest(difficulty, duration, wpm) {
  const bests = loadPersonalBests();
  const key = `${difficulty}-${duration}`;
  if (!bests[key] || wpm > bests[key]) { bests[key] = wpm; localStorage.setItem(PB_KEY, JSON.stringify(bests)); return true; }
  return false;
}

function getPersonalBest(difficulty, duration) {
  return loadPersonalBests()[`${difficulty}-${duration}`] || 0;
}

export default function TypingSpeedTest() {
  const [difficulty, setDifficulty] = useState('medium');
  const [textIdx, setTextIdx] = useState(0);
  const [duration, setDuration] = useState(60);
  const [input, setInput] = useState('');
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [errors, setErrors] = useState(0);
  const [wpmHistory, setWpmHistory] = useState([]);
  const [isNewPB, setIsNewPB] = useState(false);

  const intervalRef = useRef(null);
  const wpmIntervalRef = useRef(null);
  const textareaRef = useRef(null);
  const startTimeRef = useRef(null);
  const targetRef = useRef(null);

  const texts = TEXTS[difficulty];
  const target = texts[textIdx % texts.length];
  const pb = getPersonalBest(difficulty, duration);

  // Timer
  useEffect(() => {
    if (started && !finished) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) { clearInterval(intervalRef.current); setFinished(true); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [started, finished]);

  // WPM history tracker — every 5 seconds
  useEffect(() => {
    if (started && !finished) {
      wpmIntervalRef.current = setInterval(() => {
        if (!startTimeRef.current) return;
        const elapsed = (Date.now() - startTimeRef.current) / 1000 / 60;
        if (elapsed <= 0) return;
        setInput((cur) => {
          const words = cur.trim().split(/\s+/).filter(Boolean).length;
          const snap = Math.round(words / elapsed);
          setWpmHistory((h) => [...h, snap]);
          return cur;
        });
      }, 5000);
    }
    return () => clearInterval(wpmIntervalRef.current);
  }, [started, finished]);

  // Check personal best on finish
  useEffect(() => {
    if (finished && wpm > 0) {
      const newBest = savePersonalBest(difficulty, duration, wpm);
      setIsNewPB(newBest);
    }
  }, [finished, wpm, difficulty, duration]);

  const handleInput = useCallback((val) => {
    if (finished) return;
    if (!started && val.length > 0) {
      setStarted(true);
      startTimeRef.current = Date.now();
    }
    setInput(val);

    const words = val.trim().split(/\s+/).filter(Boolean).length;
    const elapsed = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 / 60 : 0;
    setWpm(elapsed > 0 ? Math.round(words / elapsed) : 0);

    let errs = 0;
    for (let i = 0; i < val.length; i++) {
      if (val[i] !== target[i]) errs++;
    }
    setErrors(errs);
    setAccuracy(val.length > 0 ? Math.round(((val.length - errs) / val.length) * 100) : 100);

    if (val === target) { clearInterval(intervalRef.current); setFinished(true); }
  }, [finished, started, target]);

  const reset = useCallback(() => {
    clearInterval(intervalRef.current);
    clearInterval(wpmIntervalRef.current);
    setInput(''); setStarted(false); setFinished(false);
    setTimeLeft(duration); setWpm(0); setAccuracy(100); setErrors(0);
    setWpmHistory([]); setIsNewPB(false);
    startTimeRef.current = null;
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [duration]);

  const changeDifficulty = (d) => { setDifficulty(d); setTextIdx(0); reset(); };
  const changeDuration = (d) => { setDuration(d); setTimeLeft(d); reset(); };
  const changeText = (i) => { setTextIdx(i); reset(); };

  // Scroll target text to keep cursor visible
  useEffect(() => {
    if (!targetRef.current) return;
    const cursor = targetRef.current.querySelector('[data-cursor="true"]');
    if (cursor) cursor.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [input]);

  const grade = useMemo(() => getGrade(wpm), [wpm]);
  const elapsed = duration - timeLeft;

  const renderTarget = () => {
    return target.split('').map((ch, i) => {
      const isTyped = i < input.length;
      const isCurrent = i === input.length;
      const isCorrect = isTyped && input[i] === ch;
      const isWrong = isTyped && input[i] !== ch;

      let cls = 'text-surface-500';
      if (isCorrect) cls = 'text-green-400';
      else if (isWrong) cls = 'text-red-400 bg-red-500/20 rounded-sm';
      else if (isCurrent) cls = 'text-surface-100';

      return (
        <span key={i} className={`relative ${cls}`} data-cursor={isCurrent ? 'true' : undefined}>
          {isCurrent && !finished && (
            <span className="absolute left-0 bottom-0 w-full h-0.5 bg-primary-500 animate-pulse rounded" />
          )}
          {ch}
        </span>
      );
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Config panel */}
      <div className="rounded-2xl p-6 space-y-5" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Difficulty + Time selectors */}
        <div className="flex flex-wrap items-center gap-6">
          {/* Difficulty */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">Difficulty</label>
            <div className="flex gap-1.5">
              {Object.entries(DIFFICULTY_META).map(([key, meta]) => (
                <button key={key} onClick={() => changeDifficulty(key)}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                    difficulty === key
                      ? 'text-white bg-gradient-to-r from-primary-500 to-orange-400 shadow-lg shadow-primary-500/20'
                      : 'text-surface-300 hover:bg-white/5'
                  }`}
                  style={difficulty !== key ? { background: 'rgba(255,255,255,0.06)' } : undefined}>
                  {meta.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">Duration</label>
            <div className="flex gap-1.5">
              {TIME_OPTIONS.map((t) => (
                <button key={t} onClick={() => changeDuration(t)}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                    duration === t
                      ? 'text-white bg-gradient-to-r from-primary-500 to-orange-400 shadow-lg shadow-primary-500/20'
                      : 'text-surface-300 hover:bg-white/5'
                  }`}
                  style={duration !== t ? { background: 'rgba(255,255,255,0.06)' } : undefined}>
                  {t}s
                </button>
              ))}
            </div>
          </div>

          {/* Timer display */}
          <div className="ml-auto text-right">
            <div className={`text-3xl font-mono font-bold transition-colors ${timeLeft <= 10 ? 'text-red-500' : 'text-primary-400'}`}>
              {timeLeft}s
            </div>
            {pb > 0 && (
              <p className="text-xs text-surface-500 mt-0.5">Best: {pb} WPM</p>
            )}
          </div>
        </div>

        {/* Text sample selector */}
        <div className="flex gap-2 flex-wrap">
          {texts.map((_, i) => (
            <button key={i} onClick={() => changeText(i)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                textIdx === i
                  ? 'text-white bg-white/10'
                  : 'text-surface-400 hover:bg-white/5'
              }`}
              style={textIdx !== i ? { background: 'rgba(255,255,255,0.04)' } : { background: 'rgba(255,255,255,0.1)' }}>
              Text #{i + 1}
            </button>
          ))}
          <span className={`ml-2 text-xs self-center ${DIFFICULTY_META[difficulty].color}`}>
            {DIFFICULTY_META[difficulty].desc}
          </span>
        </div>

        {/* Target text */}
        <div ref={targetRef}
          className="rounded-xl p-4 font-mono text-sm leading-relaxed select-none max-h-40 overflow-y-auto"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {renderTarget()}
        </div>

        {/* Input */}
        <textarea ref={textareaRef} value={input} onChange={(e) => handleInput(e.target.value)}
          disabled={finished}
          placeholder={started ? '' : 'Start typing to begin the test...'}
          rows={3}
          className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm resize-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        />

        {/* Reset button — fixed theme */}
        <div className="flex gap-2">
          <button onClick={reset}
            className="px-4 py-2 rounded-xl font-medium transition-all text-surface-300 hover:bg-white/5"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            Reset
          </button>
        </div>
      </div>

      {/* Live stats */}
      <AnimatePresence>
        {(started || finished) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            className="rounded-2xl p-6 space-y-5" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {[
                ['WPM', wpm, 'text-primary-400'],
                ['Accuracy', `${accuracy}%`, accuracy >= 95 ? 'text-green-400' : accuracy >= 80 ? 'text-yellow-400' : 'text-red-400'],
                ['Errors', errors, errors === 0 ? 'text-green-400' : 'text-red-400'],
                ['Time', `${elapsed}s`, 'text-purple-400'],
              ].map(([label, val, color]) => (
                <div key={label} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className={`text-3xl font-bold ${color}`}>{val}</div>
                  <div className="text-xs text-surface-400 mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* Finished state */}
            {finished && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="space-y-5">

                {/* New PB celebration */}
                <AnimatePresence>
                  {isNewPB && (
                    <motion.div initial={{ opacity: 0, y: -10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="text-center rounded-xl p-4"
                      style={{ background: 'rgba(255,149,0,0.12)', border: '1px solid rgba(255,149,0,0.3)' }}>
                      <div className="text-2xl mb-1">🏆</div>
                      <p className="text-primary-400 font-bold text-lg">New Personal Best!</p>
                      <p className="text-surface-400 text-sm">{wpm} WPM on {DIFFICULTY_META[difficulty].label} ({duration}s)</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Grade display */}
                <div className="flex items-center justify-center gap-4">
                  <div className="rounded-xl px-6 py-4 text-center" style={{ background: grade.bg, border: `1px solid ${grade.bg}` }}>
                    <p className="text-xs text-surface-400 mb-1">Your Grade</p>
                    <p className={`text-2xl font-bold ${grade.color}`}>{grade.label}</p>
                    <p className="text-xs text-surface-500 mt-1">{wpm} WPM</p>
                  </div>
                </div>

                {/* WPM over time chart */}
                {wpmHistory.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-surface-300">WPM Over Time</p>
                    <div className="flex items-end gap-1.5 h-32 rounded-xl p-4"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {wpmHistory.map((w, i) => {
                        const maxW = Math.max(...wpmHistory, 1);
                        const pct = (w / maxW) * 100;
                        return (
                          <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${pct}%` }}
                            transition={{ duration: 0.4, delay: i * 0.05 }}
                            className="flex-1 rounded-t-md bg-gradient-to-t from-primary-500 to-orange-400 relative group min-w-[12px]">
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {w}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[10px] text-surface-500 px-4">
                      <span>5s</span>
                      <span>{wpmHistory.length * 5}s</span>
                    </div>
                  </div>
                )}

                <p className="text-center text-sm text-green-400 font-semibold">Test complete! 🎉</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
