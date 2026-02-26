import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

// Pure-JS MD5 implementation
function md5(str) {
  function safeAdd(x, y) { const lsw = (x & 0xffff) + (y & 0xffff); return (((x >> 16) + (y >> 16) + (lsw >> 16)) << 16) | (lsw & 0xffff); }
  function bitRotateLeft(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)); }
  function md5cmn(q, a, b, x, s, t) { return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
  function md5ff(a,b,c,d,x,s,t){return md5cmn((b&c)|((~b)&d),a,b,x,s,t);}
  function md5gg(a,b,c,d,x,s,t){return md5cmn((b&d)|(c&(~d)),a,b,x,s,t);}
  function md5hh(a,b,c,d,x,s,t){return md5cmn(b^c^d,a,b,x,s,t);}
  function md5ii(a,b,c,d,x,s,t){return md5cmn(c^(b|(~d)),a,b,x,s,t);}
  const utf8 = unescape(encodeURIComponent(str));
  const bytes = Array.from(utf8).map(c => c.charCodeAt(0));
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const bitLen = (utf8.length * 8);
  bytes.push(bitLen & 0xff, (bitLen >> 8) & 0xff, (bitLen >> 16) & 0xff, (bitLen >> 24) & 0xff, 0, 0, 0, 0);
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  for (let i = 0; i < bytes.length; i += 64) {
    const M = [];
    for (let j = 0; j < 16; j++) M[j] = bytes[i+j*4] | (bytes[i+j*4+1]<<8) | (bytes[i+j*4+2]<<16) | (bytes[i+j*4+3]<<24);
    let [aa,bb,cc,dd] = [a,b,c,d];
    a=md5ff(a,b,c,d,M[0],7,-680876936);d=md5ff(d,a,b,c,M[1],12,-389564586);c=md5ff(c,d,a,b,M[2],17,606105819);b=md5ff(b,c,d,a,M[3],22,-1044525330);
    a=md5ff(a,b,c,d,M[4],7,-176418897);d=md5ff(d,a,b,c,M[5],12,1200080426);c=md5ff(c,d,a,b,M[6],17,-1473231341);b=md5ff(b,c,d,a,M[7],22,-45705983);
    a=md5ff(a,b,c,d,M[8],7,1770035416);d=md5ff(d,a,b,c,M[9],12,-1958414417);c=md5ff(c,d,a,b,M[10],17,-42063);b=md5ff(b,c,d,a,M[11],22,-1990404162);
    a=md5ff(a,b,c,d,M[12],7,1804603682);d=md5ff(d,a,b,c,M[13],12,-40341101);c=md5ff(c,d,a,b,M[14],17,-1502002290);b=md5ff(b,c,d,a,M[15],22,1236535329);
    a=md5gg(a,b,c,d,M[1],5,-165796510);d=md5gg(d,a,b,c,M[6],9,-1069501632);c=md5gg(c,d,a,b,M[11],14,643717713);b=md5gg(b,c,d,a,M[0],20,-373897302);
    a=md5gg(a,b,c,d,M[5],5,-701558691);d=md5gg(d,a,b,c,M[10],9,38016083);c=md5gg(c,d,a,b,M[15],14,-660478335);b=md5gg(b,c,d,a,M[4],20,-405537848);
    a=md5gg(a,b,c,d,M[9],5,568446438);d=md5gg(d,a,b,c,M[14],9,-1019803690);c=md5gg(c,d,a,b,M[3],14,-187363961);b=md5gg(b,c,d,a,M[8],20,1163531501);
    a=md5gg(a,b,c,d,M[13],5,-1444681467);d=md5gg(d,a,b,c,M[2],9,-51403784);c=md5gg(c,d,a,b,M[7],14,1735328473);b=md5gg(b,c,d,a,M[12],20,-1926607734);
    a=md5hh(a,b,c,d,M[5],4,-378558);d=md5hh(d,a,b,c,M[8],11,-2022574463);c=md5hh(c,d,a,b,M[11],16,1839030562);b=md5hh(b,c,d,a,M[14],23,-35309556);
    a=md5hh(a,b,c,d,M[1],4,-1530992060);d=md5hh(d,a,b,c,M[4],11,1272893353);c=md5hh(c,d,a,b,M[7],16,-155497632);b=md5hh(b,c,d,a,M[10],23,-1094730640);
    a=md5hh(a,b,c,d,M[13],4,681279174);d=md5hh(d,a,b,c,M[0],11,-358537222);c=md5hh(c,d,a,b,M[3],16,-722521979);b=md5hh(b,c,d,a,M[6],23,76029189);
    a=md5hh(a,b,c,d,M[9],4,-640364487);d=md5hh(d,a,b,c,M[12],11,-421815835);c=md5hh(c,d,a,b,M[15],16,530742520);b=md5hh(b,c,d,a,M[2],23,-995338651);
    a=md5ii(a,b,c,d,M[0],6,-198630844);d=md5ii(d,a,b,c,M[7],10,1126891415);c=md5ii(c,d,a,b,M[14],15,-1416354905);b=md5ii(b,c,d,a,M[5],21,-57434055);
    a=md5ii(a,b,c,d,M[12],6,1700485571);d=md5ii(d,a,b,c,M[3],10,-1894986606);c=md5ii(c,d,a,b,M[10],15,-1051523);b=md5ii(b,c,d,a,M[1],21,-2054922799);
    a=md5ii(a,b,c,d,M[8],6,1873313359);d=md5ii(d,a,b,c,M[15],10,-30611744);c=md5ii(c,d,a,b,M[6],15,-1560198380);b=md5ii(b,c,d,a,M[13],21,1309151649);
    a=md5ii(a,b,c,d,M[4],6,-145523070);d=md5ii(d,a,b,c,M[11],10,-1120210379);c=md5ii(c,d,a,b,M[2],15,718787259);b=md5ii(b,c,d,a,M[9],21,-343485551);
    a=safeAdd(a,aa);b=safeAdd(b,bb);c=safeAdd(c,cc);d=safeAdd(d,dd);
  }
  return [a,b,c,d].map(n => { let s=''; for(let i=0;i<4;i++) s+=('0'+((n>>(i*8))&0xff).toString(16)).slice(-2); return s; }).join('');
}

