import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PHASES = { WORK: 'Work', SHORT: 'Short Break', LONG: 'Long Break' };
const HISTORY_KEY = 'pomodoro-history';

const glassCard = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };
const gradientBtn = { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' };
const ghostBtn = { background: 'rgba(255,255,255,0.06)' };
const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' };

const phaseColors = {
  [PHASES.WORK]: '#FF6363',
  [PHASES.SHORT]: '#10b981',
  [PHASES.LONG]: '#8b5cf6',
};

// --- localStorage helpers ---
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
}
function saveHistory(history) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {}
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getTodaySessions(history) {
  const today = getTodayStr();
  return history.filter(s => s.date === today);
}

// --- Beep sound ---
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

// --- Ambient sound generators using Web Audio API ---
function createAmbientSound(type, ctx) {
  if (type === 'rain') {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 800;
    bandpass.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.value = 0.15;
    source.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    return { source, gain, stop: () => { try { source.stop(); } catch {} } };
  }
  if (type === 'cafe') {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 80;
    const gain = ctx.createGain();
    gain.gain.value = 0.12;
    source.connect(lp);
    lp.connect(hp);
    hp.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    return { source, gain, stop: () => { try { source.stop(); } catch {} } };
  }
  if (type === 'whitenoise') {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0.08;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    return { source, gain, stop: () => { try { source.stop(); } catch {} } };
  }
  return null;
}

const AMBIENT_OPTIONS = [
  { id: 'rain', label: '🌧 Rain' },
  { id: 'cafe', label: '☕ Cafe' },
  { id: 'whitenoise', label: '📻 White Noise' },
];

// --- Phase timeline builder ---
function buildPhaseTimeline(currentSessionCount) {
  // Standard pomodoro cycle: W S W S W S W L
  const cycle = [];
  for (let i = 0; i < 4; i++) {
    cycle.push(PHASES.WORK);
    cycle.push(i < 3 ? PHASES.SHORT : PHASES.LONG);
  }
  // Show 8 phases starting from current position in cycle
  const offset = (currentSessionCount * 2) % cycle.length;
  const timeline = [];
  for (let i = 0; i < 8; i++) {
    timeline.push(cycle[(offset + i) % cycle.length]);
  }
  return timeline;
}

// --- SVG gradient defs ---
const RING_GRADIENTS = {
  [PHASES.WORK]: { id: 'ring-work', stops: ['#FF6363', '#FF9F43'] },
  [PHASES.SHORT]: { id: 'ring-short', stops: ['#10b981', '#34d399'] },
  [PHASES.LONG]: { id: 'ring-long', stops: ['#8b5cf6', '#a78bfa'] },
};

