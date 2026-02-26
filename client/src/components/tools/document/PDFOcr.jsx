import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FileUpload from '../../common/FileUpload';
import ProgressBar from '../../common/ProgressBar';

const LANGUAGES = [
  { value: 'eng', label: 'English' },
  { value: 'spa', label: 'Spanish' },
  { value: 'fra', label: 'French' },
  { value: 'deu', label: 'German' },
  { value: 'por', label: 'Portuguese' },
  { value: 'chi_sim', label: 'Chinese (Simplified)' },
  { value: 'jpn', label: 'Japanese' },
  { value: 'kor', label: 'Korean' },
  { value: 'hin', label: 'Hindi' },
  { value: 'ara', label: 'Arabic' },
];

function formatSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Render a single PDF page to a PNG blob using pdf.js (client-side).
 */
async function renderPageToBlob(pdfDoc, pageNum, scale = 2) {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/**
 * Send a page image to the server OCR endpoint and get text back.
 */
async function ocrPageImage(blob, language, pageNum) {
  const fd = new FormData();
  fd.append('file', blob, `page-${pageNum}.png`);
  fd.append('language', language);
  const res = await fetch('/api/ocr/extract', { method: 'POST', body: fd, credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'OCR failed');
  return { text: data.metadata?.text || '', confidence: data.metadata?.confidence || 0 };
}

export default function PDFOcr() {
  const [file, setFile] = useState(null);
  const [language, setLanguage] = useState('eng');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: '' });
  const [pageTexts, setPageTexts] = useState([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [activePage, setActivePage] = useState(0);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef(false);

  const step = done ? 'done' : file ? 'configure' : 'upload';

  const handleFilesSelected = useCallback((files) => {
    const pdf = Array.from(files).find((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (pdf) { setFile(pdf); setError(null); setDone(false); setPageTexts([]); }
  }, []);

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    setPageTexts([]);
    setDone(false);
    abortRef.current = false;

    try {
      // 1. Load PDF with pdf.js on the client
      setProgress({ current: 0, total: 0, label: 'Loading PDF...' });
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdfDoc.numPages;

      setProgress({ current: 0, total: totalPages, label: `Rendering page 1 of ${totalPages}...` });

      const results = [];

      // 2. For each page: render to canvas → blob → send to OCR endpoint
      for (let i = 1; i <= totalPages; i++) {
        if (abortRef.current) break;

        setProgress({ current: i, total: totalPages, label: `Processing page ${i} of ${totalPages}...` });

        // Render page to PNG blob using pdf.js
        const blob = await renderPageToBlob(pdfDoc, i, 2);

        // Send to server OCR endpoint
        const result = await ocrPageImage(blob, language, i);
        results.push({ page: i, text: result.text.trim(), confidence: result.confidence });

        // Update results incrementally so user sees progress
        setPageTexts([...results]);
      }

      setDone(true);
      setActivePage(0);
    } catch (e) {
      setError(e.message || 'OCR processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const fullText = pageTexts.map((p) => `--- Page ${p.page} ---\n${p.text}`).join('\n\n');
  const avgConfidence = pageTexts.length > 0
    ? Math.round(pageTexts.reduce((sum, p) => sum + p.confidence, 0) / pageTexts.length)
    : 0;

  const handleCopyAll = async () => {
    if (!fullText) return;
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name?.replace('.pdf', '') || 'ocr'}-text.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFile(null);
    setDone(false);
    setPageTexts([]);
    setError(null);
    setActivePage(0);
    abortRef.current = true;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FileUpload onFilesSelected={handleFilesSelected} accept=".pdf,application/pdf" multiple={false} />
          </motion.div>
        )}

        {step === 'configure' && !processing && (
          <motion.div key="configure" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-lg">📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-200 truncate">{file.name}</p>
                <p className="text-xs text-surface-500">{formatSize(file.size)}</p>
              </div>
              <button type="button" onClick={reset} className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-500/10 transition-all text-sm">×</button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-3">OCR Language</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LANGUAGES.map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => setLanguage(value)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] ${language === value ? 'border-primary-500/50 bg-primary-500/10 text-primary-400' : 'text-surface-300 hover:border-primary-500/30'}`}
                    style={language !== value ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' } : { border: '1px solid rgba(255,99,99,0.3)' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl text-xs text-surface-400" style={{ background: 'rgba(255,255,255,0.03)' }}>
              💡 Each PDF page is rendered as an image in your browser, then sent to our OCR engine. Works great for scanned documents.
            </div>

            <motion.button type="button" onClick={handleProcess} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="w-full min-h-[52px] rounded-2xl text-base font-bold text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
              🔍 Extract Text with OCR
            </motion.button>
          </motion.div>
        )}

        {processing && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 py-4">
            <ProgressBar
              progress={progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}
              label={progress.label}
              indeterminate={progress.total === 0}
            />
            {pageTexts.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {pageTexts.map((p) => (
                  <div key={p.page} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <span className="text-emerald-400">✅</span>
                    <span className="text-surface-300">Page {p.page}</span>
                    <span className={`ml-auto font-mono ${p.confidence >= 80 ? 'text-emerald-400' : p.confidence >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{p.confidence}%</span>
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={() => { abortRef.current = true; }} className="text-xs text-surface-500 hover:text-red-400 transition-colors">Cancel</button>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5">
            <div className="flex flex-col items-center gap-3 p-5 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(255,99,99,0.08), rgba(16,185,129,0.08))', border: '1px solid rgba(255,99,99,0.15)' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }} className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </motion.div>
              <p className="text-sm font-semibold text-surface-100">OCR Complete — {pageTexts.length} page{pageTexts.length !== 1 ? 's' : ''} processed</p>
              <div className="flex gap-3 w-full">
                <div className="flex-1 p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-xs text-surface-400 mb-1">Pages</p>
                  <p className="text-sm font-bold text-surface-100 font-mono">{pageTexts.length}</p>
                </div>
                <div className="flex-1 p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-xs text-surface-400 mb-1">Confidence</p>
                  <p className={`text-sm font-bold font-mono ${avgConfidence >= 80 ? 'text-emerald-500' : avgConfidence >= 50 ? 'text-yellow-500' : 'text-red-400'}`}>{avgConfidence}%</p>
                </div>
                <div className="flex-1 p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-xs text-surface-400 mb-1">Characters</p>
                  <p className="text-sm font-bold text-surface-100 font-mono">{fullText.length.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {pageTexts.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {pageTexts.map((p, i) => (
                  <button key={i} type="button" onClick={() => setActivePage(i)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all min-h-[36px] ${activePage === i ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'text-surface-400 hover:text-surface-200'}`}
                    style={activePage !== i ? { background: 'rgba(255,255,255,0.06)' } : undefined}>
                    Page {p.page}
                    <span className={`ml-1.5 text-[10px] ${p.confidence >= 80 ? 'text-emerald-500' : p.confidence >= 50 ? 'text-yellow-500' : 'text-red-400'}`}>{p.confidence}%</span>
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <pre className="p-4 text-sm text-surface-200 font-mono whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed">
                {pageTexts[activePage]?.text || '[No text extracted on this page]'}
              </pre>
            </div>

            <div className="flex gap-3">
              <motion.button type="button" onClick={handleCopyAll} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="flex-1 flex items-center justify-center gap-2 min-h-[48px] px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {copied ? '✅ Copied!' : '📋 Copy All Text'}
              </motion.button>
              <motion.button type="button" onClick={handleDownloadTxt} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="flex-1 flex items-center justify-center gap-2 min-h-[48px] px-4 py-3 rounded-2xl text-sm font-bold text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
                ⬇️ Download TXT
              </motion.button>
            </div>

            <p className="text-xs text-surface-400 flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Your data is auto-deleted in 24h
            </p>
            <div className="text-center">
              <button type="button" onClick={reset} className="text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors">Process another PDF →</button>
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
