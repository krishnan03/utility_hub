import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── TOTP Crypto Utilities ───────────────────────────────────────────────────

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(str) {
  str = str.replace(/[=\s]/g, '').toUpperCase();
  let bits = '';
  for (const c of str) {
    const val = B32_ALPHABET.indexOf(c);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substr(i * 8, 8), 2);
  }
  return bytes;
}

function generateSecret(length = 20) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes).map((b) => B32_ALPHABET[b % 32]).join('');
}

async function generateTOTP(secret, period = 30, digits = 6, algorithm = 'SHA-1') {
  const key = base32Decode(secret);
  if (key.length === 0) throw new Error('Invalid secret');
  const time = Math.floor(Date.now() / 1000 / period);
  const timeBytes = new Uint8Array(8);
  let t = time;
  for (let i = 7; i >= 0; i--) {
    timeBytes[i] = t & 0xff;
    t = Math.floor(t / 256);
  }
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: algorithm }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, timeBytes);
  const hmac = new Uint8Array(signature);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24 | hmac[offset + 1] << 16 | hmac[offset + 2] << 8 | hmac[offset + 3]) % (10 ** digits);
  return String(code).padStart(digits, '0');
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function GlassCard({ children, className = '' }) {
  return (
    <div className={`rounded-2xl ${className}`}
      style={{ background: 'rgba(44,44,46,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {children}
    </div>
  );
}

function CountdownRing({ secondsLeft, period }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = secondsLeft / period;
  const offset = circumference * (1 - progress);
  const isLow = secondsLeft <= 5;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <motion.circle cx="44" cy="44" r={radius} fill="none"
          stroke={isLow ? '#ef4444' : '#FF6363'} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transition={{ duration: 0.3, ease: 'linear' }} />
      </svg>
      <span className={`absolute text-lg font-bold font-mono ${isLow ? 'text-red-400' : 'text-surface-100'}`}>
        {secondsLeft}s
      </span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TOTPGenerator() {
  const [secret, setSecret] = useState(() => generateSecret());
  const [algorithm, setAlgorithm] = useState('SHA-1');
  const [digits, setDigits] = useState(6);
  const [period, setPeriod] = useState(30);
  const [issuer, setIssuer] = useState('');
  const [account, setAccount] = useState('');
  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const qrRef = useRef(null);
  const qrInstanceRef = useRef(null);
  const timerRef = useRef(null);

  // ─── Generate TOTP code ──────────────────────────────────────────────

  const refreshCode = useCallback(async () => {
    if (!secret.trim()) { setCode(''); setError(null); return; }
    try {
      const newCode = await generateTOTP(secret, period, digits, algorithm);
      setCode(newCode);
      setError(null);
    } catch (e) {
      setCode('');
      setError(e.message || 'Failed to generate code');
    }
  }, [secret, period, digits, algorithm]);

  // Timer loop
  useEffect(() => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = period - (now % period);
      setSecondsLeft(remaining);
      if (remaining === period) refreshCode();
    };
    tick();
    refreshCode();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [period, refreshCode]);

  // ─── QR Code ─────────────────────────────────────────────────────────

  const otpauthURI = useMemo(() => {
    const label = account ? (issuer ? `${issuer}:${account}` : account) : (issuer || 'TOTP');
    const params = new URLSearchParams({
      secret,
      algorithm: algorithm.replace('-', ''),
      digits: String(digits),
      period: String(period),
    });
    if (issuer) params.set('issuer', issuer);
    return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
  }, [secret, algorithm, digits, period, issuer, account]);

  useEffect(() => {
    if (!qrRef.current || !secret.trim()) return;
    let cancelled = false;
    (async () => {
      try {
        const { default: QRCodeStyling } = await import('qr-code-styling');
        if (cancelled) return;
        if (qrInstanceRef.current) {
          qrInstanceRef.current.update({ data: otpauthURI });
        } else {
          const qr = new QRCodeStyling({
            width: 200, height: 200, data: otpauthURI, type: 'svg',
            dotsOptions: { color: '#ffffff', type: 'rounded' },
            backgroundOptions: { color: 'transparent' },
            cornersSquareOptions: { type: 'extra-rounded', color: '#FF6363' },
            cornersDotOptions: { type: 'dot', color: '#FF9F43' },
          });
          qrInstanceRef.current = qr;
          qrRef.current.innerHTML = '';
          qr.append(qrRef.current);
        }
      } catch { /* qr-code-styling not available */ }
    })();
    return () => { cancelled = true; };
  }, [otpauthURI, secret]);

  // ─── Actions ─────────────────────────────────────────────────────────

  const handleGenerateSecret = () => {
    setSecret(generateSecret());
    setVerifyResult(null);
    setVerifyInput('');
  };

  const handleCopy = async (text, label) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleVerify = async () => {
    if (!verifyInput.trim()) return;
    try {
      const current = await generateTOTP(secret, period, digits, algorithm);
      setVerifyResult(verifyInput.replace(/\s/g, '') === current ? 'valid' : 'invalid');
    } catch {
      setVerifyResult('invalid');
    }
  };

  // ─── Format code with space ──────────────────────────────────────────

  const formattedCode = useMemo(() => {
    if (!code) return '--- ---';
    const mid = Math.floor(code.length / 2);
    return code.slice(0, mid) + ' ' + code.slice(mid);
  }, [code]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Secret Input */}
      <GlassCard className="p-6 space-y-4">
        <label className="block text-sm font-medium text-surface-300">Secret Key (Base32)</label>
        <div className="flex gap-2">
          <input type="text" value={secret} onChange={(e) => { setSecret(e.target.value.toUpperCase().replace(/[^A-Z2-7]/g, '')); setVerifyResult(null); }}
            className="flex-1 px-3 py-2 rounded-xl text-surface-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            placeholder="Enter or generate a base32 secret" />
          <button onClick={handleGenerateSecret}
            className="min-h-[44px] px-4 py-2 text-sm text-white rounded-xl font-medium shrink-0 transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
            🎲 Generate
          </button>
        </div>
        <button onClick={() => handleCopy(secret, 'secret')}
          className="min-h-[44px] px-4 py-2 text-sm text-surface-300 rounded-xl font-medium transition-colors hover:bg-white/10"
          style={{ background: 'rgba(255,255,255,0.06)' }}>
          {copied === 'secret' ? '✓ Copied' : '📋 Copy Secret'}
        </button>
      </GlassCard>

      {/* TOTP Display */}
      <GlassCard className="p-6">
        <div className="flex flex-col items-center gap-4">
          <AnimatePresence mode="wait">
            <motion.div key={code} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="text-5xl font-mono font-extrabold tracking-[0.3em] text-surface-50 select-all cursor-pointer"
              onClick={() => code && handleCopy(code, 'code')} title="Click to copy">
              {error ? (
                <span className="text-red-400 text-lg font-sans tracking-normal">{error}</span>
              ) : formattedCode}
            </motion.div>
          </AnimatePresence>

          <CountdownRing secondsLeft={secondsLeft} period={period} />

          {copied === 'code' && (
            <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-emerald-400 font-medium">
              Code copied!
            </motion.span>
          )}
        </div>
      </GlassCard>

      {/* QR Code */}
      {secret.trim() && (
        <GlassCard className="p-6 space-y-3">
          <span className="text-sm font-medium text-surface-300">QR Code</span>
          <div className="flex justify-center">
            <div ref={qrRef} className="rounded-xl overflow-hidden" />
          </div>
          <button onClick={() => handleCopy(otpauthURI, 'uri')}
            className="w-full min-h-[44px] px-4 py-2 text-sm text-surface-300 rounded-xl font-medium transition-colors hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            {copied === 'uri' ? '✓ Copied URI' : '🔗 Copy otpauth:// URI'}
          </button>
        </GlassCard>
      )}

      {/* Configuration */}
      <GlassCard className="p-6 space-y-4">
        <span className="text-sm font-medium text-surface-300">Configuration</span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-surface-400 mb-1">Algorithm</label>
            <div className="flex gap-1">
              {['SHA-1', 'SHA-256', 'SHA-512'].map((alg) => (
                <button key={alg} onClick={() => setAlgorithm(alg)}
                  className={`flex-1 min-h-[44px] px-2 py-2 rounded-xl text-xs font-medium transition-all ${algorithm === alg ? 'text-white' : 'text-surface-400 hover:text-surface-300'}`}
                  style={algorithm === alg ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                  {alg}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-surface-400 mb-1">Digits</label>
            <div className="flex gap-1">
              {[6, 8].map((d) => (
                <button key={d} onClick={() => setDigits(d)}
                  className={`flex-1 min-h-[44px] px-2 py-2 rounded-xl text-sm font-medium transition-all ${digits === d ? 'text-white' : 'text-surface-400 hover:text-surface-300'}`}
                  style={digits === d ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-surface-400 mb-1">Period</label>
            <div className="flex gap-1">
              {[30, 60].map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`flex-1 min-h-[44px] px-2 py-2 rounded-xl text-sm font-medium transition-all ${period === p ? 'text-white' : 'text-surface-400 hover:text-surface-300'}`}
                  style={period === p ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                  {p}s
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-surface-400 mb-1">Issuer (optional)</label>
            <input type="text" value={issuer} onChange={(e) => setIssuer(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              placeholder="e.g. GitHub" />
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">Account (optional)</label>
            <input type="text" value={account} onChange={(e) => setAccount(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              placeholder="e.g. user@example.com" />
          </div>
        </div>
      </GlassCard>

      {/* Verify */}
      <GlassCard className="p-6 space-y-4">
        <span className="text-sm font-medium text-surface-300">Verify Code</span>
        <div className="flex gap-2">
          <input type="text" value={verifyInput} onChange={(e) => { setVerifyInput(e.target.value.replace(/[^0-9]/g, '')); setVerifyResult(null); }}
            maxLength={digits} placeholder={`Enter ${digits}-digit code`}
            className="flex-1 min-h-[44px] px-3 py-2 rounded-xl text-surface-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          <button onClick={handleVerify}
            className="min-h-[44px] px-4 py-2 text-sm text-white rounded-xl font-medium shrink-0 transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
            ✓ Verify
          </button>
        </div>
        <AnimatePresence>
          {verifyResult && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              {verifyResult === 'valid' ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-emerald-400">✅</span>
                  <span className="text-sm font-semibold text-emerald-400">Code is valid</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <span className="text-red-400">❌</span>
                  <span className="text-sm font-semibold text-red-400">Code is invalid or expired</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

      {/* Privacy Notice */}
      <div className="text-center">
        <p className="text-[11px] text-surface-600">
          🔐 All codes generated locally in your browser using the Web Crypto API. Nothing is sent to any server.
        </p>
      </div>
    </motion.div>
  );
}