export default function PomodoroTimer() {
  const [config, setConfig] = useState({ work: 25, short: 5, long: 15 });
  const [phase, setPhase] = useState(PHASES.WORK);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [autoStart, setAutoStart] = useState(false);
  const [taskLabel, setTaskLabel] = useState('');
  const [history, setHistory] = useState(loadHistory);
  const [ambientSound, setAmbientSound] = useState(null);

  const intervalRef = useRef(null);
  const ambientRef = useRef(null);
  const audioCtxRef = useRef(null);
  const phaseStartRef = useRef(Date.now());

  const totalSeconds = phase === PHASES.WORK ? config.work * 60 : phase === PHASES.SHORT ? config.short * 60 : config.long * 60;
  const progress = 1 - seconds / totalSeconds;
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const phaseColor = phaseColors[phase];
  const gradDef = RING_GRADIENTS[phase];

  const todaySessions = useMemo(() => getTodaySessions(history), [history]);
  const todayFocus = useMemo(() => todaySessions.filter(s => s.phase === PHASES.WORK).reduce((a, s) => a + s.duration, 0), [todaySessions]);
  const todayBreak = useMemo(() => todaySessions.filter(s => s.phase !== PHASES.WORK).reduce((a, s) => a + s.duration, 0), [todaySessions]);
  const todayCount = todaySessions.length;

  const phaseTimeline = useMemo(() => buildPhaseTimeline(sessions), [sessions]);

  // --- Record completed session ---
  const recordSession = useCallback((completedPhase, durationMin) => {
    const entry = {
      id: Date.now(),
      date: getTodayStr(),
      timestamp: new Date().toISOString(),
      phase: completedPhase,
      duration: durationMin,
      task: taskLabel || null,
    };
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, 500); // keep last 500
      saveHistory(next);
      return next;
    });
  }, [taskLabel]);

  // --- Phase transition ---
  const nextPhase = useCallback(() => {
    beep();
    recordSession(phase, phase === PHASES.WORK ? config.work : phase === PHASES.SHORT ? config.short : config.long);

    if (phase === PHASES.WORK) {
      const newSessions = sessions + 1;
      setSessions(newSessions);
      const next = newSessions % 4 === 0 ? PHASES.LONG : PHASES.SHORT;
      setPhase(next);
      setSeconds((next === PHASES.LONG ? config.long : config.short) * 60);
    } else {
      setPhase(PHASES.WORK);
      setSeconds(config.work * 60);
    }
    phaseStartRef.current = Date.now();
    if (!autoStart) setRunning(false);
  }, [phase, sessions, config, autoStart, recordSession]);

  // --- Timer tick ---
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) { clearInterval(intervalRef.current); nextPhase(); return 0; }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, nextPhase]);

  // --- Ambient sound management ---
  useEffect(() => {
    // Cleanup previous
    if (ambientRef.current) {
      ambientRef.current.stop();
      ambientRef.current = null;
    }
    if (audioCtxRef.current && !ambientSound) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (ambientSound) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      ambientRef.current = createAmbientSound(ambientSound, ctx);
    }
    return () => {
      if (ambientRef.current) { ambientRef.current.stop(); ambientRef.current = null; }
      if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    };
  }, [ambientSound]);

  const reset = () => {
    setRunning(false);
    setSeconds(config.work * 60);
    setPhase(PHASES.WORK);
    setSessions(0);
    phaseStartRef.current = Date.now();
  };

  const skip = () => nextPhase();

  const toggleAmbient = (id) => {
    setAmbientSound(prev => prev === id ? null : id);
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const formatMin = (m) => {
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r > 0 ? `${h}h ${r}m` : `${h}h`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">

      {/* Daily Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Focus Time', value: formatMin(todayFocus), color: 'text-red-400', icon: '🔥' },
          { label: 'Break Time', value: formatMin(todayBreak), color: 'text-green-400', icon: '☕' },
          { label: 'Sessions', value: todayCount, color: 'text-primary-400', icon: '✅' },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-4 text-center" style={glassCard}>
            <div className="text-lg mb-1">{s.icon}</div>
            <div className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-xs text-surface-400 mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Phase Timeline */}
      <div className="rounded-2xl p-4" style={glassCard}>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {phaseTimeline.map((p, i) => {
            const isCurrent = i === 0;
            const short = p === PHASES.WORK ? 'W' : p === PHASES.SHORT ? 'S' : 'L';
            const color = phaseColors[p];
            return (
              <div key={i} className="flex items-center flex-shrink-0">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.15 : 1,
                    opacity: isCurrent ? 1 : 0.5,
                  }}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${isCurrent ? 'ring-2 ring-white/20' : ''}`}
                    style={{
                      background: isCurrent ? color : 'rgba(255,255,255,0.06)',
                      color: isCurrent ? '#fff' : color,
                    }}
                  >
                    {short}
                  </div>
                  <span className="text-[10px] text-surface-500 whitespace-nowrap">
                    {p === PHASES.WORK ? 'Work' : p === PHASES.SHORT ? 'Short' : 'Long'}
                  </span>
                </motion.div>
                {i < phaseTimeline.length - 1 && (
                  <div className="w-3 h-px mx-0.5 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Timer Card */}
      <div className="rounded-2xl p-6 flex flex-col items-center gap-6" style={glassCard}>
        <div className="text-sm font-semibold uppercase tracking-widest" style={{ color: phaseColor }}>{phase}</div>

        {/* Enhanced Progress Ring */}
        <div className="relative w-48 h-48">
          {/* Glow effect */}
          <AnimatePresence>
            {running && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${phaseColor}22 0%, transparent 70%)`,
                  filter: 'blur(12px)',
                }}
              />
            )}
          </AnimatePresence>

          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <defs>
              <linearGradient id={gradDef.id} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={gradDef.stops[0]} />
                <stop offset="100%" stopColor={gradDef.stops[1]} />
              </linearGradient>
              <filter id="ring-glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Background track */}
            <circle cx="100" cy="100" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-white/10" />
            {/* Progress arc with gradient */}
            <circle cx="100" cy="100" r={radius} fill="none" strokeWidth="6" strokeLinecap="round"
              stroke={`url(#${gradDef.id})`}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              filter="url(#ring-glow)"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-mono font-bold text-surface-100">{mm}:{ss}</span>
            {taskLabel && (
              <span className="text-xs text-surface-400 mt-2 max-w-[140px] truncate text-center">{taskLabel}</span>
            )}
          </div>
        </div>

        <div className="text-sm text-surface-400">Sessions completed: <span className="font-bold text-surface-100">{sessions}</span></div>

        {/* Task Label Input */}
        <div className="w-full max-w-xs">
          <input
            type="text"
            value={taskLabel}
            onChange={e => setTaskLabel(e.target.value)}
            placeholder="What are you working on?"
            className="w-full px-3 py-2 rounded-xl text-sm text-surface-100 text-center focus:outline-none focus:ring-2 focus:ring-primary-500/40 placeholder:text-surface-500"
            style={inputStyle}
          />
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2 flex-wrap justify-center">
          <button onClick={() => setRunning(r => !r)}
            className="px-5 py-2.5 text-white rounded-xl font-medium transition-all hover:scale-105"
            style={gradientBtn}>
            {running ? 'Pause' : 'Start'}
          </button>
          <button onClick={reset}
            className="px-4 py-2 text-surface-100 rounded-xl font-medium transition-colors hover:bg-white/5"
            style={ghostBtn}>Reset</button>
          <button onClick={skip}
            className="px-4 py-2 text-surface-100 rounded-xl font-medium transition-colors hover:bg-white/5"
            style={ghostBtn}>Skip</button>
        </div>

        {/* Auto-start toggle */}
        <button
          onClick={() => setAutoStart(a => !a)}
          className="flex items-center gap-2 text-sm transition-colors"
        >
          <div className={`w-9 h-5 rounded-full relative transition-colors ${autoStart ? 'bg-primary-500' : 'bg-white/10'}`}>
            <motion.div
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
              animate={{ left: autoStart ? '18px' : '2px' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </div>
          <span className="text-surface-400">Auto-start next phase</span>
        </button>

        {/* Ambient Sounds */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-surface-500 uppercase tracking-wider">Ambient Sound</span>
          <div className="flex gap-2">
            {AMBIENT_OPTIONS.map(opt => (
              <button key={opt.id} onClick={() => toggleAmbient(opt.id)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                  ambientSound === opt.id
                    ? 'text-white ring-1 ring-primary-500/50'
                    : 'text-surface-300 hover:bg-white/5'
                }`}
                style={{
                  background: ambientSound === opt.id
                    ? 'linear-gradient(135deg, rgba(255,99,99,0.2), rgba(255,159,67,0.2))'
                    : 'rgba(255,255,255,0.06)',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="rounded-2xl p-6" style={glassCard}>
        <h3 className="text-sm font-semibold text-surface-300 mb-4">Configuration (minutes)</h3>
        <div className="grid grid-cols-3 gap-4">
          {[['work', 'Work', 1, 60], ['short', 'Short Break', 1, 30], ['long', 'Long Break', 1, 60]].map(([k, label, min, max]) => (
            <div key={k}>
              <label className="block text-xs text-surface-400 mb-1">{label}</label>
              <input type="number" min={min} max={max} value={config[k]}
                onChange={e => {
                  const v = Number(e.target.value);
                  setConfig(c => ({ ...c, [k]: v }));
                  if (!running && phase === (k === 'work' ? PHASES.WORK : k === 'short' ? PHASES.SHORT : PHASES.LONG)) setSeconds(v * 60);
                }}
                className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                style={inputStyle} />
            </div>
          ))}
        </div>
      </div>

      {/* Today's Sessions History */}
      {todaySessions.length > 0 && (
        <div className="rounded-2xl p-6" style={glassCard}>
          <h3 className="text-sm font-semibold text-surface-300 mb-4">Today's Sessions</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <AnimatePresence>
              {todaySessions.map((s, i) => {
                const time = new Date(s.timestamp);
                const hh = String(time.getHours()).padStart(2, '0');
                const mi = String(time.getMinutes()).padStart(2, '0');
                const color = phaseColors[s.phase] || '#FF6363';
                return (
                  <motion.div key={s.id}
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={ghostBtn}>
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      {i < todaySessions.length - 1 && <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.1)' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-surface-100">{s.phase}</span>
                        <span className="text-xs text-surface-500">{s.duration}m</span>
                      </div>
                      {s.task && <span className="text-xs text-surface-500 truncate block">{s.task}</span>}
                    </div>
                    <span className="text-xs text-surface-500 font-mono flex-shrink-0">{hh}:{mi}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
}
