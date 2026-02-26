import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'SEK', name: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'NZD', name: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'HKD', name: 'Hong Kong Dollar', flag: '🇭🇰' },
  { code: 'NOK', name: 'Norwegian Krone', flag: '🇳🇴' },
  { code: 'KRW', name: 'South Korean Won', flag: '🇰🇷' },
  { code: 'TRY', name: 'Turkish Lira', flag: '🇹🇷' },
  { code: 'RUB', name: 'Russian Ruble', flag: '🇷🇺' },
  { code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦' },
  { code: 'TWD', name: 'Taiwan Dollar', flag: '🇹🇼' },
  { code: 'DKK', name: 'Danish Krone', flag: '🇩🇰' },
  { code: 'PLN', name: 'Polish Zloty', flag: '🇵🇱' },
  { code: 'THB', name: 'Thai Baht', flag: '🇹🇭' },
  { code: 'IDR', name: 'Indonesian Rupiah', flag: '🇮🇩' },
  { code: 'HUF', name: 'Hungarian Forint', flag: '🇭🇺' },
  { code: 'CZK', name: 'Czech Koruna', flag: '🇨🇿' },
  { code: 'ILS', name: 'Israeli Shekel', flag: '🇮🇱' },
  { code: 'CLP', name: 'Chilean Peso', flag: '🇨🇱' },
  { code: 'PHP', name: 'Philippine Peso', flag: '🇵🇭' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'MYR', name: 'Malaysian Ringgit', flag: '🇲🇾' },
  { code: 'NGN', name: 'Nigerian Naira', flag: '🇳🇬' },
];

const HISTORY_KEY = 'utilhub_currency_history';
const cardStyle = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };
const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' };
const btnGradient = { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' };

function loadConvHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

export default function CurrencyConverter() {
  const [amount, setAmount] = useState('1');
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('EUR');
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => { setHistory(loadConvHistory()); }, []);

  const fetchRates = useCallback(async (base) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRates(data.rates);
      setLastUpdated(data.date || new Date().toISOString().split('T')[0]);
      return data.rates;
    } catch (e) {
      setError('Failed to fetch exchange rates. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleConvert = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount.'); return; }
    const r = await fetchRates(from);
    if (!r || !r[to]) return;
    const rate = r[to];
    const converted = amt * rate;
    const entry = { from, to, amount: amt, result: converted, rate, timestamp: Date.now() };
    setResult(entry);
    const updated = [entry, ...history].slice(0, 5);
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const handleSwap = () => { setFrom(to); setTo(from); setResult(null); };

  const fmtNum = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">Amount</label>
          <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setResult(null); }}
            onKeyDown={e => e.key === 'Enter' && handleConvert()}
            placeholder="1.00" min="0" step="any"
            className="w-full px-3 py-2.5 rounded-xl text-surface-100 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            style={inputStyle} />
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-surface-300 mb-1">From</label>
            <select value={from} onChange={e => { setFrom(e.target.value); setResult(null); }}
              className="w-full px-3 py-2.5 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 min-h-[44px]"
              style={inputStyle}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>)}
            </select>
          </div>

          <motion.button whileHover={{ scale: 1.1, rotate: 180 }} whileTap={{ scale: 0.9 }}
            onClick={handleSwap}
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-xl text-surface-300 hover:text-surface-100 transition-colors mb-0.5"
            style={{ background: 'rgba(255,255,255,0.06)' }}
            aria-label="Swap currencies">
            ⇄
          </motion.button>

          <div className="flex-1">
            <label className="block text-sm font-medium text-surface-300 mb-1">To</label>
            <select value={to} onChange={e => { setTo(e.target.value); setResult(null); }}
              className="w-full px-3 py-2.5 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 min-h-[44px]"
              style={inputStyle}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>)}
            </select>
          </div>
        </div>

        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleConvert} disabled={loading}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm min-h-[44px] disabled:opacity-50 transition-all"
          style={btnGradient}>
          {loading ? 'Converting...' : 'Convert'}
        </motion.button>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="rounded-2xl p-6 space-y-3" style={{ background: 'rgba(255,99,99,0.04)', border: '1px solid rgba(255,99,99,0.15)' }}>
            <div className="text-center space-y-2">
              <p className="text-surface-400 text-sm">
                {fmtNum(result.amount)} {result.from} =
              </p>
              <p className="text-3xl font-bold text-primary-400 font-mono">
                {fmtNum(result.result)} {result.to}
              </p>
              <p className="text-xs text-surface-500">
                1 {result.from} = {fmtNum(result.rate)} {result.to} · Updated {lastUpdated}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {history.length > 0 && (
        <div className="rounded-2xl p-6 space-y-3" style={cardStyle}>
          <p className="text-sm font-semibold text-surface-300">Recent Conversions</p>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="text-sm text-surface-300 font-mono">{fmtNum(h.amount)} {h.from}</span>
                <span className="text-xs text-surface-500">→</span>
                <span className="text-sm text-primary-400 font-mono font-medium">{fmtNum(h.result)} {h.to}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
