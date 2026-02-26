import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import FileUpload from '../../common/FileUpload';
import ProgressBar from '../../common/ProgressBar';
import useServerProcess from '../../../hooks/useServerProcess';
import useFileStore from '../../../stores/useFileStore';

const TABS = ['Crop', 'Rotate', 'Flip', 'Watermark'];
const CROP_PRESETS = [
  { label: 'Free', ratio: null },
  { label: '1:1', ratio: 1 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '16:9', ratio: 16 / 9 },
];
const WM_POS = ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
const HS = 10;
const S = {
  card: { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' },
  on: { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' },
  off: { background: 'rgba(255,255,255,0.06)' },
  input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' },
  slider: { background: 'rgba(255,255,255,0.08)', accentColor: '#FF6363' },
};
const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export default function ImageEditor() {
  const [tab, setTab] = useState('Crop');
  const [src, setSrc] = useState(null);
  const [dim, setDim] = useState({ w: 0, h: 0 });
  const [fSize, setFSize] = useState(0);
  const cvRef = useRef(null);
  const imgEl = useRef(null);
  const [sc, setSc] = useState(1);
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [ratio, setRatio] = useState(null);
  const [drag, setDrag] = useState(null);
  const dr = useRef({ mx: 0, my: 0, c: {} });
  const [rot, setRot] = useState(0);
  const [fine, setFine] = useState(0);
  const [fH, setFH] = useState(false);
  const [fV, setFV] = useState(false);
  const [wt, setWt] = useState('');
  const [ws, setWs] = useState(32);
  const [wc, setWc] = useState('#ffffff');
  const [wo, setWo] = useState(60);
  const [wp, setWp] = useState('bottom-right');
  const { files, addFiles, clearFiles } = useFileStore();
  const { process: srvProc, processing, progress, error, result } = useServerProcess('/image/edit');

  const onFiles = useCallback((sel) => {
    addFiles(sel);
    if (sel.length) { setSrc(URL.createObjectURL(sel[0])); setFSize(sel[0].size); }
  }, [addFiles]);

  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      imgEl.current = img;
      setDim({ w: img.naturalWidth, h: img.naturalHeight });
      setSc(Math.min(720, img.naturalWidth) / img.naturalWidth);
      setCrop({ x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = src;
    return () => URL.revokeObjectURL(src);
  }, [src]);

  const draw = useCallback(() => {
    const cv = cvRef.current, img = imgEl.current;
    if (!cv || !img) return;
    const ctx = cv.getContext('2d');
    const dw = Math.round(img.naturalWidth * sc), dh = Math.round(img.naturalHeight * sc);
    const rad = ((rot + fine) * Math.PI) / 180;
    const ac = Math.abs(Math.cos(rad)), as = Math.abs(Math.sin(rad));
    const cw = Math.ceil(dw * ac + dh * as), ch = Math.ceil(dw * as + dh * ac);
    cv.width = cw; cv.height = ch;
    ctx.clearRect(0, 0, cw, ch);
    ctx.save(); ctx.translate(cw / 2, ch / 2); ctx.rotate(rad);
    ctx.scale(fH ? -1 : 1, fV ? -1 : 1);
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh); ctx.restore();

    if (tab === 'Crop') {
      const ox = (cw - dw) / 2, oy = (ch - dh) / 2;
      const cx = crop.x * sc + ox, cy = crop.y * sc + oy;
      const cropW = crop.w * sc, cropH = crop.h * sc;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, cw, cy);
      ctx.fillRect(0, cy, cx, cropH);
      ctx.fillRect(cx + cropW, cy, cw - cx - cropW, cropH);
      ctx.fillRect(0, cy + cropH, cw, ch - cy - cropH);
      ctx.strokeStyle = '#FF6363'; ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, cropW, cropH);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(cx + (cropW * i) / 3, cy);
        ctx.lineTo(cx + (cropW * i) / 3, cy + cropH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy + (cropH * i) / 3);
        ctx.lineTo(cx + cropW, cy + (cropH * i) / 3); ctx.stroke();
      }
      ctx.fillStyle = '#fff';
      [[cx, cy], [cx + cropW / 2, cy], [cx + cropW, cy],
       [cx, cy + cropH / 2], [cx + cropW, cy + cropH / 2],
       [cx, cy + cropH], [cx + cropW / 2, cy + cropH], [cx + cropW, cy + cropH],
      ].forEach(([hx, hy]) => ctx.fillRect(hx - HS / 2, hy - HS / 2, HS, HS));
      const lbl = `${Math.round(crop.w)} \u00d7 ${Math.round(crop.h)}`;
      ctx.font = '12px Inter, system-ui, sans-serif';
      const tw = ctx.measureText(lbl).width;
      const lx = cx + cropW / 2 - tw / 2 - 6, ly = cy + cropH + 8;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(lx, ly, tw + 12, 20);
      ctx.fillStyle = '#fff'; ctx.fillText(lbl, lx + 6, ly + 14);
    }
    if (tab === 'Watermark' && wt) {
      ctx.save(); ctx.globalAlpha = wo / 100; ctx.fillStyle = wc;
      ctx.font = `${Math.round(ws * sc)}px Inter, system-ui, sans-serif`;
      const m = ctx.measureText(wt), pad = 20 * sc;
      let tx, ty;
      switch (wp) {
        case 'center': tx = cw / 2 - m.width / 2; ty = ch / 2; break;
        case 'top-left': tx = pad; ty = pad + ws * sc; break;
        case 'top-right': tx = cw - m.width - pad; ty = pad + ws * sc; break;
        case 'bottom-left': tx = pad; ty = ch - pad; break;
        default: tx = cw - m.width - pad; ty = ch - pad;
      }
      ctx.fillText(wt, tx, ty); ctx.restore();
    }
  }, [sc, rot, fine, fH, fV, crop, tab, wt, ws, wc, wo, wp]);

  useEffect(() => { draw(); }, [draw]);

  const cPos = useCallback((e) => {
    const r = cvRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }, []);

  const hit = useCallback((mx, my) => {
    const img = imgEl.current; if (!img) return null;
    const cv = cvRef.current;
    const dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
    const ox = (cv.width - dw) / 2, oy = (cv.height - dh) / 2;
    const cx = crop.x * sc + ox, cy = crop.y * sc + oy;
    const cw = crop.w * sc, ch = crop.h * sc, z = HS + 4;
    const pts = [
      { id: 'nw', x: cx, y: cy }, { id: 'n', x: cx + cw / 2, y: cy },
      { id: 'ne', x: cx + cw, y: cy }, { id: 'w', x: cx, y: cy + ch / 2 },
      { id: 'e', x: cx + cw, y: cy + ch / 2 }, { id: 'sw', x: cx, y: cy + ch },
      { id: 's', x: cx + cw / 2, y: cy + ch }, { id: 'se', x: cx + cw, y: cy + ch },
    ];
    for (const p of pts) if (Math.abs(mx - p.x) < z && Math.abs(my - p.y) < z) return p.id;
    if (mx > cx && mx < cx + cw && my > cy && my < cy + ch) return 'move';
    return 'new';
  }, [crop, sc]);

  const onDown = useCallback((e) => {
    if (tab !== 'Crop') return;
    const p = cPos(e), h = hit(p.x, p.y);
    setDrag(h); dr.current = { mx: p.x, my: p.y, c: { ...crop } };
    cvRef.current?.setPointerCapture(e.pointerId);
  }, [tab, cPos, hit, crop]);

  const onMove = useCallback((e) => {
    if (!drag || tab !== 'Crop') return;
    const img = imgEl.current; if (!img) return;
    const p = cPos(e);
    const dx = (p.x - dr.current.mx) / sc, dy = (p.y - dr.current.my) / sc;
    const pr = dr.current.c, mW = img.naturalWidth, mH = img.naturalHeight;
    let nx = pr.x, ny = pr.y, nw = pr.w, nh = pr.h;
    if (drag === 'move') {
      nx = cl(pr.x + dx, 0, mW - pr.w); ny = cl(pr.y + dy, 0, mH - pr.h);
    } else if (drag === 'new') {
      const cv = cvRef.current;
      const dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
      const ox = (cv.width - dw) / 2, oy = (cv.height - dh) / 2;
      const sx = cl((dr.current.mx - ox) / sc, 0, mW), sy = cl((dr.current.my - oy) / sc, 0, mH);
      const ex = cl((p.x - ox) / sc, 0, mW), ey = cl((p.y - oy) / sc, 0, mH);
      nx = Math.min(sx, ex); ny = Math.min(sy, ey);
      nw = Math.abs(ex - sx); nh = Math.abs(ey - sy);
    } else {
      if (drag.includes('w')) { nx = cl(pr.x + dx, 0, pr.x + pr.w - 20); nw = pr.w - (nx - pr.x); }
      if (drag.includes('e')) nw = cl(pr.w + dx, 20, mW - pr.x);
      if (drag.includes('n')) { ny = cl(pr.y + dy, 0, pr.y + pr.h - 20); nh = pr.h - (ny - pr.y); }
      if (drag.includes('s')) nh = cl(pr.h + dy, 20, mH - pr.y);
    }
    if (ratio && drag !== 'move') {
      nh = nw / ratio;
      if (ny + nh > mH) { nh = mH - ny; nw = nh * ratio; }
      if (nx + nw > mW) { nw = mW - nx; nh = nw / ratio; }
    }
    setCrop({ x: Math.round(nx), y: Math.round(ny), w: Math.max(10, Math.round(nw)), h: Math.max(10, Math.round(nh)) });
  }, [drag, tab, cPos, sc, ratio]);

  const onUp = useCallback((e) => {
    setDrag(null); cvRef.current?.releasePointerCapture(e.pointerId);
  }, []);

  const preset = useCallback((r) => {
    setRatio(r);
    if (r && imgEl.current) {
      const { naturalWidth: w, naturalHeight: h } = imgEl.current;
      let cw = w, ch = w / r;
      if (ch > h) { ch = h; cw = h * r; }
      setCrop({ x: Math.round((w - cw) / 2), y: Math.round((h - ch) / 2), w: Math.round(cw), h: Math.round(ch) });
    }
  }, []);

  const ops = () => ({
    type: tab.toLowerCase(),
    ...(tab === 'Crop' && { cropX: crop.x, cropY: crop.y, cropWidth: crop.w, cropHeight: crop.h }),
    ...(tab === 'Rotate' && { angle: rot + fine }),
    ...(tab === 'Flip' && { horizontal: fH, vertical: fV }),
    ...(tab === 'Watermark' && { text: wt, fontSize: ws, color: wc, opacity: wo, position: wp }),
  });

  const dl = useCallback(() => {
    const cv = cvRef.current; if (!cv) return;
    const a = document.createElement('a');
    a.download = 'edited-image.png'; a.href = cv.toDataURL('image/png'); a.click();
  }, []);

  const srv = async () => { if (files.length) await srvProc(files, ops()); };

  const reset = () => {
    setRot(0); setFine(0); setFH(false); setFV(false);
    setWt(''); setWs(32); setWo(60); setWp('bottom-right'); setRatio(null);
    if (imgEl.current) {
      const { naturalWidth: w, naturalHeight: h } = imgEl.current;
      setCrop({ x: 0, y: 0, w, h });
    }
  };

  const fresh = () => { clearFiles(); setSrc(null); reset(); useFileStore.getState().setResult(null); };
  const fmt = (b) => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;

  if (result) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="rounded-2xl p-6 text-center" style={S.card}>
          <div className="text-3xl mb-2">{'\u2705'}</div>
          <p className="text-sm text-surface-200 font-medium">Image processed on server</p>
          {result.downloadUrl && (
            <a href={result.downloadUrl} download className="inline-block mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold text-white" style={S.on}>
              Download Result
            </a>
          )}
        </div>
        <button type="button" onClick={fresh} className="text-sm text-primary-400 hover:underline">Edit another image</button>
      </motion.div>
    );
  }

  if (!src || !files.length) return <FileUpload onFilesSelected={onFiles} accept="image/*" />;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between px-4 py-2 rounded-xl" style={S.card}>
        <span className="text-xs text-surface-400 font-mono">{dim.w} {'\u00d7'} {dim.h}px</span>
        <span className="text-xs text-surface-400 font-mono">{fmt(fSize)}</span>
      </div>

      <div className="rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: '#1c1c1e', minHeight: 300 }}>
        <canvas ref={cvRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
          className="max-w-full" style={{ cursor: tab === 'Crop' ? 'crosshair' : 'default', touchAction: 'none' }} />
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className="flex-1 min-h-[44px] px-3 py-2 rounded-lg text-sm font-semibold transition-all"
            style={tab === t ? S.on : S.off}>
            <span style={{ color: tab === t ? '#fff' : 'rgba(255,255,255,0.5)' }}>{t}</span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl p-5 space-y-4" style={S.card}>
        {tab === 'Crop' && (<>
          <label className="text-xs text-surface-400 font-medium">Aspect Ratio</label>
          <div className="flex gap-2">
            {CROP_PRESETS.map((p) => (
              <button key={p.label} type="button" onClick={() => preset(p.ratio)}
                className="flex-1 min-h-[44px] rounded-xl text-xs font-semibold transition-all"
                style={ratio === p.ratio ? S.on : S.off}>
                <span style={{ color: ratio === p.ratio ? '#fff' : 'rgba(255,255,255,0.5)' }}>{p.label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-surface-500">Click and drag on the image to adjust the crop. Drag handles to resize.</p>
        </>)}

        {tab === 'Rotate' && (<>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-surface-400 font-medium">Rotation</label>
              <span className="text-xs font-mono text-primary-400">{rot}{'\u00b0'}</span>
            </div>
            <input type="range" min={-180} max={180} value={rot} onChange={(e) => setRot(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none" style={S.slider} />
          </div>
          <div className="flex gap-2">
            {[{ l: '90\u00b0 CW', v: 90 }, { l: '90\u00b0 CCW', v: -90 }, { l: '180\u00b0', v: 180 }].map((b) => (
              <button key={b.l} type="button" onClick={() => setRot(b.v)}
                className="flex-1 min-h-[44px] rounded-xl text-xs font-semibold" style={S.off}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>{b.l}</span>
              </button>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-surface-400 font-medium">Straighten</label>
              <span className="text-xs font-mono text-primary-400">{fine}{'\u00b0'}</span>
            </div>
            <input type="range" min={-15} max={15} step={0.5} value={fine} onChange={(e) => setFine(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none" style={{ ...S.slider, accentColor: '#FF9F43' }} />
          </div>
        </>)}

        {tab === 'Flip' && (
          <div className="flex gap-3">
            <button type="button" onClick={() => setFH((v) => !v)}
              className="flex-1 min-h-[44px] rounded-xl text-sm font-semibold transition-all" style={fH ? S.on : S.off}>
              <span style={{ color: fH ? '#fff' : 'rgba(255,255,255,0.5)' }}>{'\u2194'} Horizontal</span>
            </button>
            <button type="button" onClick={() => setFV((v) => !v)}
              className="flex-1 min-h-[44px] rounded-xl text-sm font-semibold transition-all" style={fV ? S.on : S.off}>
              <span style={{ color: fV ? '#fff' : 'rgba(255,255,255,0.5)' }}>{'\u2195'} Vertical</span>
            </button>
          </div>
        )}

        {tab === 'Watermark' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-surface-400 font-medium block mb-1.5">Text</label>
              <input type="text" value={wt} onChange={(e) => setWt(e.target.value)} placeholder="Your watermark..."
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white min-h-[44px]" style={S.input} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-surface-400 block mb-1">Size</label>
                <input type="number" min={8} max={200} value={ws} onChange={(e) => setWs(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-sm text-white min-h-[44px]" style={S.input} />
              </div>
              <div>
                <label className="text-xs text-surface-400 block mb-1">Color</label>
                <input type="color" value={wc} onChange={(e) => setWc(e.target.value)}
                  className="w-full h-[44px] rounded-xl cursor-pointer" style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>
              <div>
                <label className="text-xs text-surface-400 block mb-1">Opacity</label>
                <div className="flex items-center gap-2">
                  <input type="range" min={1} max={100} value={wo} onChange={(e) => setWo(Number(e.target.value))}
                    className="flex-1 h-2 rounded-full appearance-none" style={S.slider} />
                  <span className="text-xs font-mono text-surface-400 w-8 text-right">{wo}%</span>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs text-surface-400 block mb-1.5">Position</label>
              <div className="flex flex-wrap gap-2">
                {WM_POS.map((pos) => (
                  <button key={pos} type="button" onClick={() => setWp(pos)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={wp === pos ? S.on : S.off}>
                    <span style={{ color: wp === pos ? '#fff' : 'rgba(255,255,255,0.5)' }}>{pos.replace(/-/g, ' ')}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={reset} className="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold transition-all" style={S.off}>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Reset</span>
        </button>
        <button type="button" onClick={dl} className="flex-1 min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all" style={S.on}>
          Download PNG
        </button>
        <button type="button" onClick={srv} disabled={processing}
          className="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>
          {processing ? 'Processing\u2026' : 'Server HQ'}
        </button>
      </div>
      {processing && <ProgressBar progress={progress} label="Processing on server\u2026" />}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </motion.div>
  );
}
