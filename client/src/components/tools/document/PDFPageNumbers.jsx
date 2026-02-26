import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FileUpload from '../../common/FileUpload';

const POSITIONS = [
  { id: 'bottom-center', label: 'Bottom Center' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'bottom-right', label: 'Bottom Right' },
  { id: 'top-center', label: 'Top Center' },
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-right', label: 'Top Right' },
];

const FORMATS = [
  { id: 'plain', label: '1', example: '1, 2, 3…' },
  { id: 'page', label: 'Page 1', example: 'Page 1, Page 2…' },
  { id: 'of-n', label: '1 of N', example: '1 of 10, 2 of 10…' },
  { id: 'page-of-n', label: 'Page 1 of N', example: 'Page 1 of 10…' },
];

function formatPageNumber(format, pageNum, totalPages) {
  switch (format) {
    case 'page': return `Page ${pageNum}`;
    case 'of-n': return `${pageNum} of ${totalPages}`;
    case 'page-of-n': return `Page ${pageNum} of ${totalPages}`;
    default: return `${pageNum}`;
  }
}

function hexToRgb01(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

export default function PDFPageNumbers() {
  const [file, setFile] = useState(null);
  const [position, setPosition] = useState('bottom-center');
  const [fontSize, setFontSize] = useState(12);
  const [startNumber, setStartNumber] = useState(1);
  const [format, setFormat] = useState('plain');
  const [color, setColor] = useState('#000000');
  const [margin, setMargin] = useState(30);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const step = result ? 'done' : file ? 'configure' : 'upload';

  const handleProcess = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const totalPages = pages.length;
      const { r, g, b } = hexToRgb01(color);

      pages.forEach((page, idx) => {
        const pageNum = startNumber + idx;
        const text = formatPageNumber(format, pageNum, totalPages + startNumber - 1);
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const { width, height } = page.getSize();

        let x, y;
        // Vertical position
        if (position.startsWith('bottom')) {
          y = margin;
        } else {
          y = height - margin;
        }
        // Horizontal position
        if (position.endsWith('center')) {
          x = (width - textWidth) / 2;
        } else if (position.endsWith('left')) {
          x = margin;
        } else {
          x = width - textWidth - margin;
        }

        page.drawText(text, { x, y, size: fontSize, font, color: rgb(r, g, b) });
      });

      const savedBytes = await pdfDoc.save();
      const blob = new Blob([savedBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const outputName = file.name.replace(/\.pdf$/i, '') + '_numbered.pdf';
      setResult({ downloadUrl: blobUrl, outputName });
    } catch (e) {
      setError('Failed to add page numbers: ' + e.message);
    } finally {
      setProcessing(false);
    }
  }, [file, position, fontSize, startNumber, format, color, margin]);

  const reset = () => {
    if (result?.downloadUrl?.startsWith('blob:')) URL.revokeObjectURL(result.downloadUrl);
    setFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FileUpload onFilesSelected={(f) => setFile(f[0])} accept=".pdf,application/pdf" multiple={false} />
          </motion.div>
        )}

        {step === 'configure' && !processing && (
          <motion.div key="configure" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            {/* File info */}
            <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-lg">#</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-100 truncate">{file?.name}</p>
                <p className="text-xs text-surface-500">{(file?.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button type="button" onClick={reset} className="text-xs text-surface-400 hover:text-red-500 transition-colors">Change</button>
            </div>

            {/* Position */}
            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-2">Position</label>
              <div className="grid grid-cols-3 gap-2">
                {POSITIONS.map((p) => (
                  <button key={p.id} type="button" onClick={() => setPosition(p.id)} className={`py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${position === p.id ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`} style={position === p.id ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-2">Number format</label>
              <div className="grid grid-cols-2 gap-2">
                {FORMATS.map((f) => (
                  <button key={f.id} type="button" onClick={() => setFormat(f.id)} className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 ${format === f.id ? 'text-white' : 'text-surface-300 hover:bg-white/5'}`} style={format === f.id ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                    <span className="block">{f.label}</span>
                    <span className="block text-[10px] font-normal opacity-60 mt-0.5">{f.example}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font size */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-surface-300">Font size</label>
                <span className="text-sm font-mono font-bold text-primary-500">{fontSize}px</span>
              </div>
              <input type="range" min="10" max="24" step="1" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value, 10))} className="w-full accent-primary-500" />
            </div>

            {/* Starting number */}
            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-1">Starting number</label>
              <input type="number" min="1" value={startNumber} onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))} className="w-full px-4 py-3 rounded-xl text-sm text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>

            {/* Color & Margin row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-surface-300 mb-1">Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
                  <span className="text-xs font-mono text-surface-400">{color}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold text-surface-300">Margin</label>
                  <span className="text-sm font-mono font-bold text-primary-500">{margin}px</span>
                </div>
                <input type="range" min="10" max="80" step="5" value={margin} onChange={(e) => setMargin(parseInt(e.target.value, 10))} className="w-full accent-primary-500" />
              </div>
            </div>

            {/* Preview */}
            <div className="relative h-20 rounded-xl overflow-hidden flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-xs text-surface-400 absolute top-2 left-3">Preview</p>
              <span className="text-xs font-mono text-surface-300" style={{ color }}>
                {formatPageNumber(format, startNumber, 10)}
              </span>
            </div>

            <motion.button type="button" onClick={handleProcess} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full min-h-[52px] rounded-2xl text-base font-bold text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
              Add Page Numbers
            </motion.button>
          </motion.div>
        )}

        {processing && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 py-12">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <svg className="w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            </motion.div>
            <p className="text-sm text-surface-400">Adding page numbers…</p>
          </motion.div>
        )}

        {step === 'done' && result && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="flex flex-col items-center gap-4 p-6 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(255,99,99,0.08), rgba(16,185,129,0.08))', border: '1px solid rgba(255,99,99,0.15)' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }} className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </motion.div>
              <p className="text-sm font-semibold text-surface-100">Page numbers added!</p>
              <a href={result.downloadUrl} download={result.outputName} className="w-full flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-2xl text-sm font-semibold text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download PDF
              </a>
              <p className="text-xs text-surface-500 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                100% client-side — your PDF never left your browser
              </p>
            </div>
            <div className="text-center">
              <button type="button" onClick={reset} className="text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors">Number another PDF →</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-500 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </motion.div>
      )}
    </motion.div>
  );
}
