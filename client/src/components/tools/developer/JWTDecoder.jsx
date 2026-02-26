import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function base64UrlDecode(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
  return JSON.parse(atob(padded));
}

function base64UrlEncode(data) {
  return btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function formatDate(ts) {
  if (!ts) return null;
  return new Date(ts * 1000).toLocaleString();
}

const CLAIM_LABELS = {
  iss: 'Issuer',
  sub: 'Subject',
  aud: 'Audience',
  exp: 'Expiration Time',
  nbf: 'Not Before',
  iat: 'Issued At',
  jti: 'JWT ID',
};

const HMAC_ALGORITHMS = ['HS256', 'HS384', 'HS512'];
const ALG_MAP = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };

async function verifyHMAC(token, secret, algorithm) {
  const [headerB64, payloadB64, signatureB64] = token.split('.');
  const data = `${headerB64}.${payloadB64}`;
  const hashAlg = ALG_MAP[algorithm];
  if (!hashAlg) return null;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: hashAlg },
    false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const computed = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return computed === signatureB64;
}

async function signJWT(header, payload, secret) {
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  const hashAlg = ALG_MAP[header.alg];
  if (!hashAlg) return null;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: hashAlg },
    false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${headerB64}.${payloadB64}.${sigB64}`;
}

function TokenColorized({ token }) {
  const parts = token.trim().split('.');
  if (parts.length !== 3) return <span className="font-mono text-sm text-surface-100 break-all">{token}</span>;
  return (
    <span className="font-mono text-sm break-all">
      <span className="text-orange-400">{parts[0]}</span>
      <span className="text-surface-500">.</span>
      <span className="text-green-400">{parts[1]}</span>
      <span className="text-surface-500">.</span>
      <span className="text-blue-400">{parts[2]}</span>
    </span>
  );
}

function PayloadWithClaims({ payload }) {
  const entries = Object.entries(payload);
  return (
    <div className="space-y-1 font-mono text-sm">
      <span className="text-surface-500">{'{'}</span>
      {entries.map(([key, value], i) => {
        const label = CLAIM_LABELS[key];
        const isTimestamp = ['exp', 'nbf', 'iat'].includes(key) && typeof value === 'number';
        return (
          <div key={key} className="pl-4 flex flex-wrap items-baseline gap-2">
            <span>
              <span className="text-primary-400">&quot;{key}&quot;</span>
              <span className="text-surface-500">: </span>
              <span className="text-surface-100">
                {typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}
              </span>
              {i < entries.length - 1 && <span className="text-surface-500">,</span>}
            </span>
            {label && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-400 font-sans">
                {label}
              </span>
            )}
            {isTimestamp && (
              <span className="text-xs text-surface-500 font-sans">
                ({formatDate(value)})
              </span>
            )}
          </div>
        );
      })}
      <span className="text-surface-500">{'}'}</span>
    </div>
  );
}

export default function JWTDecoder() {
  const [token, setToken] = useState('');
  const [decoded, setDecoded] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('decode');

  // Verification state
  const [secret, setSecret] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  // Builder state
  const [buildAlg, setBuildAlg] = useState('HS256');
  const [buildPayload, setBuildPayload] = useState('{\n  "sub": "1234567890",\n  "name": "John Doe",\n  "iat": 1516239022\n}');
  const [buildSecret, setBuildSecret] = useState('');
  const [builtToken, setBuiltToken] = useState('');
  const [buildError, setBuildError] = useState('');
  const [buildCopied, setBuildCopied] = useState(false);

  const decode = useCallback((val) => {
    setToken(val);
    setError(''); setDecoded(null); setVerifyResult(null);
    if (!val.trim()) return;
    const parts = val.trim().split('.');
    if (parts.length !== 3) { setError('Invalid JWT: must have 3 parts separated by dots'); return; }
    try {
      const header = base64UrlDecode(parts[0]);
      const payload = base64UrlDecode(parts[1]);
      setDecoded({ header, payload, signature: parts[2] });
    } catch {
      setError('Failed to decode JWT — check the token format');
    }
  }, []);

  const handleVerify = useCallback(async () => {
    if (!decoded || !secret) return;
    setVerifying(true);
    try {
      const alg = decoded.header.alg;
      const result = await verifyHMAC(token.trim(), secret, alg);
      setVerifyResult(result);
    } catch {
      setVerifyResult(false);
    }
    setVerifying(false);
  }, [decoded, secret, token]);

  const handleBuild = useCallback(async () => {
    setBuildError(''); setBuiltToken('');
    try {
      const payload = JSON.parse(buildPayload);
      const header = { alg: buildAlg, typ: 'JWT' };
      const result = await signJWT(header, payload, buildSecret);
      if (!result) { setBuildError('Unsupported algorithm'); return; }
      setBuiltToken(result);
    } catch (e) {
      setBuildError(e.message || 'Failed to build token');
    }
  }, [buildAlg, buildPayload, buildSecret]);

  const expiryStatus = () => {
    if (!decoded?.payload) return null;
    const { exp } = decoded.payload;
    if (!exp) return { label: 'No expiry', color: 'text-surface-500' };
    return Date.now() / 1000 > exp
      ? { label: 'Expired', color: 'text-red-400' }
      : { label: 'Valid', color: 'text-green-500' };
  };

  const status = decoded ? expiryStatus() : null;

  const copy = useCallback(() => {
    if (!decoded) return;
    navigator.clipboard.writeText(JSON.stringify(decoded.payload, null, 2));
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }, [decoded]);

  const copyBuilt = useCallback(() => {
    navigator.clipboard.writeText(builtToken);
    setBuildCopied(true); setTimeout(() => setBuildCopied(false), 1500);
  }, [builtToken]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {['decode', 'build'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${
                activeTab === tab ? 'bg-primary-500/20 text-primary-400' : 'text-surface-400 hover:text-surface-200'
              }`}>
              {tab === 'decode' ? 'Decode' : 'Build'}
            </button>
          ))}
        </div>

        {/* ===== DECODE TAB ===== */}
        {activeTab === 'decode' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-surface-300 block mb-1">JWT Token</label>
              <textarea
                rows={4}
                value={token}
                onChange={e => decode(e.target.value)}
                placeholder="Paste your JWT token here..."
                className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>

            {/* Visual Token Breakdown */}
            {token.trim() && !error && (
              <div className="rounded-xl p-4 break-all" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-xs text-surface-500 mb-2 flex items-center gap-4">
                  <span>Token Breakdown:</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Header</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Payload</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Signature</span>
                </div>
                <TokenColorized token={token.trim()} />
              </div>
            )}

            {error && <p className="text-red-400 text-sm rounded-xl px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)' }}>{error}</p>}

            {decoded && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {status && <span className={`text-sm font-semibold ${status.color}`}>{status.label}</span>}
                  {decoded.payload.iat && <span className="text-xs text-surface-500">Issued: {formatDate(decoded.payload.iat)}</span>}
                  {decoded.payload.exp && <span className="text-xs text-surface-500">Expires: {formatDate(decoded.payload.exp)}</span>}
                </div>

                {/* Header */}
                <div>
                  <div className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1">Header</div>
                  <pre className="font-mono text-sm rounded-xl p-4 overflow-auto text-surface-100"
                    style={{ background: 'rgba(255,160,0,0.06)', border: '1px solid rgba(255,160,0,0.2)' }}>
                    {JSON.stringify(decoded.header, null, 2)}
                  </pre>
                </div>

                {/* Payload with claim labels */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-semibold text-green-400 uppercase tracking-wider">Payload</div>
                    <button onClick={copy} className="text-xs px-3 py-1 rounded-lg transition-colors hover:bg-white/5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      {copied ? '✓ Copied' : 'Copy Payload'}
                    </button>
                  </div>
                  <div className="rounded-xl p-4 overflow-auto" style={{ background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.2)' }}>
                    <PayloadWithClaims payload={decoded.payload} />
                  </div>
                </div>

                {/* Signature */}
                <div>
                  <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">Signature</div>
                  <pre className="font-mono text-sm rounded-xl p-4 overflow-auto text-surface-100 break-all"
                    style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                    {decoded.signature}
                  </pre>
                </div>

                {/* HMAC Signature Verification */}
                {decoded.header.alg && HMAC_ALGORITHMS.includes(decoded.header.alg) && (
                  <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-sm font-semibold text-surface-200">Verify Signature ({decoded.header.alg})</div>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="text-xs text-surface-400 block mb-1">Secret Key</label>
                        <input type="text" value={secret} onChange={e => { setSecret(e.target.value); setVerifyResult(null); }}
                          placeholder="Enter your secret key..."
                          className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                      </div>
                      <button onClick={handleVerify} disabled={!secret || verifying}
                        className="px-4 py-2 rounded-xl text-sm font-medium transition-colors bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 disabled:opacity-40">
                        {verifying ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>
                    <AnimatePresence>
                      {verifyResult !== null && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                          {verifyResult === true
                            ? <p className="text-green-400 text-sm font-medium">✅ Signature Valid</p>
                            : <p className="text-red-400 text-sm font-medium">❌ Signature Invalid</p>
                          }
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <p className="text-xs text-surface-600 italic">🔒 Verification happens entirely in your browser</p>
                  </div>
                )}

                {decoded.header.alg && !HMAC_ALGORITHMS.includes(decoded.header.alg) && (
                  <p className="text-xs text-surface-600 italic">
                    ⚠ Signature verification is only supported for HMAC algorithms (HS256, HS384, HS512). This token uses {decoded.header.alg}.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== BUILD TAB ===== */}
        {activeTab === 'build' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-surface-300 block mb-1">Algorithm</label>
              <div className="flex gap-2">
                {HMAC_ALGORITHMS.map(alg => (
                  <button key={alg} onClick={() => setBuildAlg(alg)}
                    className={`px-4 py-2 text-sm font-mono rounded-xl transition-colors ${
                      buildAlg === alg ? 'bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/30' : 'text-surface-400 hover:text-surface-200'
                    }`}
                    style={buildAlg !== alg ? { background: 'rgba(255,255,255,0.06)' } : {}}>
                    {alg}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-surface-300 block mb-1">Payload (JSON)</label>
              <textarea rows={6} value={buildPayload} onChange={e => setBuildPayload(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>

            <div>
              <label className="text-sm font-medium text-surface-300 block mb-1">Secret Key</label>
              <input type="text" value={buildSecret} onChange={e => setBuildSecret(e.target.value)}
                placeholder="Enter secret key for signing..."
                className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>

            <button onClick={handleBuild} disabled={!buildSecret || !buildPayload}
              className="w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all bg-gradient-to-r from-primary-500 to-primary-400 text-white hover:shadow-lg hover:shadow-primary-500/20 disabled:opacity-40 disabled:hover:shadow-none">
              Generate JWT
            </button>

            {buildError && <p className="text-red-400 text-sm rounded-xl px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)' }}>{buildError}</p>}

            {builtToken && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-surface-300">Generated Token</div>
                  <button onClick={copyBuilt}
                    className="text-xs px-3 py-1 rounded-lg transition-colors hover:bg-white/5"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                    {buildCopied ? '✓ Copied' : 'Copy Token'}
                  </button>
                </div>
                <div className="rounded-xl p-4 break-all" style={{ background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.2)' }}>
                  <TokenColorized token={builtToken} />
                </div>
                <p className="text-xs text-surface-600 italic">🔒 Token generated entirely in your browser — your secret never leaves this page</p>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
