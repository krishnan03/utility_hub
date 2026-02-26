import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'toolpilot_countdown_last';

const PRESETS = [
  { label: '🎆 New Year', getDate: () => { const y = new Date().getMonth() === 11 && new Date().getDate() === 31 ? new Date().getFullYear() + 1 : (new Date().getMonth() >= 0 ? new Date().getFullYear() + 1 : new Date().getFullYear()); return new Date(y, 0, 1, 0, 0, 0); } },
  { label: '🎄 Christmas', getDate: () => { const now = new Date(); const y = (now.getMonth() > 11 || (now.getMonth() === 11 && now.getDate() > 25)) ? now.getFullYear() + 1 : now.getFullYear(); return new Date(y, 11, 25, 0, 0, 0); } },
  { label: '🎃 Halloween', getDate: () => { const now = new Date(); const y = (now.getMonth() > 9 || (now.getMonth() === 9 && now.getDate() > 31)) ? now.getFullYear() + 1 : now.getFullYear(); return new Date(y, 9, 31, 0, 0, 0); } },
  { label: '💕 Valentine\'s', getDate: () => { const now = new Date(); const y = (now.getMonth() > 1 || (now.getMonth() === 1 && now.getDate() > 14)) ? now.getFullYear() + 1 : now.getFullYear(); return new Date(y, 1, 14, 0, 0, 0); } },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcDiff(target) {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  const isPast = diff < 0;
  const absDiff = Math.abs(diff);

  const totalSeconds = Math.floor(absDiff / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  // Approximate years/months for display
  const years = Math.floor(totalDays / 365.25);
  const remainingAfterYears = totalDays - Math.floor(years * 365.25);
  const months = Math.floor(remainingAfterYears / 30.44);
  const days = Math.floor(remainingAfterYears - Math.floor(months * 30.44));
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;
  const seconds = totalSeconds % 60;

  return { years, months, days, hours, minutes, seconds, isPast, totalDays };
}

function calcProgress(target) {
  const now = new Date();
  if (target <= now) return 100;
  // Use a reference point: 1 year before target or creation time
  const span = target.getTime() - (target.getTime() - 365.25 * 24 * 60 * 60 * 1000);
  const elapsed = now.getTime() - (target.getTime() - 365.25 * 24 * 60 * 60 * 1000);
  const pct = Math.max(0, Math.min(100, (elapsed / span) * 100));
  return pct;
}

function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toLocalTimeStr(d) {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { title: parsed.title || '', date: new Date(parsed.date) };
  } catch { return null; }
}

function saveCountdown(title, date) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ title, date: date.toISOString() }));
  } catch { /* ignore */ }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function GlassCard({ children, className = '', ...props }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: 'rgba(44,44,46,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}
      {...props}
    >
      {children}
    </div>
  );
}

