import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const DANGEROUS_EXTENSIONS = ['.exe', '.sh', '.php', '.bat', '.cmd', '.ps1', '.vbs', '.msi'];

// ─── Crypto Helpers ──────────────────────────────────────────────────────────

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptFile(file, password, onProgress) {
  onProgress?.(10);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  onProgress?.(30);
  const data = await file.arrayBuffer();
  onProgress?.(50);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  onProgress?.(80);
  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(encrypted), salt.length + iv.length);
  onProgress?.(100);
  return result;
}

async function decryptFile(encryptedData, password, onProgress) {
  onProgress?.(10);
  const salt = encryptedData.slice(0, 16);
  const iv = encryptedData.slice(16, 28);
  const ciphertext = encryptedData.slice(28);
  const key = await deriveKey(password, salt);
  onProgress?.(40);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  onProgress?.(100);
  return decrypted;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: 'bg-surface-700', width: '0%' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  const levels = [
    { label: 'Very weak', color: 'bg-red-500', width: '20%' },
    { label: 'Weak', color: 'bg-orange-500', width: '40%' },
    { label: 'Fair', color: 'bg-yellow-500', width: '60%' },
    { label: 'Strong', color: 'bg-green-500', width: '80%' },
    { label: 'Very strong', color: 'bg-emerald-400', width: '100%' },
  ];
  const idx = Math.min(score, 4);
  return { score: idx + 1, ...levels[idx] };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function GlassCard({ children, className = '', ...props }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: 'rgba(44,44,46,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function FileEncryption() {
  const [mode, setMode] = useState('encrypt');
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null); // { blob, name }
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const strength = getPasswordStrength(password);

  const reset = useCallback(() => {
    setFile(null);
    setPassword('');
    setResult(null);
    setError(null);
    setProgress(0);
    setProcessing(false);
  }, []);

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
    reset();
  }, [reset]);

  const handleFile = useCallback((f) => {
    setError(null);
    setResult(null);
    setProgress(0);
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${formatSize(MAX_FILE_SIZE)}.`);
      return;
    }
    if (mode === 'encrypt') {
      const ext = '.' + f.name.split('.').pop().toLowerCase();
      if (DANGEROUS_EXTENSIONS.includes(ext)) {
        setError(`Dangerous file type (${ext}) is not allowed.`);
        return;
      }
    }
    setFile(f);
  }, [mode]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleProcess = useCallback(async () => {
    if (!file || !password) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(0);

    try {
      if (mode === 'encrypt') {
        const encrypted = await encryptFile(file, password, setProgress);
        const blob = new Blob([encrypted], { type: 'application/octet-stream' });
        setResult({ blob, name: file.name + '.encrypted' });
      } else {
        const data = await file.arrayBuffer();
        const decrypted = await decryptFile(new Uint8Array(data), password, setProgress);
        // Strip .encrypted extension if present
        let name = file.name;
        if (name.endsWith('.encrypted')) name = name.slice(0, -10);
        else name = 'decrypted_' + name;
        const blob = new Blob([decrypted]);
        setResult({ blob, name });
      }
    } catch (err) {
      if (mode === 'decrypt') {
        setError('Decryption failed. Wrong password or corrupted file.');
      } else {
        setError('Encryption failed. ' + (err.message || 'Unknown error.'));
      }
      setProgress(0);
    } finally {
      setProcessing(false);
    }
  }, [file, password, mode]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result]);

  const canProcess = file && password.length >= 1 && !processing;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">

      {/* Mode toggle */}
      <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {['encrypt', 'decrypt'].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeChange(m)}
            className={`flex-1 min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all duration-200 ${mode === m ? 'text-white shadow-sm' : 'text-surface-400 hover:text-surface-300'}`}
            style={mode === m ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : {}}
          >
            {m === 'encrypt' ? '🔒 Encrypt' : '🔓 Decrypt'}
          </button>
        ))}
      </div>

      {/* File upload zone */}
      <GlassCard
        className={`p-8 text-center cursor-pointer transition-all duration-200 ${dragOver ? 'ring-2 ring-primary-500/50' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label={`Upload file to ${mode}`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
          aria-hidden="true"
        />
        <AnimatePresence mode="wait">
          {file ? (
            <motion.div key="file-info" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <span className="text-4xl block mb-3" aria-hidden="true">📄</span>
              <p className="text-sm font-semibold text-surface-200 break-all">{file.name}</p>
              <p className="text-xs text-surface-500 mt-1">{formatSize(file.size)} · {file.type || 'unknown type'}</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); setError(null); }}
                className="mt-3 min-h-[36px] px-3 py-1.5 rounded-xl text-xs text-surface-500 hover:text-red-400 hover:bg-red-500/5 transition-colors"
              >
                Remove file
              </button>
            </motion.div>
          ) : (
            <motion.div key="upload-prompt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.span
                className="text-4xl block mb-3"
                animate={dragOver ? { scale: 1.15, y: -4 } : { scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
                aria-hidden="true"
              >
                {mode === 'encrypt' ? '📁' : '🔐'}
              </motion.span>
              <p className="text-sm text-surface-400">
                Drag & drop a file here, or <span className="text-primary-500 font-semibold">click to browse</span>
              </p>
              <p className="text-xs text-surface-600 mt-1">Max {formatSize(MAX_FILE_SIZE)}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

      {/* Password input */}
      <GlassCard className="p-4 space-y-3">
        <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider">Password</label>
        <div className="flex items-center gap-2">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'encrypt' ? 'Enter a strong password' : 'Enter the password used to encrypt'}
            className="flex-1 min-h-[44px] bg-transparent text-surface-100 font-mono text-sm outline-none rounded-xl px-3 py-2"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            aria-label="Password"
          />
          <motion.button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            whileTap={{ scale: 0.9 }}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/5 text-surface-400 hover:text-surface-200 hover:bg-white/10 transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? '👁️' : '🔒'}
          </motion.button>
        </div>

        {/* Strength bar (encrypt mode only) */}
        {mode === 'encrypt' && password && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div
                  className={`h-full rounded-full ${strength.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: strength.width }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
              <span className="text-xs font-semibold text-surface-400 whitespace-nowrap">{strength.label}</span>
            </div>
          </motion.div>
        )}
      </GlassCard>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <GlassCard className="p-4">
              <div className="flex items-start gap-2">
                <span className="text-red-400 text-lg">⚠️</span>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Process button */}
      {!result && (
        <motion.button
          type="button"
          onClick={handleProcess}
          disabled={!canProcess}
          whileHover={canProcess ? { scale: 1.01 } : {}}
          whileTap={canProcess ? { scale: 0.98 } : {}}
          className="w-full min-h-[44px] px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
        >
          {processing ? (
            <span className="flex items-center justify-center gap-2">
              <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="inline-block">⏳</motion.span>
              {mode === 'encrypt' ? 'Encrypting…' : 'Decrypting…'}
            </span>
          ) : (
            mode === 'encrypt' ? '🔒 Encrypt File' : '🔓 Decrypt File'
          )}
        </motion.button>
      )}

      {/* Progress bar */}
      {processing && (
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
              {mode === 'encrypt' ? 'Encrypting' : 'Decrypting'}
            </span>
            <span className="text-xs font-mono text-surface-400">{progress}%</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #FF6363, #FF9F43)' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </GlassCard>
      )}

      {/* Result / Download */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <GlassCard className="p-6 text-center space-y-4" style={{ border: '1px solid rgba(52,211,153,0.2)' }}>
              <motion.span
                className="text-5xl block"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                aria-hidden="true"
              >
                {mode === 'encrypt' ? '🔒' : '🔓'}
              </motion.span>
              <p className="text-sm font-semibold text-emerald-400">
                {mode === 'encrypt' ? 'File encrypted successfully!' : 'File decrypted successfully!'}
              </p>
              <p className="text-xs text-surface-500 break-all">{result.name} · {formatSize(result.blob.size)}</p>
              <motion.button
                type="button"
                onClick={handleDownload}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="min-h-[44px] px-6 py-3 rounded-xl text-sm font-semibold text-white shadow-lg"
                style={{ background: 'linear-gradient(135deg, #34D399, #10B981)' }}
              >
                ⬇️ Download {mode === 'encrypt' ? 'Encrypted' : 'Decrypted'} File
              </motion.button>
              <button
                type="button"
                onClick={reset}
                className="block mx-auto min-h-[36px] px-3 py-1.5 text-xs text-surface-500 hover:text-surface-300 transition-colors"
              >
                Process another file
              </button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Privacy notice */}
      <GlassCard className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-lg shrink-0" aria-hidden="true">🛡️</span>
          <div>
            <p className="text-sm font-semibold text-surface-300">Your file never leaves your browser</p>
            <p className="text-xs text-surface-500 mt-1">
              All encryption and decryption happens locally using AES-256-GCM via the Web Crypto API.
              PBKDF2 with 100,000 iterations derives the key from your password. No data is transmitted to any server.
            </p>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
