import { useState } from 'react';
import { motion } from 'framer-motion';

const NATO = {
  A:'Alpha', B:'Bravo', C:'Charlie', D:'Delta', E:'Echo', F:'Foxtrot',
  G:'Golf', H:'Hotel', I:'India', J:'Juliet', K:'Kilo', L:'Lima',
  M:'Mike', N:'November', O:'Oscar', P:'Papa', Q:'Quebec', R:'Romeo',
  S:'Sierra', T:'Tango', U:'Uniform', V:'Victor', W:'Whiskey', X:'X-ray',
  Y:'Yankee', Z:'Zulu',
  '0':'Zero','1':'One','2':'Two','3':'Three','4':'Four',
  '5':'Five','6':'Six','7':'Seven','8':'Eight','9':'Nine',
};

function convertToNATO(text) {
  return text.toUpperCase().split('').map(c => {
    if (c === ' ') return null;
    return NATO[c] || c;
  }).filter(Boolean);
}

export default function NATOAlphabet() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('sentence');
  const [copied, setCopied] = useState(false);

  const words = convertToNATO(input);
  const output = mode === 'sentence' ? words.join(' ') : words.join('\n');

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none text-sm"
          placeholder='e.g. "Hello" → Hotel Echo Lima Lima Oscar'
        />

        <div className="flex items-center gap-3">
          <span className="text-sm text-surface-400">Display as:</span>
          {['sentence', 'list'].map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-sm rounded-xl font-medium transition-colors capitalize ${mode === m ? 'text-white' : ' text-surface-400'}`}>
              {m}
            </button>
          ))}
        </div>

        <div className="rounded-xl p-4 min-h-[80px]">
          {mode === 'list' ? (
            <ul className="space-y-1">
              {words.map((w, i) => (
                <li key={i} className="text-sm text-surface-200">
                  <span className="font-mono text-primary-400 mr-2">{input.toUpperCase().replace(/ /g, '')[i]}</span>
                  {w}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-surface-200">{output || <span className="text-surface-500">Output appears here...</span>}</p>
          )}
        </div>

        <button onClick={copy} className="px-4 py-2 bg-blue-500 hover:text-white rounded-xl font-medium transition-colors text-sm">
          {copied ? '✓ Copied!' : 'Copy Output'}
        </button>
      </div>

      <div className="rounded-2xl p-6" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="text-sm font-semibold text-surface-300 mb-3">NATO Phonetic Alphabet</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {Object.entries(NATO).filter(([k]) => /[A-Z]/.test(k)).map(([letter, word]) => (
            <div key={letter} className="rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="font-bold text-primary-400 w-5">{letter}</span>
              <span className="text-sm text-surface-300">{word}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
