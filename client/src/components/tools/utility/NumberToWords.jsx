import { useState } from 'react';
import { motion } from 'framer-motion';

const ones = ['','one','two','three','four','five','six','seven','eight','nine',
  'ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
const ordinalMap = { one:'first',two:'second',three:'third',five:'fifth',eight:'eighth',nine:'ninth',twelve:'twelfth' };

function toWordsEn(n) {
  if (n === 0) return 'zero';
  if (n < 0) return 'negative ' + toWordsEn(-n);
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? '-' + ones[n%10] : '');
  if (n < 1000) return ones[Math.floor(n/100)] + ' hundred' + (n%100 ? ' ' + toWordsEn(n%100) : '');
  if (n < 1000000) return toWordsEn(Math.floor(n/1000)) + ' thousand' + (n%1000 ? ' ' + toWordsEn(n%1000) : '');
  if (n < 1000000000) return toWordsEn(Math.floor(n/1000000)) + ' million' + (n%1000000 ? ' ' + toWordsEn(n%1000000) : '');
  return 'number too large';
}

function toOrdinal(words) {
  const parts = words.split(/[\s-]/);
  const last = parts[parts.length - 1];
  if (ordinalMap[last]) return words.slice(0, -last.length) + ordinalMap[last];
  if (last.endsWith('y')) return words.slice(0, -1) + 'ieth';
  if (last.endsWith('t') || last.endsWith('d')) return words + 'h';
  return words + 'th';
}

const HINDI_ONES = ['','एक','दो','तीन','चार','पाँच','छह','सात','आठ','नौ','दस',
  'ग्यारह','बारह','तेरह','चौदह','पंद्रह','सोलह','सत्रह','अठारह','उन्नीस','बीस'];
const HINDI_TENS = ['','','बीस','तीस','चालीस','पचास','साठ','सत्तर','अस्सी','नब्बे'];

function toWordsHi(n) {
  if (n === 0) return 'शून्य';
  if (n <= 20) return HINDI_ONES[n];
  if (n < 100) return HINDI_TENS[Math.floor(n/10)] + (n%10 ? ' ' + HINDI_ONES[n%10] : '');
  if (n < 1000) return HINDI_ONES[Math.floor(n/100)] + ' सौ' + (n%100 ? ' ' + toWordsHi(n%100) : '');
  if (n < 100000) return toWordsHi(Math.floor(n/1000)) + ' हज़ार' + (n%1000 ? ' ' + toWordsHi(n%1000) : '');
  if (n < 10000000) return toWordsHi(Math.floor(n/100000)) + ' लाख' + (n%100000 ? ' ' + toWordsHi(n%100000) : '');
  return toWordsHi(Math.floor(n/10000000)) + ' करोड़' + (n%10000000 ? ' ' + toWordsHi(n%10000000) : '');
}

export default function NumberToWords() {
  const [num, setNum] = useState('');
  const [lang, setLang] = useState('English');
  const [copied, setCopied] = useState('');

  const n = parseInt(num, 10);
  const valid = !isNaN(n) && n >= 0 && n <= 999999999;
  const words = valid ? (lang === 'English' ? toWordsEn(n) : toWordsHi(n)) : '';
  const ordinal = valid && lang === 'English' ? toOrdinal(words) : '';

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-surface-300 mb-1">Number (0 – 999,999,999)</label>
            <input type="number" value={num} onChange={e => setNum(e.target.value)} placeholder="e.g. 123456"
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Language</label>
            <select value={lang} onChange={e => setLang(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <option>English</option>
              <option>Hindi</option>
            </select>
          </div>
        </div>
      </div>

      {words && (
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {[['Cardinal', words, 'cardinal'], ...(ordinal ? [['Ordinal', ordinal, 'ordinal']] : [])].map(([label, val, key]) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-surface-400">{label}</span>
                <button onClick={() => copy(val, key)} className="px-3 py-1.5 text-sm text-white rounded-xl font-medium transition-colors" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
                  {copied === key ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div className="rounded-xl px-4 py-3 text-surface-100 capitalize font-medium" style={{ background: 'rgba(255,255,255,0.04)' }}>{val}</div>
            </div>
          ))}
        </div>
      )}
      {num && !valid && (
        <p className="text-sm text-red-400 text-center">Please enter a number between 0 and 999,999,999</p>
      )}
    </motion.div>
  );
}
