import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

async function computeHash(algo, buffer) {
  const buf = await crypto.subtle.digest(algo, buffer);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function ChecksumCalculator() {
  const [file, setFile] = useState(null);
  const [checksums, setChecksums] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expected, setExpected] = useState('');
  const [copied, setCopied] = useState('');
  const fileRef = useRef();

  const processFile = async (f) => {
    setFile(f); setChecksums(null); setLoading(true);
    const buf = await f.arrayBuffer();
    const [sha1, sha256, sha512] = await Promise.all([
      computeHash('SHA-1', buf),
      computeHash('SHA-256', buf),
      computeHash('SHA-512', buf),
    ]);
    setChecksums({ 'SHA-1': sha1, 'SHA-256': sha256, 'SHA-512': sha512 });
    setLoading(false);
  };

  const handleFile = (e) => { const f = e.target.files[0]; if (f) processFile(f); e.target.value = ''; };
  const handleDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) processFile(f); };

  const copy = (key, val) => { navigator.clipboard.writeText(val); setCopied(key); setTimeout(() => setCopied(''), 2000); };

  const expectedNorm = expected.trim().toLowerCase();
  const matchAlgo = checksums ? Object.entries(checksums).find(([, v]) => v === expectedNorm) : null;
  const mismatch = expectedNorm && checksums && !matchAlgo;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl px-4 py-3 text-sm text-primary-300 flex items-center gap-2" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.2)' }}>
        🔒 All processing is done locally — your file is never uploaded to any server.
      </div>

      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div
          onDrop={handleDrop} onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current.click()}
          className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors group"
          style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📁</div>
          {file ? (
            <div>
              <p className="font-medium text-surface-100">{file.name}</p>
              <p className="text-sm text-surface-400">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <p className="text-sm text-surface-400">Drop a file here or click to select</p>
          )}
          <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-primary-400">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Computing checksums...
          </div>
        )}
      </div>

      {checksums && (
        <>
          <div className="rounded-2xl p-6 space-y-3" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-sm font-semibold text-surface-300">Checksums</h3>
            {Object.entries(checksums).map(([algo, hash]) => (
              <div key={algo} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-surface-400">{algo}</span>
                  <button onClick={() => copy(algo, hash)} className="text-xs text-primary-400 hover:text-primary-300">
                    {copied === algo ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <div className="font-mono text-xs text-surface-100 rounded-xl px-3 py-2 break-all" style={{ background: 'rgba(255,255,255,0.04)' }}>{hash}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-6 space-y-3" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-sm font-semibold text-surface-300">Verify Checksum</h3>
            <input value={expected} onChange={e => setExpected(e.target.value)} placeholder="Paste expected hash to verify..."
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            {expectedNorm && (
              <div className={`flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-3 ${matchAlgo ? 'text-accent-green' : 'text-red-400'}`}
                style={matchAlgo ? { background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.2)' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {matchAlgo ? `✓ Match — ${matchAlgo[0]}` : '✗ Mismatch — hash does not match any computed checksum'}
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}
