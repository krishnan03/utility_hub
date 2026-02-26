import { useState } from 'react';
import { motion } from 'framer-motion';

const PRESETS = [
  { label: '644', desc: 'rw-r--r--' },
  { label: '755', desc: 'rwxr-xr-x' },
  { label: '777', desc: 'rwxrwxrwx' },
  { label: '600', desc: 'rw-------' },
  { label: '400', desc: 'r--------' },
];

const ENTITIES = ['owner', 'group', 'others'];
const PERMS = ['read', 'write', 'execute'];
const PERM_CHARS = { read: 'r', write: 'w', execute: 'x' };
const PERM_VALS = { read: 4, write: 2, execute: 1 };

function bitsToOctal(bits) {
  return ENTITIES.map(e => PERMS.reduce((acc, p) => acc + (bits[e][p] ? PERM_VALS[p] : 0), 0)).join('');
}

function bitsToSymbolic(bits) {
  return ENTITIES.map(e => PERMS.map(p => bits[e][p] ? PERM_CHARS[p] : '-').join('')).join('');
}

function octalToBits(oct) {
  const digits = oct.split('').map(Number);
  const bits = {};
  ENTITIES.forEach((e, i) => {
    const d = digits[i] || 0;
    bits[e] = { read: !!(d & 4), write: !!(d & 2), execute: !!(d & 1) };
  });
  return bits;
}

const defaultBits = () => ({ owner: { read: true, write: true, execute: false }, group: { read: true, write: false, execute: false }, others: { read: true, write: false, execute: false } });

export default function ChmodCalculator() {
  const [bits, setBits] = useState(defaultBits());
  const [octalInput, setOctalInput] = useState('644');

  const toggle = (entity, perm) => {
    setBits(prev => {
      const next = { ...prev, [entity]: { ...prev[entity], [perm]: !prev[entity][perm] } };
      setOctalInput(bitsToOctal(next));
      return next;
    });
  };

  const handleOctal = (val) => {
    setOctalInput(val);
    if (/^[0-7]{3}$/.test(val)) setBits(octalToBits(val));
  };

  const applyPreset = (oct) => { setOctalInput(oct); setBits(octalToBits(oct)); };

  const octal = bitsToOctal(bits);
  const symbolic = bitsToSymbolic(bits);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p.label)}
              className="px-3 py-1 text-xs hover:bg-white/5 rounded-lg transition-colors font-mono text-surface-300"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              {p.label} <span className="text-surface-500">({p.desc})</span>
            </button>
          ))}
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-surface-400">
                <th className="text-left py-2 pr-4 font-medium">Entity</th>
                {PERMS.map(p => <th key={p} className="py-2 px-4 font-medium capitalize">{p}</th>)}
                <th className="py-2 pl-4 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {ENTITIES.map(e => (
                <tr key={e} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <td className="py-3 pr-4 font-medium text-surface-300 capitalize">{e}</td>
                  {PERMS.map(p => (
                    <td key={p} className="py-3 px-4 text-center">
                      <input type="checkbox" checked={bits[e][p]} onChange={() => toggle(e, p)}
                        className="w-5 h-5 rounded cursor-pointer accent-primary-500" />
                    </td>
                  ))}
                  <td className="py-3 pl-4 font-mono text-primary-400 font-bold text-center">
                    {PERMS.reduce((acc, p) => acc + (bits[e][p] ? PERM_VALS[p] : 0), 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-xs text-surface-500 mb-1">Octal</div>
            <input value={octalInput} onChange={e => handleOctal(e.target.value)}
              className="font-mono text-2xl font-bold text-primary-400 bg-transparent text-center w-full focus:outline-none" maxLength={3} />
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-xs text-surface-500 mb-1">Symbolic</div>
            <div className="font-mono text-xl font-bold text-surface-300">{symbolic}</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-xs text-surface-500 mb-1">Command</div>
            <div className="font-mono text-sm font-bold text-green-600 dark:text-green-400">chmod {octal} file</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
