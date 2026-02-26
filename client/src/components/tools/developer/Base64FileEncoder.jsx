import { useState } from 'react';
import { motion } from 'framer-motion';

export default function Base64FileEncoder() {
  const [tab, setTab] = useState('encode');
  const [encodeMode, setEncodeMode] = useState('file');
  const [fileInfo, setFileInfo] = useState(null);
  const [b64Output, setB64Output] = useState('');
  const [textInput, setTextInput] = useState('');
  const [decodeInput, setDecodeInput] = useState('');
  const [decodeError, setDecodeError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setB64Output(ev.target.result);
      setFileInfo({ name: file.name, size: file.size, type: file.type });
    };
    reader.readAsDataURL(file);
  };

  const encodeText = () => {
    setB64Output(btoa(unescape(encodeURIComponent(textInput))));
    setFileInfo(null);
  };

  const handleDecode = () => {
    setDecodeError('');
    try {
      const raw = decodeInput.trim();
      if (raw.startsWith('data:')) {
        const a = document.createElement('a');
        const mime = raw.split(';')[0].split(':')[1];
        const ext = mime.split('/')[1] || 'bin';
        a.href = raw;
        a.download = `decoded.${ext}`;
        a.click();
      } else {
        const decoded = decodeURIComponent(escape(atob(raw)));
        const blob = new Blob([decoded], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'decoded.txt'; a.click();
        URL.revokeObjectURL(url);
      }
    } catch { setDecodeError('Invalid Base64 string'); }
  };

  const copy = (val) => {
    navigator.clipboard.writeText(val);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const tabBtn = (t, label) => (
    <button onClick={() => setTab(t)}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`}
      style={tab === t ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
      {label}
    </button>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex gap-2">{tabBtn('encode', 'Encode → Base64')}{tabBtn('decode', 'Decode ← Base64')}</div>
        {tab === 'encode' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {['file','text'].map(m => (
                <button key={m} onClick={() => setEncodeMode(m)}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${encodeMode === m ? 'text-primary-400' : 'text-surface-400'}`}
                  style={{ background: encodeMode === m ? 'rgba(255,99,99,0.1)' : 'rgba(255,255,255,0.06)' }}>
                  {m === 'file' ? 'File' : 'Text'}
                </button>
              ))}
            </div>
            {encodeMode === 'file' ? (
              <div>
                <label className="text-sm font-medium text-surface-300 block mb-1">Select File</label>
                <input type="file" onChange={handleFile}
                  className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 text-sm"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                {fileInfo && <p className="text-xs text-surface-500 mt-1">{fileInfo.name} — {(fileInfo.size / 1024).toFixed(1)} KB — {fileInfo.type}</p>}
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-surface-300 block mb-1">Text Input</label>
                <textarea rows={4} value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="Enter text to encode..."
                  className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                <button onClick={encodeText} className="mt-2 px-4 py-2 text-white rounded-xl font-medium transition-colors text-sm" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>Encode</button>
              </div>
            )}
            {b64Output && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-surface-300">Base64 Output</label>
                  <button onClick={() => copy(b64Output)} className="text-xs px-3 py-1 rounded-lg transition-colors hover:bg-white/5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <textarea rows={6} readOnly value={b64Output}
                  className="font-mono text-sm rounded-xl p-4 text-surface-200 overflow-auto w-full break-all"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} />
              </div>
            )}
          </div>
        )}
        {tab === 'decode' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-surface-300 block mb-1">Base64 Input</label>
              <textarea rows={6} value={decodeInput} onChange={e => setDecodeInput(e.target.value)} placeholder="Paste Base64 string or data URI..."
                className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            {decodeError && <p className="text-red-400 text-sm rounded-xl px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)' }}>{decodeError}</p>}
            <button onClick={handleDecode} className="px-4 py-2 text-white rounded-xl font-medium transition-colors text-sm" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>Download Decoded File</button>
            <p className="text-xs text-surface-500">Supports data URIs (data:image/png;base64,...) and plain Base64 text</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
