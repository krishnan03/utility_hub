import { useState } from 'react';
import { motion } from 'framer-motion';

function uuidv4() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export default function UUIDGenerator() {
  const [uuids, setUuids] = useState([]);
  const [count, setCount] = useState(5);
  const [copied, setCopied] = useState('');

  const generate = () => setUuids(Array.from({ length: Math.min(Math.max(count, 1), 100) }, uuidv4));

  const copy = (val, key) => { navigator.clipboard.writeText(val); setCopied(key); setTimeout(() => setCopied(''), 2000); };
  const copyAll = () => copy(uuids.join('\n'), 'all');

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-sm font-medium text-surface-300 mb-1">Count (1–100)</label>
            <input type="number" min={1} max={100} value={count} onChange={e => setCount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <button onClick={generate} className="px-4 py-2 text-white rounded-xl font-medium transition-colors" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
            Generate UUID v4
          </button>
        </div>

        <div className="rounded-xl p-4 text-sm text-primary-300 space-y-1" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.2)' }}>
          <div className="font-semibold">UUID v4 Format</div>
          <div className="font-mono text-xs">xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx</div>
          <div className="text-xs opacity-80">128-bit random identifier · 5.3×10³⁶ possible values · RFC 4122 compliant</div>
        </div>
      </div>

      {uuids.length > 0 && (
        <div className="rounded-2xl p-6 space-y-3" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-surface-300">{uuids.length} UUID{uuids.length > 1 ? 's' : ''}</span>
            <button onClick={copyAll} className="px-3 py-1.5 text-sm text-white rounded-xl font-medium transition-colors" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
              {copied === 'all' ? '✓ Copied All' : 'Copy All'}
            </button>
          </div>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {uuids.map((u, i) => (
              <div key={u} className="flex items-center gap-3 rounded-xl px-4 py-2.5 group" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <span className="text-xs text-surface-500 w-5 shrink-0">{i + 1}</span>
                <span className="flex-1 font-mono text-sm text-surface-100">{u}</span>
                <button onClick={() => copy(u, u)} className="text-xs text-primary-400 hover:text-primary-300 opacity-0 group-hover:opacity-100 transition-opacity">
                  {copied === u ? '✓' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
