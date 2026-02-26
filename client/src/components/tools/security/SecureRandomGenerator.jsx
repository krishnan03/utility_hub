import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Crypto helpers ──────────────────────────────────────────────────────────

function secureRandomInt(max) {
  if (max <= 0) return 0;
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}

function secureRandomInRange(min, max) {
  return min + secureRandomInt(max - min + 1);
}

function fisherYatesShuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function GlassCard({ children, className = '', style = {}, ...props }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: 'rgba(44,44,46,0.8)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── Tab definitions ─────────────────────────────────────────────────────────

const TABS = [
  { id: 'numbers', label: '🔢 Numbers', short: 'Numbers' },
  { id: 'dice', label: '🎲 Dice', short: 'Dice' },
  { id: 'coins', label: '🪙 Coins', short: 'Coins' },
  { id: 'cards', label: '🃏 Cards', short: 'Cards' },
  { id: 'lottery', label: '🎰 Lottery', short: 'Lottery' },
  { id: 'shuffle', label: '🔀 Shuffle', short: 'Shuffle' },
];

const DICE_SIDES = [4, 6, 8, 10, 12, 20];

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT_COLORS = { '♠': 'text-surface-200', '♣': 'text-surface-200', '♥': 'text-red-400', '♦': 'text-red-400' };

function buildDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, label: `${rank}${suit}` });
    }
  }
  return deck;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SecureRandomGenerator() {
  const [tab, setTab] = useState('numbers');

  // Numbers state
  const [numCount, setNumCount] = useState(5);
  const [numMin, setNumMin] = useState(1);
  const [numMax, setNumMax] = useState(100);
  const [numResults, setNumResults] = useState(null);

  // Dice state
  const [diceCount, setDiceCount] = useState(2);
  const [diceSides, setDiceSides] = useState(6);
  const [diceResults, setDiceResults] = useState(null);

  // Coins state
  const [coinCount, setCoinCount] = useState(5);
  const [coinResults, setCoinResults] = useState(null);

  // Cards state
  const [cardCount, setCardCount] = useState(5);
  const [cardResults, setCardResults] = useState(null);

  // Lottery state
  const [lotteryPick, setLotteryPick] = useState(6);
  const [lotteryMax, setLotteryMax] = useState(49);
  const [lotteryResults, setLotteryResults] = useState(null);

  // Shuffle state
  const [shuffleInput, setShuffleInput] = useState('');
  const [shuffleResults, setShuffleResults] = useState(null);

  // Copied state
  const [copied, setCopied] = useState(false);

  // ─── Generators ──────────────────────────────────────────────────────────

  const generateNumbers = useCallback(() => {
    const min = Math.min(numMin, numMax);
    const max = Math.max(numMin, numMax);
    const results = Array.from({ length: numCount }, () => secureRandomInRange(min, max));
    setNumResults(results);
  }, [numCount, numMin, numMax]);

  const rollDice = useCallback(() => {
    const results = Array.from({ length: diceCount }, () => secureRandomInt(diceSides) + 1);
    setDiceResults(results);
  }, [diceCount, diceSides]);

  const flipCoins = useCallback(() => {
    const results = Array.from({ length: coinCount }, () => secureRandomInt(2) === 0 ? 'H' : 'T');
    setCoinResults(results);
  }, [coinCount]);

  const drawCards = useCallback(() => {
    const deck = buildDeck();
    const shuffled = fisherYatesShuffle(deck);
    setCardResults(shuffled.slice(0, Math.min(cardCount, 52)));
  }, [cardCount]);

  const pickLottery = useCallback(() => {
    const max = Math.max(lotteryPick, 1);
    const pool = Math.max(max, lotteryMax);
    const picks = new Set();
    while (picks.size < Math.min(max, pool)) {
      picks.add(secureRandomInRange(1, pool));
    }
    setLotteryResults([...picks].sort((a, b) => a - b));
  }, [lotteryPick, lotteryMax]);

  const shuffleList = useCallback(() => {
    const items = shuffleInput.split('\n').map((s) => s.trim()).filter(Boolean);
    if (items.length === 0) return;
    setShuffleResults(fisherYatesShuffle(items));
  }, [shuffleInput]);

  // ─── Copy helper ─────────────────────────────────────────────────────────

  const handleCopy = useCallback(async (text) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // ─── Dice visuals ────────────────────────────────────────────────────────

  const diceTotal = useMemo(() => diceResults?.reduce((a, b) => a + b, 0) || 0, [diceResults]);
  const coinHeads = useMemo(() => coinResults?.filter((c) => c === 'H').length || 0, [coinResults]);
  const coinTails = useMemo(() => coinResults?.filter((c) => c === 'T').length || 0, [coinResults]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 p-1 rounded-2xl overflow-x-auto" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 min-h-[44px] min-w-[60px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
              tab === t.id ? 'text-white shadow-sm' : 'text-surface-400 hover:text-surface-300'
            }`}
            style={tab === t.id ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : {}}
          >
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* ── Numbers Tab ────────────────────────────────────────────────── */}
      {tab === 'numbers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-400 mb-1.5">Count</label>
              <input type="number" min={1} max={1000} value={numCount}
                onChange={(e) => setNumCount(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-mono text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 min-h-[44px]"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-400 mb-1.5">Min</label>
              <input type="number" value={numMin}
                onChange={(e) => setNumMin(Number(e.target.value) || 0)}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-mono text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 min-h-[44px]"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-400 mb-1.5">Max</label>
              <input type="number" value={numMax}
                onChange={(e) => setNumMax(Number(e.target.value) || 0)}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-mono text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 min-h-[44px]"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
          </div>
          <motion.button type="button" onClick={generateNumbers} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="w-full min-h-[48px] px-6 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
            🔢 Generate Random Numbers
          </motion.button>
          <AnimatePresence mode="wait">
            {numResults && (
              <motion.div key={numResults.join(',')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <GlassCard className="p-4">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {numResults.map((n, i) => (
                      <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.02, type: 'spring' }}
                        className="inline-flex items-center justify-center min-w-[40px] px-2.5 py-1.5 rounded-lg text-sm font-mono font-bold text-surface-100"
                        style={{ background: 'rgba(255,255,255,0.08)' }}>
                        {n}
                      </motion.span>
                    ))}
                  </div>
                  <button type="button" onClick={() => handleCopy(numResults.join(', '))}
                    className="text-xs text-surface-500 hover:text-primary-400 transition-colors min-h-[36px]">
                    {copied ? '✓ Copied' : '📋 Copy all'}
                  </button>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Dice Tab ───────────────────────────────────────────────────── */}
      {tab === 'dice' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-surface-400 mb-1.5">Number of dice (1–10)</label>
            <input type="range" min={1} max={10} value={diceCount}
              onChange={(e) => setDiceCount(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none accent-primary-500"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            />
            <div className="flex justify-between text-xs text-surface-500 mt-1">
              <span>1</span>
              <span className="font-mono font-bold text-primary-500">{diceCount}</span>
              <span>10</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-400 mb-2">Sides</label>
            <div className="flex flex-wrap gap-2">
              {DICE_SIDES.map((s) => (
                <button key={s} type="button" onClick={() => setDiceSides(s)}
                  className={`min-w-[48px] min-h-[44px] px-3 py-2 rounded-xl text-sm font-mono font-bold transition-all ${
                    diceSides === s ? 'text-white ring-2 ring-primary-500/50' : 'text-surface-400 hover:text-surface-300'
                  }`}
                  style={{ background: diceSides === s ? 'rgba(255,99,99,0.15)' : 'rgba(255,255,255,0.06)' }}>
                  D{s}
                </button>
              ))}
            </div>
          </div>
          <motion.button type="button" onClick={rollDice} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="w-full min-h-[48px] px-6 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
            🎲 Roll {diceCount}D{diceSides}
          </motion.button>
          <AnimatePresence mode="wait">
            {diceResults && (
              <motion.div key={diceResults.join(',')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <GlassCard className="p-4 text-center space-y-3">
                  <div className="flex flex-wrap justify-center gap-3">
                    {diceResults.map((val, i) => (
                      <motion.div key={i} initial={{ rotateY: 180, scale: 0 }} animate={{ rotateY: 0, scale: 1 }}
                        transition={{ delay: i * 0.08, type: 'spring', stiffness: 200 }}
                        className="w-14 h-14 flex items-center justify-center rounded-xl text-xl font-mono font-extrabold text-white"
                        style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
                        {val}
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-sm text-surface-400">
                    Total: <span className="font-mono font-bold text-surface-200 text-lg">{diceTotal}</span>
                  </p>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Coins Tab ──────────────────────────────────────────────────── */}
      {tab === 'coins' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-surface-400 mb-1.5">Number of coins (1–100)</label>
            <input type="range" min={1} max={100} value={coinCount}
              onChange={(e) => setCoinCount(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none accent-primary-500"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            />
            <div className="flex justify-between text-xs text-surface-500 mt-1">
              <span>1</span>
              <span className="font-mono font-bold text-primary-500">{coinCount}</span>
              <span>100</span>
            </div>
          </div>
          <motion.button type="button" onClick={flipCoins} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="w-full min-h-[48px] px-6 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
            🪙 Flip {coinCount} Coin{coinCount !== 1 ? 's' : ''}
          </motion.button>
          <AnimatePresence mode="wait">
            {coinResults && (
              <motion.div key={coinResults.join('')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <GlassCard className="p-4 space-y-3">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {coinResults.map((c, i) => (
                      <motion.div key={i}
                        initial={{ rotateX: 180, opacity: 0 }}
                        animate={{ rotateX: 0, opacity: 1 }}
                        transition={{ delay: i * 0.02, type: 'spring', stiffness: 200 }}
                        className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold ${
                          c === 'H'
                            ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                            : 'bg-surface-700/50 text-surface-400 ring-1 ring-surface-600/30'
                        }`}>
                        {c}
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex justify-center gap-6 text-sm">
                    <span className="text-amber-400 font-semibold">Heads: {coinHeads}</span>
                    <span className="text-surface-400 font-semibold">Tails: {coinTails}</span>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Cards Tab ──────────────────────────────────────────────────── */}
      {tab === 'cards' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-surface-400 mb-1.5">Draw count (1–52)</label>
            <input type="range" min={1} max={52} value={cardCount}
              onChange={(e) => setCardCount(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none accent-primary-500"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            />
            <div className="flex justify-between text-xs text-surface-500 mt-1">
              <span>1</span>
              <span className="font-mono font-bold text-primary-500">{cardCount}</span>
              <span>52</span>
            </div>
          </div>
          <motion.button type="button" onClick={drawCards} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="w-full min-h-[48px] px-6 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
            🃏 Draw {cardCount} Card{cardCount !== 1 ? 's' : ''}
          </motion.button>
          <AnimatePresence mode="wait">
            {cardResults && (
              <motion.div key={cardResults.map((c) => c.label).join(',')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <GlassCard className="p-4">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {cardResults.map((card, i) => (
                      <motion.div key={i}
                        initial={{ rotateY: 90, opacity: 0 }}
                        animate={{ rotateY: 0, opacity: 1 }}
                        transition={{ delay: i * 0.04, type: 'spring', stiffness: 200 }}
                        className="w-14 h-20 flex flex-col items-center justify-center rounded-xl bg-white/[0.08] ring-1 ring-white/10"
                      >
                        <span className={`text-lg font-bold ${SUIT_COLORS[card.suit]}`}>{card.rank}</span>
                        <span className={`text-base ${SUIT_COLORS[card.suit]}`}>{card.suit}</span>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Lottery Tab ────────────────────────────────────────────────── */}
      {tab === 'lottery' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-400 mb-1.5">Pick count</label>
              <input type="number" min={1} max={20} value={lotteryPick}
                onChange={(e) => setLotteryPick(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-mono text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 min-h-[44px]"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-400 mb-1.5">From 1 to</label>
              <input type="number" min={2} max={100} value={lotteryMax}
                onChange={(e) => setLotteryMax(Math.max(2, Math.min(100, Number(e.target.value) || 2)))}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-mono text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 min-h-[44px]"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
          </div>
          <motion.button type="button" onClick={pickLottery} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="w-full min-h-[48px] px-6 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
            🎰 Pick {lotteryPick} from 1–{lotteryMax}
          </motion.button>
          <AnimatePresence mode="wait">
            {lotteryResults && (
              <motion.div key={lotteryResults.join(',')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <GlassCard className="p-4 text-center">
                  <div className="flex flex-wrap justify-center gap-3 mb-3">
                    {lotteryResults.map((n, i) => (
                      <motion.div key={i}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: i * 0.1, type: 'spring', stiffness: 200 }}
                        className="w-12 h-12 flex items-center justify-center rounded-full text-base font-mono font-extrabold text-white"
                        style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
                        {n}
                      </motion.div>
                    ))}
                  </div>
                  <button type="button" onClick={() => handleCopy(lotteryResults.join(', '))}
                    className="text-xs text-surface-500 hover:text-primary-400 transition-colors min-h-[36px]">
                    {copied ? '✓ Copied' : '📋 Copy numbers'}
                  </button>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Shuffle Tab ────────────────────────────────────────────────── */}
      {tab === 'shuffle' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-surface-400 mb-1.5">Paste your list (one item per line)</label>
            <textarea
              value={shuffleInput}
              onChange={(e) => setShuffleInput(e.target.value)}
              rows={6}
              placeholder={"Alice\nBob\nCharlie\nDiana\nEve"}
              className="w-full px-3 py-2.5 rounded-xl text-sm font-mono text-surface-100 placeholder-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-y"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>
          <motion.button type="button" onClick={shuffleList} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            disabled={!shuffleInput.trim()}
            className="w-full min-h-[48px] px-6 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
            🔀 Shuffle List
          </motion.button>
          <AnimatePresence mode="wait">
            {shuffleResults && (
              <motion.div key={shuffleResults.join('|')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <GlassCard className="p-4 space-y-2">
                  {shuffleResults.map((item, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <span className="text-xs font-mono font-bold text-surface-600 w-6 text-right">{i + 1}.</span>
                      <span className="text-sm text-surface-200">{item}</span>
                    </motion.div>
                  ))}
                  <button type="button" onClick={() => handleCopy(shuffleResults.join('\n'))}
                    className="text-xs text-surface-500 hover:text-primary-400 transition-colors min-h-[36px] mt-2">
                    {copied ? '✓ Copied' : '📋 Copy shuffled list'}
                  </button>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Privacy notice ─────────────────────────────────────────────── */}
      <p className="text-[11px] text-surface-600 text-center leading-relaxed">
        🔐 Uses <code className="font-mono text-surface-500">crypto.getRandomValues()</code> — cryptographically secure, 100% client-side.
      </p>
    </motion.div>
  );
}
