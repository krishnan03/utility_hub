import { useState } from 'react';
import { motion } from 'framer-motion';

// Big font character maps (simplified 5-row ASCII art)
const FONTS = {
  Big: {
    A: [' /\\ ','/ \\\\','/ _ \\','/_/ \\_\\',''],
    B: ['|--\\ ','|--< ','|--/ ','|___\\',''],
    C: [' ___','/ __','| (  ',' \\__',''],
    D: ['|\\  ','| \\ ','| / ','|/__',''],
    E: ['|===','|-- ','|   ','|===',''],
    F: ['|===','|-- ','|   ','|   ',''],
    G: [' ___','/ __ ','| (_ ','\\___/',''],
    H: ['|  |','|--|','|  |','|  |',''],
    I: ['===','| |','| |','===',''],
    J: ['  |','  |','| |',' \\/ ',''],
    K: ['|\\ ','|/ ','|\\ ','|  \\',''],
    L: ['|   ','|   ','|   ','|___',''],
    M: ['|\\/|','|  |','|  |','|  |',''],
    N: ['|\\  |','| \\ |','|  \\|','|   |',''],
    O: [' ___ ','/ _ \\','| | |','\\___/',''],
    P: ['|--\\ ','|--/ ','|    ','|    ',''],
    Q: [' ___ ','/ _ \\','| |_|','\\__\\/',''],
    R: ['|--\\ ','|--/ ','| \\ ','|  \\',''],
    S: [' ___','/ __',' \\_ ','/__/',''],
    T: ['===','| |','| |','| |',''],
    U: ['|  |','|  |','|  |',' \\/ ',''],
    V: ['\\  /','\\  /','\\  /',' \\/ ',''],
    W: ['|  |','|  |','|/\\|','|  |',''],
    X: ['\\  /','\\/ ','/ \\','\\  /',''],
    Y: ['\\  /','\\/ ','| |','| |',''],
    Z: ['===','  /','/ ','===',''],
    ' ': ['   ','   ','   ','   ',''],
    '0': [' 0 ','0 0','0 0',' 0 ',''],
    '1': [' 1 ','11 ',' 1 ','111',''],
    '2': ['22 ','  2','22 ','222',''],
    '3': ['33 ','33 ','  3','33/',''],
    '4': ['4 4','444','  4','  4',''],
    '5': ['555','55 ','  5','55/',''],
    '6': [' 6 ','66 ','666',' 66',''],
    '7': ['777','  7',' 7 ',' 7 ',''],
    '8': ['888','888','888','888',''],
    '9': ['999','999','  9',' 9 ',''],
  },
  Banner: {
    A: ['#####','#   #','#####','#   #',''],
    B: ['#### ','#   #','#### ','#   #','####'],
    C: [' ####','#    ','#    ',' ####',''],
    D: ['#### ','#   #','#   #','#### ',''],
    E: ['#####','#    ','###  ','#####',''],
    F: ['#####','#    ','###  ','#    ',''],
    G: [' ####','#    ','# ###',' ####',''],
    H: ['#   #','#####','#   #','#   #',''],
    I: ['#####','  #  ','  #  ','#####',''],
    J: ['  ###','    #','#   #',' ### ',''],
    K: ['#   #','#  # ','##   ','#  # ','#   #'],
    L: ['#    ','#    ','#    ','#####',''],
    M: ['#   #','## ##','# # #','#   #',''],
    N: ['#   #','##  #','# # #','#  ##','#   #'],
    O: [' ### ','#   #','#   #',' ### ',''],
    P: ['#### ','#   #','#### ','#    ',''],
    Q: [' ### ','#   #','# # #',' ## #',''],
    R: ['#### ','#   #','#### ','#  # ','#   #'],
    S: [' ####','#    ',' ### ','    #','#### '],
    T: ['#####','  #  ','  #  ','  #  ',''],
    U: ['#   #','#   #','#   #',' ### ',''],
    V: ['#   #','#   #',' # # ','  #  ',''],
    W: ['#   #','# # #','## ##','#   #',''],
    X: ['#   #',' # # ','  #  ',' # # ','#   #'],
    Y: ['#   #',' # # ','  #  ','  #  ',''],
    Z: ['#####','   # ','  #  ',' #   ','#####'],
    ' ': ['     ','     ','     ','     ',''],
    '0': [' ### ','#  ##','## ##','###  ',' ### '],
    '1': ['  #  ',' ##  ','  #  ','#####',''],
    '2': [' ### ','    #',' ### ','#    ','#####'],
    '3': ['#### ','    #',' ### ','    #','#### '],
    '4': ['#   #','#   #','#####','    #',''],
    '5': ['#####','#    ','#### ','    #','#### '],
    '6': [' ### ','#    ','#### ','#   #',' ### '],
    '7': ['#####','   # ','  #  ',' #   ','#    '],
    '8': [' ### ','#   #',' ### ','#   #',' ### '],
    '9': [' ### ','#   #',' ####','    #',' ### '],
  },
  Mini: {
    A: ['/\\','\\\\',''],B: ['|>','|>',''],C: ['/-','\\-',''],D: ['|\\','|/',''],
    E: ['|-','|-',''],F: ['|-','| ',''],G: ['/-','|_',''],H: ['|_|','| |',''],
    I: ['|','|',''],J: [' |',' /',''],K: ['|/','|\\',''],L: ['| ','|_',''],
    M: ['|\\/|','|  |',''],N: ['|\\|','| |',''],O: ['()','()',''],P: ['|>','| ',''],
    Q: ['()','(_',''],R: ['|>','|\\',''],S: ['/-','_/',''],T: ['-|-','  |',''],
    U: ['| |',' V ',''],V: ['\\ /','\\/ ',''],W: ['|  |','|\\/ ',''],
    X: ['\\/ ','/\\ ',''],Y: ['\\/ ','| ',''],Z: ['-/','/-',''],
    ' ': ['  ','  ',''],
    '0':['0','0',''],'1':['1','1',''],'2':['2','2',''],'3':['3','3',''],
    '4':['4','4',''],'5':['5','5',''],'6':['6','6',''],'7':['7','7',''],
    '8':['8','8',''],'9':['9','9',''],
  },
};

