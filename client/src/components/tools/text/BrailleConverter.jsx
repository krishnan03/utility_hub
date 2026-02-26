import { useState } from 'react';
import { motion } from 'framer-motion';

// Grade 1 Braille Unicode (U+2800-U+28FF)
const BRAILLE_MAP = {
  'a':'\u2801','b':'\u2803','c':'\u2809','d':'\u2819','e':'\u2811',
  'f':'\u280B','g':'\u281B','h':'\u2813','i':'\u280A','j':'\u281A',
  'k':'\u2805','l':'\u2807','m':'\u280D','n':'\u281D','o':'\u2815',
  'p':'\u280F','q':'\u281F','r':'\u2817','s':'\u280E','t':'\u281E',
  'u':'\u2825','v':'\u2827','w':'\u283A','x':'\u282D','y':'\u283D',
  'z':'\u2835',' ':'\u2800',
  '1':'\u2801','2':'\u2803','3':'\u2809','4':'\u2819','5':'\u2811',
  '6':'\u280B','7':'\u281B','8':'\u2813','9':'\u280A','0':'\u281A',
  '.':'\u2832',',':'\u2802','?':'\u2826','!':'\u2816',':':'\u2812',
  ';':'\u2830','-':'\u2824','\'':'\u2804','"':'\u2836',
};
const REVERSE_BRAILLE = Object.fromEntries(Object.entries(BRAILLE_MAP).map(([k,v]) => [v,k]));

function textToBraille(text) {
  return text.toLowerCase().split('').map(c => BRAILLE_MAP[c] || c).join('');
}

function brailleToText(braille) {
  return braille.split('').map(c => REVERSE_BRAILLE[c] || c).join('');
}

export default function BrailleConverter() {
  const [input, setInput] = useState('');
  const [direction, setDirection] = useState('text-to-braille');
  const [copied, setCopied] = useState(false);

  const output = direction === 'text-to-braille' ? textToBraille(input) : brailleToText(input);

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const SAMPLE_CHARS = 'abcdefghijklmnopqrstuvwxyz'.split('');

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex gap-2">
          {['text-to-braille', 'braille-to-text'].map((d) => (
            <button key={d} onClick={() => setDirection(d)}
              className={`px-3 py-1.5 text-sm rounded-xl font-medium transition-colors ${direction === d ? 'text-white' : 'text-surface-400'}`}
              style={direction === d ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
              {d === 'text-to-braille' ? 'Text → Braille' : 'Braille → Text'}
            </button>
          ))}
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none text-sm"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          placeholder={direction === 'text-to-braille' ? 'Enter text to convert...' : 'Paste Braille Unicode here...'}
        />

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">Output</label>
          <div className="w-full px-3 py-2 rounded-xl text-surface-100 min-h-[80px] text-3xl leading-loose tracking-widest break-all" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {output || <span className="text-surface-500 text-sm">Braille output appears here...</span>}
          </div>
        </div>

        <button onClick={copy} className="px-4 py-2 text-white rounded-xl font-medium transition-colors text-sm" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
          {copied ? '✓ Copied!' : 'Copy Output'}
        </button>
      </div>

      <div className="rounded-2xl p-6" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="text-sm font-semibold text-surface-300 mb-3">Grade 1 Braille Reference (A–Z)</h3>
        <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-13 gap-2">
          {SAMPLE_CHARS.map((c) => (
            <div key={c} className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="font-bold text-surface-100 text-sm uppercase">{c}</div>
              <div className="text-2xl">{BRAILLE_MAP[c]}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
