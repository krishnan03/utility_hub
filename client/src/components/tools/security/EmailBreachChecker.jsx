import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── HIBP k-Anonymity Password Check ────────────────────────────────────────

async function sha1Hash(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

async function checkPasswordBreach(password) {
  const hash = await sha1Hash(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { 'Add-Padding': 'true' },
  });

  if (!response.ok) throw new Error('Failed to reach HIBP API');

  const text = await response.text();
  const lines = text.split('\n');

  for (const line of lines) {
    const [hashSuffix, count] = line.trim().split(':');
    if (hashSuffix === suffix) {
      return { found: true, count: parseInt(count, 10) };
    }
  }
  return { found: false, count: 0 };
}

// ─── Security Tips ───────────────────────────────────────────────────────────

const SECURITY_TIPS = [
  { icon: '🔑', title: 'Use unique passwords', desc: 'Never reuse passwords across different accounts.' },
  { icon: '📏', title: 'Go long', desc: 'Use passwords with 16+ characters or passphrases.' },
  { icon: '🔐', title: 'Enable 2FA', desc: 'Add a second factor (TOTP, hardware key) to critical accounts.' },
  { icon: '🗄️', title: 'Use a password manager', desc: 'Let a manager generate and store complex passwords.' },
  { icon: '📧', title: 'Watch for phishing', desc: 'Never enter credentials on suspicious links or emails.' },
  { icon: '🔄', title: 'Rotate compromised passwords', desc: 'Change passwords immediately if a breach is detected.' },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function GlassCard({ children, className = '' }) {
  return (
    <div className={`rounded-2xl ${className}`}
      style={{ background: 'rgba(44,44,46,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {children}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function EmailBreachChecker() {
  const [activeTab, setActiveTab] = useState('email');

  // Email tab
  const [email, setEmail] = useState('');

  // Password tab
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwResult, setPwResult] = useState(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState(null);

  // ─── Email Check ─────────────────────────────────────────────────────

  const handleEmailCheck = useCallback(() => {
    if (!email.trim()) return;
    const encoded = encodeURIComponent(email.trim());
    window.open(`https://haveibeenpwned.com/account/${encoded}`, '_blank', 'noopener,noreferrer');
  }, [email]);

  // ─── Password Check ──────────────────────────────────────────────────

  const handlePasswordCheck = useCallback(async () => {
    if (!password) return;
    setPwLoading(true);
    setPwError(null);
    setPwResult(null);
    try {
      const result = await checkPasswordBreach(password);
      setPwResult(result);
    } catch {
      setPwError('Could not reach the breach database. Please try again later.');
    } finally {
      setPwLoading(false);
    }
  }, [password]);

  const isValidEmail = email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Tab Toggle */}
      <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {[
          { key: 'email', label: '📧 Email Breach' },
          { key: 'password', label: '🔑 Password Breach' },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === tab.key ? 'text-white shadow-sm' : 'text-surface-400 hover:text-surface-300'}`}
            style={activeTab === tab.key ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : {}}>
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'email' ? (
          <motion.div key="email" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="space-y-6">
            {/* Email Input */}
            <GlassCard className="p-6 space-y-4">
              <label className="block text-sm font-medium text-surface-300">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && isValidEmail && handleEmailCheck()}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                placeholder="Enter your email address" />

              <button onClick={handleEmailCheck} disabled={!isValidEmail}
                className="w-full min-h-[44px] px-4 py-2.5 text-sm text-white rounded-xl font-medium transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
                🔍 Check on Have I Been Pwned ↗
              </button>

              <p className="text-[11px] text-surface-500 leading-relaxed">
                Opens haveibeenpwned.com in a new tab. Your email is only sent to their service for the lookup.
              </p>
            </GlassCard>

            {/* How It Works */}
            <GlassCard className="p-6 space-y-3">
              <span className="text-sm font-medium text-surface-300">How It Works</span>
              <div className="space-y-2 text-sm text-surface-400">
                <div className="flex items-start gap-2">
                  <span className="text-primary-400 shrink-0">1.</span>
                  <span>Your email is checked against the Have I Been Pwned database of 13+ billion breached accounts.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary-400 shrink-0">2.</span>
                  <span>If found, you'll see which breaches exposed your data and what types of data were compromised.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary-400 shrink-0">3.</span>
                  <span>Change passwords for any breached accounts immediately and enable 2FA where possible.</span>
                </div>
              </div>
            </GlassCard>

            {/* Security Tips */}
            <GlassCard className="p-6 space-y-4">
              <span className="text-sm font-medium text-surface-300">🛡️ Security Tips</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SECURITY_TIPS.map((tip) => (
                  <div key={tip.title} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <span className="text-lg shrink-0">{tip.icon}</span>
                    <div>
                      <div className="text-xs font-semibold text-surface-200">{tip.title}</div>
                      <div className="text-[11px] text-surface-500 mt-0.5">{tip.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div key="password" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
            {/* Password Input */}
            <GlassCard className="p-6 space-y-4">
              <label className="block text-sm font-medium text-surface-300">Password</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input type={showPassword ? 'text' : 'password'} value={password}
                    onChange={(e) => { setPassword(e.target.value); setPwResult(null); setPwError(null); }}
                    onKeyDown={(e) => e.key === 'Enter' && password && handlePasswordCheck()}
                    className="w-full min-h-[44px] px-3 py-2 pr-12 rounded-xl text-surface-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    placeholder="Enter a password to check" />
                  <button onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-200 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? '👁️' : '🔒'}
                  </button>
                </div>
              </div>

              <button onClick={handlePasswordCheck} disabled={!password || pwLoading}
                className="w-full min-h-[44px] px-4 py-2.5 text-sm text-white rounded-xl font-medium transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
                {pwLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="inline-block">⏳</motion.span>
                    Checking…
                  </span>
                ) : '🔍 Check Password'}
              </button>

              {/* Result */}
              <AnimatePresence>
                {pwResult && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    {pwResult.found ? (
                      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">⚠️</span>
                          <div>
                            <p className="text-sm font-bold text-red-400">Password compromised!</p>
                            <p className="text-xs text-red-400/70">
                              Found in <span className="font-mono font-bold">{pwResult.count.toLocaleString()}</span> data breach{pwResult.count !== 1 ? 'es' : ''}.
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-red-400/60">
                          This password has been exposed in known data breaches. Do not use it for any account.
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">✅</span>
                          <div>
                            <p className="text-sm font-bold text-emerald-400">Not found in any breaches</p>
                            <p className="text-xs text-emerald-400/70">This password hasn't appeared in known data breaches.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
                {pwError && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-sm text-yellow-400">{pwError}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>

            {/* Privacy Explanation */}
            <GlassCard className="p-6 space-y-3">
              <span className="text-sm font-medium text-surface-300">🔐 How k-Anonymity Works</span>
              <div className="space-y-3 text-sm text-surface-400">
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span className="text-primary-400 font-bold shrink-0">1</span>
                  <span>Your password is hashed with SHA-1 <span className="text-surface-500">locally in your browser</span>.</span>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span className="text-primary-400 font-bold shrink-0">2</span>
                  <span>Only the <span className="font-mono text-surface-300">first 5 characters</span> of the hash are sent to the HIBP API.</span>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span className="text-primary-400 font-bold shrink-0">3</span>
                  <span>The API returns all hash suffixes matching that prefix. The comparison happens <span className="text-surface-500">entirely in your browser</span>.</span>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span className="text-primary-400 font-bold shrink-0">4</span>
                  <span>Your full password hash is <span className="font-semibold text-emerald-400">never transmitted</span> to any server.</span>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