function generateASCII(text, fontName) {
  const font = FONTS[fontName] || FONTS.Big;
  const chars = text.toUpperCase().split('').map(c => font[c] || font[' '] || ['?','?','']);
  const rows = chars[0]?.length || 5;
  const lines = [];
  for (let r = 0; r < rows - 1; r++) {
    lines.push(chars.map(c => (c[r] || '')).join(' '));
  }
  return lines.join('\n');
}

export default function ASCIIArtGenerator() {
  const [text, setText] = useState('Hello');
  const [font, setFont] = useState('Big');
  const [width, setWidth] = useState(80);
  const [copied, setCopied] = useState(false);

  const output = generateASCII(text.slice(0, 20), font);

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={20}
            className="flex-1 px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 text-sm"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            placeholder="Enter text (max 20 chars)..."
          />
          <select
            value={font}
            onChange={(e) => setFont(e.target.value)}
            className="px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 text-sm"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {Object.keys(FONTS).map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-surface-400 whitespace-nowrap">Width: {width}</label>
          <input type="range" min={40} max={120} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="flex-1 accent-primary-500" />
        </div>

        <div className="rounded-xl p-4 overflow-x-auto" style={{ background: '#1c1c1e' }}>
          <pre
            className="font-mono text-green-400 text-sm leading-tight whitespace-pre"
            style={{ maxWidth: `${width}ch`, fontSize: font === 'Mini' ? '1rem' : '0.75rem' }}
          >
            {output || '...'}
          </pre>
        </div>

        <button onClick={copy} className="px-4 py-2 text-white rounded-xl font-medium transition-colors text-sm" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
          {copied ? '✓ Copied!' : 'Copy ASCII Art'}
        </button>
      </div>
    </motion.div>
  );
}
