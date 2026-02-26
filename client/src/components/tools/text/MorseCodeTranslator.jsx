import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

const MORSE_MAP = {
  A:'.-', B:'-...', C:'-.-.', D:'-..', E:'.', F:'..-.', G:'--.', H:'....', I:'..', J:'.---',
  K:'-.-', L:'.-..', M:'--', N:'-.', O:'---', P:'.--.', Q:'--.-', R:'.-.', S:'...', T:'-',
  U:'..-', V:'...-', W:'.--', X:'-..-', Y:'-.--', Z:'--..',
  '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....',
  '6':'-....','7':'--...','8':'---..','9':'----.',
  '.':'.-.-.-',',':'--..--','?':'..--..','!':'-.-.--','/':'-..-.','@':'.--.-.','&':'.-...',
};
const REVERSE_MAP = Object.fromEntries(Object.entries(MORSE_MAP).map(([k,v]) => [v,k]));

function textToMorse(text) {
  return text.toUpperCase().split('').map(c => {
    if (c === ' ') return '/';
    return MORSE_MAP[c] || '?';
  }).join(' ');
}

function morseToText(morse) {
  return morse.trim().split(' / ').map(word =>
    word.split(' ').map(code => REVERSE_MAP[code] || '?').join('')
  ).join(' ');
}

export default function MorseCodeTranslator() {
  const [input, setInput] = useState('');
  const [direction, setDirection] = useState('text-to-morse');
  const [wpm, setWpm] = useState(15);
  const [copied, setCopied] = useState(false);
  const audioCtxRef = useRef(null);

  const output = direction === 'text-to-morse' ? textToMorse(input) : morseToText(input);

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const playMorse = async () => {
    const morseStr = direction === 'text-to-morse' ? output : input;
    if (!morseStr) return;

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;

    const dotDuration = 1.2 / wpm;
    let time = ctx.currentTime + 0.1;

    const beep = (duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 600;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.setValueAtTime(0, time + duration);
      osc.start(time);
      osc.stop(time + duration);
      time += duration + dotDuration;
    };

    for (const ch of morseStr) {
      if (ch === '.') beep(dotDuration);
      else if (ch === '-') beep(dotDuration * 3);
      else if (ch === ' ') time += dotDuration * 2;
      else if (ch === '/') time += dotDuration * 4;
    }
  };

  const REFERENCE = Object.entries(MORSE_MAP).filter(([k]) => /[A-Z0-9]/.test(k));

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex gap-2">
          {['text-to-morse', 'morse-to-text'].map((d) => (
            <button key={d} onClick={() => setDirection(d)}
              className={`px-3 py-1.5 text-sm rounded-xl font-medium transition-colors ${direction === d ? 'text-white' : 'text-surface-400'}`}
              style={direction === d ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
              {d === 'text-to-morse' ? 'Text → Morse' : 'Morse → Text'}
            </button>
          ))}
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none font-mono text-sm"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          placeholder={direction === 'text-to-morse' ? 'Enter text...' : 'Enter morse code (use / for word breaks)...'}
        />

        <div className="rounded-xl p-4 font-mono text-sm text-surface-200 min-h-[80px] break-all" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {output || <span className="text-surface-500">Output appears here...</span>}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <label className="text-sm text-surface-400 whitespace-nowrap">Speed: {wpm} WPM</label>
            <input type="range" min={5} max={30} value={wpm} onChange={(e) => setWpm(Number(e.target.value))} className="flex-1 accent-primary-500" />
          </div>
          <button onClick={playMorse} className="px-4 py-2 text-white rounded-xl font-medium transition-colors text-sm" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
            ▶ Play Audio
          </button>
          <button onClick={copy} className="px-4 py-2 text-surface-300 rounded-xl font-medium transition-colors text-sm hover:bg-white/5" style={{ background: 'rgba(255,255,255,0.06)' }}>
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl p-6" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="text-sm font-semibold text-surface-300 mb-3">Morse Code Reference</h3>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-2">
          {REFERENCE.map(([char, code]) => (
            <div key={char} className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="font-bold text-surface-100 text-sm">{char}</div>
              <div className="font-mono text-xs text-primary-400">{code}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