async function sha(algo, text) {
  const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function shaFile(algo, buffer) {
  const buf = await crypto.subtle.digest(algo, buffer);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

export default function HashGenerator() {
  const [text, setText] = useState('');
  const [hashes, setHashes] = useState(null);
  const [fileHashes, setFileHashes] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState('');
  const fileRef = useRef();

  const generate = async () => {
    if (!text) return;
    const [sha1, sha256, sha512] = await Promise.all([sha('SHA-1',text), sha('SHA-256',text), sha('SHA-512',text)]);
    setHashes({ MD5: md5(text), 'SHA-1': sha1, 'SHA-256': sha256, 'SHA-512': sha512 });
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true); setFileHashes(null); setFileName(file.name);
    const buf = await file.arrayBuffer();
    const [sha1, sha256, sha512] = await Promise.all([shaFile('SHA-1',buf), shaFile('SHA-256',buf), shaFile('SHA-512',buf)]);
    setFileHashes({ 'SHA-1': sha1, 'SHA-256': sha256, 'SHA-512': sha512 });
    setLoading(false);
    e.target.value = '';
  };

  const copy = (key, val) => { navigator.clipboard.writeText(val); setCopied(key); setTimeout(() => setCopied(''), 2000); };

  const HashRow = ({ label, value }) => (
    <div className="flex items-start gap-3 py-2 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <span className="text-xs font-semibold text-surface-400 w-16 shrink-0 pt-0.5">{label}</span>
      <span className="flex-1 font-mono text-xs text-surface-100 break-all">{value}</span>
      <button onClick={() => copy(label, value)} className="shrink-0 text-xs text-primary-400 hover:text-primary-300 transition-colors">
        {copied === label ? '✓' : 'Copy'}
      </button>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">Text Input</label>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="Enter text to hash..."
            className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none text-sm"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
        <button onClick={generate} disabled={!text} className="px-4 py-2 text-white rounded-xl font-medium transition-colors disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
          Generate Hashes
        </button>
        <p className="text-xs text-surface-500">MD5 is implemented in pure JS · SHA uses Web Crypto API · All processing is local</p>
      </div>

      {hashes && (
        <div className="rounded-2xl p-6" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 className="text-sm font-semibold text-surface-300 mb-3">Text Hashes</h3>
          {Object.entries(hashes).map(([k, v]) => <HashRow key={k} label={k} value={v} />)}
        </div>
      )}

      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="text-sm font-semibold text-surface-300">File Hash</h3>
        <div
          onClick={() => fileRef.current.click()}
          className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors group"
          style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📄</div>
          <p className="text-sm text-surface-400">{loading ? 'Computing...' : 'Click to select a file'}</p>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
        </div>
        {fileHashes && (
          <div>
            <p className="text-xs text-surface-400 mb-3 font-mono">{fileName}</p>
            {Object.entries(fileHashes).map(([k, v]) => <HashRow key={k} label={k} value={v} />)}
          </div>
        )}
      </div>
    </motion.div>
  );
}
