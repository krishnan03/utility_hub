import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LS_KEY = 'flashcard-sets';

const loadDecks = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveDecks = (decks) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(decks)); } catch {}
};

const fisherYatesShuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const confidenceColors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
const confidenceLabels = ['', 'Again', 'Hard', 'Okay', 'Good', 'Easy'];

const sortByConfidence = (cards) => {
  return [...cards].sort((a, b) => (a.confidence || 0) - (b.confidence || 0));
};

const glassCard = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };
const gradientBtn = { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' };
const ghostBtn = { background: 'rgba(255,255,255,0.06)' };
const primaryAccentBg = { background: 'rgba(255,99,99,0.08)', border: '1px solid rgba(255,99,99,0.2)' };
const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' };

export default function Flashcards() {
  const [decks, setDecks] = useState(loadDecks);
  const [activeDeckId, setActiveDeckId] = useState(null);
  const [newDeckName, setNewDeckName] = useState('');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [mode, setMode] = useState('decks'); // decks | create | study | summary
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState({});
  const [studyCards, setStudyCards] = useState([]);
  const fileRef = useRef();

  const activeDeck = decks.find(d => d.id === activeDeckId) || null;

  // Persist to localStorage on every deck change
  useEffect(() => { saveDecks(decks); }, [decks]);

  const updateDeck = useCallback((deckId, updater) => {
    setDecks(prev => prev.map(d => d.id === deckId ? updater(d) : d));
  }, []);

  // --- Deck management ---
  const createDeck = () => {
    const name = newDeckName.trim();
    if (!name) return;
    const deck = { id: Date.now(), name, cards: [] };
    setDecks(prev => [...prev, deck]);
    setNewDeckName('');
    setActiveDeckId(deck.id);
    setMode('create');
  };

  const deleteDeck = (id) => {
    setDecks(prev => prev.filter(d => d.id !== id));
    if (activeDeckId === id) { setActiveDeckId(null); setMode('decks'); }
  };

  const selectDeck = (id) => {
    setActiveDeckId(id);
    setMode('create');
  };

  // --- Card management ---
  const addCard = () => {
    if (!front.trim() || !back.trim() || !activeDeckId) return;
    const card = { id: Date.now(), front: front.trim(), back: back.trim(), confidence: 0 };
    updateDeck(activeDeckId, d => ({ ...d, cards: [...d.cards, card] }));
    setFront(''); setBack('');
  };

  const removeCard = (cardId) => {
    updateDeck(activeDeckId, d => ({ ...d, cards: d.cards.filter(c => c.id !== cardId) }));
  };

  const importCSV = (e) => {
    const file = e.target.files[0];
    if (!file || !activeDeckId) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split('\n').filter(Boolean);
      const newCards = lines.map(line => {
        const [f, ...rest] = line.split(',');
        return { id: Date.now() + Math.random(), front: f?.trim() || '', back: rest.join(',').trim(), confidence: 0 };
      }).filter(c => c.front && c.back);
      updateDeck(activeDeckId, d => ({ ...d, cards: [...d.cards, ...newCards] }));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const exportCSV = () => {
    if (!activeDeck) return;
    const csv = activeDeck.cards.map(c => `"${c.front.replace(/"/g, '""')}","${c.back.replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${activeDeck.name.replace(/\s+/g, '_')}_flashcards.csv`;
    a.click();
  };

  // --- Study ---
  const startStudy = (shuffle = false) => {
    if (!activeDeck || activeDeck.cards.length === 0) return;
    let ordered = sortByConfidence(activeDeck.cards);
    if (shuffle) ordered = fisherYatesShuffle(ordered);
    setStudyCards(ordered);
    setMode('study');
    setIndex(0);
    setFlipped(false);
    setKnown({});
  };

  const next = () => { setIndex(i => Math.min(i + 1, studyCards.length - 1)); setFlipped(false); };
  const prev = () => { setIndex(i => Math.max(i - 1, 0)); setFlipped(false); };

  const markCard = (val) => {
    setKnown(k => ({ ...k, [studyCards[index].id]: val }));
    if (index < studyCards.length - 1) {
      next();
    } else {
      setMode('summary');
    }
  };

  const rateConfidence = (cardId, rating) => {
    updateDeck(activeDeckId, d => ({
      ...d,
      cards: d.cards.map(c => c.id === cardId ? { ...c, confidence: rating } : c)
    }));
    setStudyCards(prev => prev.map(c => c.id === cardId ? { ...c, confidence: rating } : c));
  };

  const knownCount = Object.values(known).filter(Boolean).length;
  const unknownCount = Object.values(known).filter(v => v === false).length;
  const totalReviewed = knownCount + unknownCount;
  const accuracy = totalReviewed > 0 ? Math.round((knownCount / totalReviewed) * 100) : 0;

  // --- Summary screen ---
  if (mode === 'summary') {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
        <div className="rounded-2xl p-8 text-center space-y-6" style={glassCard}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
            <div className="text-5xl mb-2">🎉</div>
            <h2 className="text-2xl font-bold text-surface-100">Study Complete!</h2>
            <p className="text-surface-400 mt-1">{activeDeck?.name}</p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Cards', value: studyCards.length, color: 'text-primary-400' },
              { label: 'Known', value: knownCount, color: 'text-green-400' },
              { label: 'Unknown', value: unknownCount, color: 'text-red-400' },
              { label: 'Accuracy', value: `${accuracy}%`, color: accuracy >= 70 ? 'text-green-400' : 'text-red-400' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4" style={primaryAccentBg}>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-surface-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Confidence distribution */}
          <div className="rounded-xl p-4 space-y-2" style={ghostBtn}>
            <h4 className="text-sm font-medium text-surface-300 mb-3">Confidence Distribution</h4>
            {[1, 2, 3, 4, 5].map(level => {
              const count = studyCards.filter(c => c.confidence === level).length;
              const pct = studyCards.length > 0 ? (count / studyCards.length) * 100 : 0;
              return (
                <div key={level} className="flex items-center gap-3">
                  <span className="text-xs w-12 text-surface-400">{confidenceLabels[level]}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, delay: level * 0.1 }}
                      className="h-full rounded-full" style={{ background: confidenceColors[level] }} />
                  </div>
                  <span className="text-xs text-surface-500 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center gap-3 flex-wrap">
            <button onClick={() => startStudy(false)} className="px-5 py-2.5 text-white rounded-xl font-medium transition-all hover:scale-105" style={gradientBtn}>
              Study Again
            </button>
            <button onClick={() => startStudy(true)} className="px-5 py-2.5 rounded-xl font-medium transition-all hover:bg-white/5 text-surface-300" style={ghostBtn}>
              🔀 Shuffle & Study
            </button>
            <button onClick={() => setMode('create')} className="px-5 py-2.5 rounded-xl font-medium transition-all hover:bg-white/5 text-surface-300" style={ghostBtn}>
              ← Back to Deck
            </button>
          </div>
        </div>
      </motion.div>
    );
  }


  // --- Study mode ---
  if (mode === 'study' && studyCards.length > 0) {
    const card = studyCards[index];
    const progress = ((index + 1) / studyCards.length) * 100;

    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-surface-400">{index + 1} of {studyCards.length}</span>
          <button onClick={() => setMode('create')} className="text-sm text-primary-400 hover:text-primary-300 transition-colors">← Back to Edit</button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div className="h-full rounded-full" style={gradientBtn}
            initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>

        <div className="flex justify-center gap-4 text-sm">
          <span className="text-green-400">✓ Known: {knownCount}</span>
          <span className="text-red-400">✗ Unknown: {unknownCount}</span>
        </div>

        {/* Confidence indicator */}
        {card.confidence > 0 && (
          <div className="flex justify-center">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={primaryAccentBg}>
              <span style={{ color: confidenceColors[card.confidence] }}>●</span>
              <span className="text-surface-300">Confidence: {confidenceLabels[card.confidence]}</span>
            </div>
          </div>
        )}

        {/* Framer Motion 3D flip card */}
        <div className="cursor-pointer" style={{ perspective: '1200px' }} onClick={() => setFlipped(f => !f)}>
          <AnimatePresence mode="wait" initial={false}>
            {!flipped ? (
              <motion.div
                key="front"
                initial={{ rotateY: 180, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: -90, opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                style={{ ...glassCard, transformStyle: 'preserve-3d' }}
                className="rounded-2xl p-8 flex flex-col items-center justify-center min-h-[220px]"
              >
                <div className="text-xs uppercase tracking-widest text-surface-500 mb-3">Front</div>
                <div className="text-xl font-semibold text-surface-100 text-center">{card.front}</div>
                <div className="text-xs text-surface-500 mt-4">Click to flip</div>
              </motion.div>
            ) : (
              <motion.div
                key="back"
                initial={{ rotateY: -180, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: 90, opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                style={{ ...primaryAccentBg, transformStyle: 'preserve-3d' }}
                className="rounded-2xl p-8 flex flex-col items-center justify-center min-h-[220px]"
              >
                <div className="text-xs uppercase tracking-widest text-primary-400 mb-3">Back</div>
                <div className="text-xl font-semibold text-surface-100 text-center">{card.back}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Confidence rating */}
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map(r => (
            <button key={r} onClick={(e) => { e.stopPropagation(); rateConfidence(card.id, r); }}
              className={`w-9 h-9 rounded-lg text-xs font-bold transition-all hover:scale-110 ${card.confidence === r ? 'ring-2 ring-white/30 scale-110' : ''}`}
              style={{ background: confidenceColors[r], color: '#fff' }}
              title={confidenceLabels[r]}>
              {r}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-surface-500">Rate your confidence (1 = Again, 5 = Easy)</p>

        <div className="flex justify-center gap-3 flex-wrap">
          <button onClick={prev} disabled={index === 0}
            className="px-4 py-2 rounded-xl font-medium transition-all hover:bg-white/5 text-surface-300 disabled:opacity-40"
            style={ghostBtn}>← Prev</button>
          <button onClick={() => markCard(false)}
            className="px-4 py-2 rounded-xl font-medium transition-colors text-white"
            style={{ background: '#ef4444' }}>✗ Unknown</button>
          <button onClick={() => markCard(true)}
            className="px-4 py-2 rounded-xl font-medium transition-colors text-white"
            style={{ background: '#22c55e' }}>✓ Known</button>
          <button onClick={() => { if (index < studyCards.length - 1) next(); else setMode('summary'); }} disabled={index === studyCards.length - 1 && Object.keys(known).length < studyCards.length}
            className="px-4 py-2 rounded-xl font-medium transition-all hover:bg-white/5 text-surface-300 disabled:opacity-40"
            style={ghostBtn}>Next →</button>
        </div>
      </motion.div>
    );
  }


  // --- Deck list view ---
  if (mode === 'decks' || !activeDeckId) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
        {/* Create new deck */}
        <div className="rounded-2xl p-6 space-y-4" style={glassCard}>
          <h3 className="font-semibold text-surface-100">Create New Deck</h3>
          <div className="flex gap-3">
            <input value={newDeckName} onChange={e => setNewDeckName(e.target.value)}
              placeholder="Deck name (e.g. Biology Chapter 5)"
              onKeyDown={e => e.key === 'Enter' && createDeck()}
              className="flex-1 px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={inputStyle} />
            <button onClick={createDeck} disabled={!newDeckName.trim()}
              className="px-5 py-2 text-white rounded-xl font-medium transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
              style={gradientBtn}>Create</button>
          </div>
        </div>

        {/* Deck list */}
        {decks.length > 0 && (
          <div className="rounded-2xl p-6 space-y-3" style={glassCard}>
            <h3 className="font-semibold text-surface-100 mb-3">Your Decks ({decks.length})</h3>
            <AnimatePresence>
              {decks.map((deck, i) => (
                <motion.div key={deck.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                  className="flex items-center gap-3 p-4 rounded-xl cursor-pointer group transition-all hover:scale-[1.01]"
                  style={ghostBtn}
                  onClick={() => selectDeck(deck.id)}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={primaryAccentBg}>📚</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-surface-100 truncate">{deck.name}</div>
                    <div className="text-xs text-surface-500">{deck.cards.length} card{deck.cards.length !== 1 ? 's' : ''}</div>
                  </div>
                  {deck.cards.length > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); setActiveDeckId(deck.id); startStudyFromDeck(deck); }}
                      className="px-3 py-1.5 text-xs text-white rounded-lg font-medium transition-all opacity-0 group-hover:opacity-100 hover:scale-105"
                      style={gradientBtn}>Study</button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); deleteDeck(deck.id); }}
                    className="text-red-400 hover:text-red-300 text-sm transition-colors opacity-0 group-hover:opacity-100 p-1">✕</button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {decks.length === 0 && (
          <div className="text-center py-12 text-surface-500">
            <div className="text-4xl mb-3">📝</div>
            <p>No decks yet. Create one to get started!</p>
          </div>
        )}
      </motion.div>
    );
  }

  // Helper to start study from deck list
  function startStudyFromDeck(deck) {
    const ordered = sortByConfidence(deck.cards);
    setStudyCards(ordered);
    setMode('study');
    setIndex(0);
    setFlipped(false);
    setKnown({});
  }

  // --- Create / Edit mode ---
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Deck header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => { setMode('decks'); setActiveDeckId(null); }}
            className="text-sm text-primary-400 hover:text-primary-300 transition-colors">← All Decks</button>
          <span className="text-surface-500">|</span>
          <h3 className="font-semibold text-surface-100">{activeDeck?.name}</h3>
          <span className="text-xs text-surface-500">({activeDeck?.cards.length || 0} cards)</span>
        </div>
      </div>

      {/* Add card form */}
      <div className="rounded-2xl p-6 space-y-4" style={glassCard}>
        <h3 className="font-semibold text-surface-100">Add Card</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-surface-400 mb-1">Front</label>
            <input value={front} onChange={e => setFront(e.target.value)} placeholder="Question or term"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={inputStyle} />
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1">Back</label>
            <input value={back} onChange={e => setBack(e.target.value)} placeholder="Answer or definition"
              onKeyDown={e => e.key === 'Enter' && addCard()}
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={inputStyle} />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={addCard} disabled={!front.trim() || !back.trim()}
            className="px-4 py-2 text-white rounded-xl font-medium transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
            style={gradientBtn}>Add Card</button>
          <button onClick={() => fileRef.current.click()}
            className="px-4 py-2 rounded-xl font-medium transition-all hover:bg-white/5 text-surface-300"
            style={ghostBtn}>Import CSV</button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={importCSV} />
          {activeDeck && activeDeck.cards.length > 0 && (
            <>
              <button onClick={exportCSV}
                className="px-4 py-2 rounded-xl font-medium transition-all hover:bg-white/5 text-surface-300"
                style={ghostBtn}>Export CSV</button>
              <button onClick={() => startStudy(false)}
                className="px-4 py-2 rounded-xl font-medium transition-colors text-white"
                style={{ background: '#22c55e' }}>▶ Study ({activeDeck.cards.length})</button>
              <button onClick={() => startStudy(true)}
                className="px-4 py-2 rounded-xl font-medium transition-all hover:bg-white/5 text-surface-300"
                style={ghostBtn}>🔀 Shuffle</button>
            </>
          )}
        </div>
      </div>

      {/* Card list */}
      {activeDeck && activeDeck.cards.length > 0 && (
        <div className="rounded-2xl p-6 space-y-2" style={glassCard}>
          <h3 className="font-semibold text-surface-100 mb-3">Cards ({activeDeck.cards.length})</h3>
          <AnimatePresence>
            {activeDeck.cards.map((c, i) => (
              <motion.div key={c.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.15, delay: i * 0.02 }}
                className="flex items-center gap-3 p-3 rounded-xl group transition-colors hover:bg-white/[0.03]">
                <span className="text-xs text-surface-500 w-5 font-mono">{i + 1}</span>
                {c.confidence > 0 && (
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: confidenceColors[c.confidence] }} title={`Confidence: ${confidenceLabels[c.confidence]}`} />
                )}
                <span className="flex-1 text-sm text-surface-100 truncate">{c.front}</span>
                <span className="text-surface-500 text-xs">→</span>
                <span className="flex-1 text-sm text-surface-400 truncate">{c.back}</span>
                <button onClick={() => removeCard(c.id)}
                  className="text-red-400 hover:text-red-300 text-sm transition-colors opacity-0 group-hover:opacity-100 p-1">✕</button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