function TimeUnit({ value, label, isPast }) {
  return (
    <div className="flex flex-col items-center">
      <GlassCard className="px-3 py-3 sm:px-5 sm:py-4 min-w-[60px] sm:min-w-[80px] text-center">
        <AnimatePresence mode="wait">
          <motion.span
            key={value}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className={`block text-3xl sm:text-4xl font-bold font-mono ${isPast ? 'text-orange-400' : 'text-surface-100'}`}
          >
            {String(value).padStart(2, '0')}
          </motion.span>
        </AnimatePresence>
      </GlassCard>
      <span className="text-[10px] sm:text-xs text-surface-500 uppercase tracking-wider mt-1.5 font-semibold">{label}</span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CountdownTimer() {
  const saved = useRef(loadSaved());

  // Parse URL params on mount
  const urlParams = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const dateStr = params.get('date');
    const titleStr = params.get('title');
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return { date: d, title: titleStr || '' };
    }
    return null;
  }, []);

  const initial = urlParams || saved.current || { date: PRESETS[0].getDate(), title: '' };

  const [targetDate, setTargetDate] = useState(initial.date);
  const [title, setTitle] = useState(initial.title);
  const [dateStr, setDateStr] = useState(toLocalDateStr(initial.date));
  const [timeStr, setTimeStr] = useState(toLocalTimeStr(initial.date));
  const [activePreset, setActivePreset] = useState(urlParams ? null : (saved.current ? null : 0));
  const [diff, setDiff] = useState(() => calcDiff(initial.date));
  const [copied, setCopied] = useState(false);

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => setDiff(calcDiff(targetDate)), 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  // Save to localStorage
  useEffect(() => {
    saveCountdown(title, targetDate);
  }, [title, targetDate]);

  const handleDateChange = useCallback((newDateStr) => {
    setDateStr(newDateStr);
    const d = new Date(`${newDateStr}T${timeStr}:00`);
    if (!isNaN(d.getTime())) {
      setTargetDate(d);
      setActivePreset(null);
    }
  }, [timeStr]);

  const handleTimeChange = useCallback((newTimeStr) => {
    setTimeStr(newTimeStr);
    const d = new Date(`${dateStr}T${newTimeStr}:00`);
    if (!isNaN(d.getTime())) {
      setTargetDate(d);
      setActivePreset(null);
    }
  }, [dateStr]);

  const handlePreset = useCallback((idx) => {
    const d = PRESETS[idx].getDate();
    setTargetDate(d);
    setDateStr(toLocalDateStr(d));
    setTimeStr(toLocalTimeStr(d));
    setActivePreset(idx);
    setTitle('');
  }, []);

  const handleShare = useCallback(async () => {
    const url = new URL(window.location.href.split('?')[0]);
    url.searchParams.set('date', targetDate.toISOString());
    if (title) url.searchParams.set('title', title);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [targetDate, title]);

  const progress = useMemo(() => calcProgress(targetDate), [targetDate, diff]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">

      {/* Title input */}
      <GlassCard className="p-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What are you counting down to?"
          className="w-full bg-transparent text-lg font-semibold text-surface-100 placeholder-surface-600 outline-none"
          maxLength={100}
          aria-label="Countdown title"
        />
      </GlassCard>

      {/* Date & Time pickers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <GlassCard className="p-4">
          <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Date</label>
          <input
            type="date"
            value={dateStr}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full min-h-[44px] bg-transparent text-surface-100 font-mono text-sm outline-none rounded-xl px-3 py-2"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            aria-label="Target date"
          />
        </GlassCard>
        <GlassCard className="p-4">
          <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Time</label>
          <input
            type="time"
            value={timeStr}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="w-full min-h-[44px] bg-transparent text-surface-100 font-mono text-sm outline-none rounded-xl px-3 py-2"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            aria-label="Target time"
          />
        </GlassCard>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p, idx) => (
          <motion.button
            key={p.label}
            type="button"
            onClick={() => handlePreset(idx)}
            whileTap={{ scale: 0.95 }}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${activePreset === idx ? 'text-white shadow-lg' : 'text-surface-400 hover:text-surface-300'}`}
            style={activePreset === idx
              ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }
              : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {p.label}
          </motion.button>
        ))}
      </div>

      {/* Countdown display */}
      <GlassCard className="p-6">
        {title && (
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-lg font-bold text-surface-200 mb-4"
          >
            {title}
          </motion.h2>
        )}

        {diff.isPast && (
          <div className="text-center mb-3">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-orange-400"
              style={{ background: 'rgba(255,159,67,0.15)', border: '1px solid rgba(255,159,67,0.3)' }}>
              Time elapsed
            </span>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {diff.years > 0 && <TimeUnit value={diff.years} label={diff.years === 1 ? 'Year' : 'Years'} isPast={diff.isPast} />}
          {(diff.years > 0 || diff.months > 0) && <TimeUnit value={diff.months} label={diff.months === 1 ? 'Month' : 'Months'} isPast={diff.isPast} />}
          <TimeUnit value={diff.days} label={diff.days === 1 ? 'Day' : 'Days'} isPast={diff.isPast} />
          <TimeUnit value={diff.hours} label={diff.hours === 1 ? 'Hour' : 'Hours'} isPast={diff.isPast} />
          <TimeUnit value={diff.minutes} label={diff.minutes === 1 ? 'Min' : 'Mins'} isPast={diff.isPast} />
          <TimeUnit value={diff.seconds} label={diff.seconds === 1 ? 'Sec' : 'Secs'} isPast={diff.isPast} />
        </div>

        {/* Target date display */}
        <p className="text-center text-xs text-surface-500 mt-4">
          {diff.isPast ? 'Since' : 'Until'}{' '}
          <span className="font-mono text-surface-400">
            {targetDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' at '}
            {targetDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </span>
        </p>
      </GlassCard>

      {/* Progress bar */}
      {!diff.isPast && (
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Progress</span>
            <span className="text-xs font-mono text-surface-400">{Math.round(progress)}%</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #FF6363, #FF9F43)' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </GlassCard>
      )}

      {/* Share button */}
      <motion.button
        type="button"
        onClick={handleShare}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="w-full min-h-[44px] px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.span key="copied" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              ✓ Link copied to clipboard!
            </motion.span>
          ) : (
            <motion.span key="share" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              🔗 Copy share link
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

    </motion.div>
  );
}
