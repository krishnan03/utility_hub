import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  generatePassword,
  generatePassphrase,
  calculateStrength,
  checkBreach,
} from '../../../utils/passwordGenerator';

// ─── Constants ───────────────────────────────────────────────────────────────

const SEPARATOR_OPTIONS = [
  { label: '-', value: '-' },
  { label: '_', value: '_' },
  { label: '.', value: '.' },
  { label: 'space', value: ' ' },
  { label: 'none', value: '' },
];

const STRENGTH_CONFIG = {
  0: { color: 'bg-red-500', text: 'text-red-400', width: '20%', glow: 'shadow-red-500/30' },
  1: { color: 'bg-orange-500', text: 'text-orange-400', width: '40%', glow: 'shadow-orange-500/30' },
  2: { color: 'bg-yellow-500', text: 'text-yellow-400', width: '60%', glow: 'shadow-yellow-500/30' },
  3: { color: 'bg-green-500', text: 'text-green-400', width: '75%', glow: 'shadow-green-500/30' },
  4: { color: 'bg-emerald-400', text: 'text-emerald-400', width: '100%', glow: 'shadow-emerald-500/30' },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function GlassCard({ children, className = '', ...props }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: 'rgba(44,44,46,0.8)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
      {...props}
    >
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-colors hover:bg-white/[0.03]"
      style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 rounded accent-primary-500" />
      <span className="text-sm text-surface-300">{label}</span>
    </label>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PasswordGenerator() {
  // Mode
  const [mode, setMode] = useState('password');

  // Password options
  const [length, setLength] = useState(16);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [special, setSpecial] = useState(true);

  // Passphrase options
  const [wordCount, setWordCount] = useState(4);
  const [separator, setSeparator] = useState('-');
  const [capitalize, setCapitalize] = useState(true);
  const [includeNumber, setIncludeNumber] = useState(false);

  // Output state
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  // Breach check state
  const [breachResult, setBreachResult] = useState(null);
  const [breachLoading, setBreachLoading] = useState(false);
  const [breachError, setBreachError] = useState(null);

  // Password history (session only)
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [copiedHistoryIdx, setCopiedHistoryIdx] = useState(null);

  // Ref for initial generation
  const initialGenerated = useRef(false);

  // ─── Generate ────────────────────────────────────────────────────────────

  const generate = useCallback(() => {
    let newResult;
    if (mode === 'password') {
      newResult = generatePassword({ length, uppercase, lowercase, numbers, special });
    } else {
      newResult = generatePassphrase({ wordCount, separator, capitalize, includeNumber });
    }
    setResult(newResult);
    setCopied(false);
    setBreachResult(null);
    setBreachError(null);

    // Add to history
    const output = newResult.password || newResult.passphrase;
    if (output) {
      setHistory((prev) => {
        const next = [{ value: output, mode, timestamp: Date.now() }, ...prev];
        return next.slice(0, 10);
      });
    }
  }, [mode, length, uppercase, lowercase, numbers, special, wordCount, separator, capitalize, includeNumber]);

  // Auto-generate on first render
  useEffect(() => {
    if (!initialGenerated.current) {
      initialGenerated.current = true;
      generate();
    }
  }, [generate]);

  // Auto-regenerate when settings change
  useEffect(() => {
    if (initialGenerated.current) {
      generate();
    }
  }, [mode, length, uppercase, lowercase, numbers, special, wordCount, separator, capitalize, includeNumber]);
  // Note: generate is intentionally omitted to avoid double-fire on mount.
  // The deps above are the actual settings that should trigger regeneration.

  // ─── Copy ────────────────────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    const text = result?.password || result?.passphrase;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const handleCopyHistory = useCallback(async (value, idx) => {
    await navigator.clipboard.writeText(value);
    setCopiedHistoryIdx(idx);
    setTimeout(() => setCopiedHistoryIdx(null), 2000);
  }, []);

  // ─── Breach Check ────────────────────────────────────────────────────────

  const handleBreachCheck = useCallback(async () => {
    const text = result?.password || result?.passphrase;
    if (!text) return;
    setBreachLoading(true);
    setBreachError(null);
    setBreachResult(null);
    try {
      const res = await checkBreach(text);
      setBreachResult(res);
    } catch {
      setBreachError('Could not reach breach database. Try again later.');
    } finally {
      setBreachLoading(false);
    }
  }, [result]);

  // ─── Derived values ──────────────────────────────────────────────────────

  const output = result?.password || result?.passphrase || '';
  const strength = result?.strength || calculateStrength('');
  const strengthCfg = STRENGTH_CONFIG[strength.score] || STRENGTH_CONFIG[0];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">

      {/* ── Mode Toggle ─────────────────────────────────────────────────── */}
      <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {['password', 'passphrase'].map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`flex-1 min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all duration-200 ${mode === m ? 'text-white shadow-sm' : 'text-surface-400 hover:text-surface-300'}`}
            style={mode === m ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : {}}>
            {m}
          </button>
        ))}
      </div>

      {/* ── Password Options ────────────────────────────────────────────── */}
      {mode === 'password' ? (
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-sm font-semibold text-surface-300">Length</label>
              <span className="text-sm font-mono font-bold text-primary-500">{length}</span>
            </div>
            <input type="range" min={8} max={128} value={length} onChange={(e) => setLength(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none accent-primary-500"
              style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Toggle label="Uppercase (A-Z)" checked={uppercase} onChange={setUppercase} />
            <Toggle label="Lowercase (a-z)" checked={lowercase} onChange={setLowercase} />
            <Toggle label="Numbers (0-9)" checked={numbers} onChange={setNumbers} />
            <Toggle label="Special (!@#$)" checked={special} onChange={setSpecial} />
          </div>
        </div>
      ) : (
        /* ── Passphrase Options ──────────────────────────────────────────── */
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-sm font-semibold text-surface-300">Words</label>
              <span className="text-sm font-mono font-bold text-primary-500">{wordCount}</span>
            </div>
            <input type="range" min={3} max={8} value={wordCount} onChange={(e) => setWordCount(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none accent-primary-500"
              style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-surface-300 mb-2">Separator</label>
            <div className="flex gap-2 flex-wrap">
              {SEPARATOR_OPTIONS.map((opt) => (
                <button key={opt.value} type="button" onClick={() => setSeparator(opt.value)}
                  className={`min-w-[44px] min-h-[44px] px-3 py-2 rounded-xl text-sm font-mono transition-all duration-200 ${separator === opt.value ? 'text-white ring-2 ring-primary-500/50' : 'text-surface-400 hover:text-surface-300'}`}
                  style={{ background: separator === opt.value ? 'rgba(255,99,99,0.15)' : 'rgba(255,255,255,0.06)' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Toggle label="Capitalize words" checked={capitalize} onChange={setCapitalize} />
            <Toggle label="Append number" checked={includeNumber} onChange={setIncludeNumber} />
          </div>
        </div>
      )}

      {/* ── Result Display ──────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {output && (
          <motion.div key={output} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }} className="space-y-4">

            {/* Password display */}
            <GlassCard className="p-4">
              <div className="flex items-center gap-2">
                <code className="flex-1 text-lg font-mono font-bold text-surface-100 break-all select-all leading-relaxed tracking-wide">
                  {showPassword ? output : '•'.repeat(Math.min(output.length, 40))}
                </code>
                <div className="flex shrink-0 gap-1">
                  {/* Show/Hide */}
                  <motion.button type="button" onClick={() => setShowPassword((v) => !v)} whileTap={{ scale: 0.9 }}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/5 text-surface-400 hover:text-surface-200 hover:bg-white/10 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? '👁️' : '🔒'}
                  </motion.button>
                  {/* Regenerate */}
                  <motion.button type="button" onClick={generate} whileTap={{ scale: 0.9 }}
                    whileHover={{ rotate: 180 }} transition={{ duration: 0.3 }}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/5 text-surface-400 hover:text-surface-200 hover:bg-white/10 transition-colors"
                    aria-label="Regenerate">
                    🔄
                  </motion.button>
                  {/* Copy */}
                  <motion.button type="button" onClick={handleCopy} whileTap={{ scale: 0.9 }}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 transition-colors"
                    aria-label="Copy to clipboard">
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                          className="text-emerald-400">✓</motion.span>
                      ) : (
                        <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>📋</motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>
              </div>
            </GlassCard>

            {/* ── Strength Meter ───────────────────────────────────────────── */}
            <GlassCard className="p-4 space-y-3">
              {/* Bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div
                    className={`h-full rounded-full ${strengthCfg.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: strengthCfg.width }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
                <span className={`text-xs font-bold whitespace-nowrap ${strengthCfg.text}`}>
                  {strength.label}
                </span>
              </div>

              {/* Crack time */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-surface-500">Crack time:</span>
                <span className={`text-sm font-bold ${strengthCfg.text}`}>{strength.crackTime}</span>
              </div>

              {/* Entropy + Composition */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-surface-500">
                <span>Entropy: <span className="font-mono text-surface-300">{strength.entropy} bits</span></span>
                {strength.composition && (
                  <>
                    {strength.composition.lowercase > 0 && <span>{strength.composition.lowercase} lowercase</span>}
                    {strength.composition.uppercase > 0 && <span>{strength.composition.uppercase} uppercase</span>}
                    {strength.composition.numbers > 0 && <span>{strength.composition.numbers} numbers</span>}
                    {strength.composition.symbols > 0 && <span>{strength.composition.symbols} symbols</span>}
                  </>
                )}
              </div>

              {/* Passphrase-specific entropy */}
              {mode === 'passphrase' && result?.estimatedEntropy && (
                <div className="text-xs text-surface-500">
                  Passphrase entropy: <span className="font-mono text-surface-300">{result.estimatedEntropy} bits</span>
                  <span className="ml-1">({result.wordCountUsed} words)</span>
                </div>
              )}
            </GlassCard>

            {/* ── Breach Check ─────────────────────────────────────────────── */}
            <GlassCard className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <motion.button type="button" onClick={handleBreachCheck} disabled={breachLoading}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold text-surface-200 transition-all duration-200 disabled:opacity-50"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {breachLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="inline-block">⏳</motion.span>
                      Checking…
                    </span>
                  ) : '🔍 Check if breached'}
                </motion.button>
              </div>

              <AnimatePresence>
                {breachResult && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    {breachResult.breached ? (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <span className="text-red-400 text-lg">⚠️</span>
                        <div>
                          <p className="text-sm font-semibold text-red-400">
                            Found in {breachResult.count.toLocaleString()} data breach{breachResult.count !== 1 ? 'es' : ''}
                          </p>
                          <p className="text-xs text-red-400/70 mt-0.5">Do not use this password. Generate a new one.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-emerald-400 text-lg">✅</span>
                        <div>
                          <p className="text-sm font-semibold text-emerald-400">Not found in any known breaches</p>
                          <p className="text-xs text-emerald-400/70 mt-0.5">This password has not appeared in known data breaches.</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
                {breachError && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-400">{breachError}</motion.p>
                )}
              </AnimatePresence>

              <p className="text-[11px] text-surface-600 leading-relaxed">
                🔐 Only the first 5 chars of the SHA-1 hash are sent.
              </p>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Password History ────────────────────────────────────────────── */}
      {history.length > 0 && (
        <GlassCard className="overflow-hidden">
          <button type="button" onClick={() => setHistoryOpen((v) => !v)}
            className="w-full flex items-center justify-between p-4 text-sm font-semibold text-surface-300 hover:text-surface-200 transition-colors min-h-[44px]">
            <span>🕐 History ({history.length})</span>
            <motion.span animate={{ rotate: historyOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>▾</motion.span>
          </button>

          <AnimatePresence>
            {historyOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="px-4 pb-3 space-y-2">
                  {history.map((entry, idx) => (
                    <div key={entry.timestamp + idx}
                      className="flex items-center gap-2 p-2.5 rounded-xl text-xs"
                      style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <span className="text-surface-600 text-[10px] uppercase font-bold shrink-0 w-8">
                        {entry.mode === 'password' ? 'PW' : 'PP'}
                      </span>
                      <code className="flex-1 font-mono text-surface-400 break-all truncate">{entry.value}</code>
                      <motion.button type="button" onClick={() => handleCopyHistory(entry.value, idx)}
                        whileTap={{ scale: 0.9 }}
                        className="shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-white/5 text-surface-500 hover:text-surface-300 hover:bg-white/10 transition-colors"
                        aria-label="Copy">
                        {copiedHistoryIdx === idx ? (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-emerald-400 text-xs">✓</motion.span>
                        ) : (
                          <span className="text-xs">📋</span>
                        )}
                      </motion.button>
                    </div>
                  ))}
                  <button type="button" onClick={() => { setHistory([]); setHistoryOpen(false); }}
                    className="w-full min-h-[36px] px-3 py-1.5 rounded-xl text-xs text-surface-500 hover:text-red-400 hover:bg-red-500/5 transition-colors">
                    Clear history
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      )}
    </motion.div>
  );
}
