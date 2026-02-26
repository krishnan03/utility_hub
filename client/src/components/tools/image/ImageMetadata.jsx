import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FileUpload from '../../common/FileUpload';
import ProgressBar from '../../common/ProgressBar';

// Minimal client-side JPEG EXIF reader
function readJpegExif(buffer) {
  const view = new DataView(buffer);
  if (view.getUint16(0) !== 0xFFD8) return null; // not JPEG

  let offset = 2;
  while (offset < view.byteLength - 2) {
    const marker = view.getUint16(offset);
    if (marker === 0xFFE1) {
      // APP1 marker — check for Exif header
      const segLen = view.getUint16(offset + 2);
      const exifHeader = String.fromCharCode(
        view.getUint8(offset + 4), view.getUint8(offset + 5),
        view.getUint8(offset + 6), view.getUint8(offset + 7)
      );
      if (exifHeader === 'Exif') {
        return parseExifIFD(buffer, offset + 10, segLen - 8);
      }
    }
    if ((marker & 0xFF00) !== 0xFF00) break;
    offset += 2 + view.getUint16(offset + 2);
  }
  return null;
}

function parseExifIFD(buffer, start, _len) {
  const view = new DataView(buffer);
  const littleEndian = view.getUint16(start) === 0x4949;
  const ifdOffset = view.getUint32(start + 4, littleEndian);
  const ifdStart = start + ifdOffset;
  const entryCount = view.getUint16(ifdStart, littleEndian);

  const TAG_NAMES = {
    0x010F: 'Make', 0x0110: 'Model', 0x0112: 'Orientation',
    0x011A: 'XResolution', 0x011B: 'YResolution', 0x0128: 'ResolutionUnit',
    0x0132: 'DateTime', 0x013B: 'Artist', 0x8769: 'ExifIFD',
    0x8825: 'GPSIFD', 0x9003: 'DateTimeOriginal', 0x9004: 'DateTimeDigitized',
    0x920A: 'FocalLength', 0x9209: 'Flash', 0xA002: 'PixelXDimension',
    0xA003: 'PixelYDimension', 0x829A: 'ExposureTime', 0x829D: 'FNumber',
    0x8827: 'ISOSpeedRatings',
  };

  const result = {};
  for (let i = 0; i < entryCount; i++) {
    const entryOffset = ifdStart + 2 + i * 12;
    const tag = view.getUint16(entryOffset, littleEndian);
    const type = view.getUint16(entryOffset + 2, littleEndian);
    const count = view.getUint32(entryOffset + 4, littleEndian);
    const name = TAG_NAMES[tag];
    if (!name || name === 'ExifIFD' || name === 'GPSIFD') continue;

    try {
      if (type === 2) {
        // ASCII string
        const strOffset = count <= 4 ? entryOffset + 8 : start + view.getUint32(entryOffset + 8, littleEndian);
        let str = '';
        for (let j = 0; j < count - 1; j++) str += String.fromCharCode(view.getUint8(strOffset + j));
        result[name] = str.trim();
      } else if (type === 3) {
        result[name] = view.getUint16(entryOffset + 8, littleEndian);
      } else if (type === 4) {
        result[name] = view.getUint32(entryOffset + 8, littleEndian);
      } else if (type === 5) {
        // Rational
        const ratOffset = start + view.getUint32(entryOffset + 8, littleEndian);
        const num = view.getUint32(ratOffset, littleEndian);
        const den = view.getUint32(ratOffset + 4, littleEndian);
        result[name] = den !== 0 ? `${num}/${den}` : num;
      }
    } catch { /* skip malformed entries */ }
  }
  return result;
}

function readImageDimensions(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

function MetaRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 last:border-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span className="text-xs font-semibold text-surface-400 shrink-0 w-36">{label}</span>
      <span className="text-xs text-surface-200 text-right break-all">{String(value)}</span>
    </div>
  );
}

export default function ImageMetadata() {
  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [stripping, setStripping] = useState(false);
  const [stripResult, setStripResult] = useState(null);
  const [error, setError] = useState(null);

  const analyzeFile = useCallback(async (f) => {
    setFile(f);
    setProcessing(true);
    setMetadata(null);
    setStripResult(null);
    setError(null);

    try {
      const dims = await readImageDimensions(f);
      const base = {
        'File name': f.name,
        'File size': `${(f.size / 1024).toFixed(1)} KB (${f.size.toLocaleString()} bytes)`,
        'MIME type': f.type || 'unknown',
        'Last modified': new Date(f.lastModified).toLocaleString(),
        ...(dims ? { Width: `${dims.width}px`, Height: `${dims.height}px` } : {}),
      };

      // Try client-side EXIF for JPEG
      let exif = {};
      if (f.type === 'image/jpeg' || f.name.toLowerCase().endsWith('.jpg') || f.name.toLowerCase().endsWith('.jpeg')) {
        const buf = await f.arrayBuffer();
        const parsed = readJpegExif(buf);
        if (parsed) exif = parsed;
      }

      setMetadata({ ...base, ...exif });
    } catch (e) {
      setError('Could not read file metadata');
    } finally {
      setProcessing(false);
    }
  }, []);

  const handleFilesSelected = (files) => analyzeFile(files[0]);

  const handleStrip = async () => {
    if (!file) return;
    setStripping(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('stripMetadata', 'true');
      const res = await fetch('/api/image/metadata', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Strip failed');
      setStripResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setStripping(false);
    }
  };

  const reset = () => { setFile(null); setMetadata(null); setStripResult(null); setError(null); };

  const hasExif = metadata && Object.keys(metadata).some(k => !['File name', 'File size', 'MIME type', 'Last modified', 'Width', 'Height'].includes(k));

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <AnimatePresence mode="wait">
        {!file && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FileUpload onFilesSelected={handleFilesSelected} accept="image/*" multiple={false} />
          </motion.div>
        )}

        {processing && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8">
            <ProgressBar label="Reading metadata..." indeterminate />
          </motion.div>
        )}

        {metadata && !processing && (
          <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-lg">🔍</div>
                <div>
                  <p className="text-sm font-semibold text-surface-100 truncate max-w-[200px]">{file?.name}</p>
                  <p className="text-xs text-surface-400">{hasExif ? 'EXIF data found' : 'Basic metadata only'}</p>
                </div>
              </div>
              <button type="button" onClick={reset} className="text-xs text-surface-400 hover:text-red-500 transition-colors">Change file</button>
            </div>

            {/* Basic info */}
            <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">File Info</p>
              {['File name', 'File size', 'MIME type', 'Last modified', 'Width', 'Height'].map(k => (
                <MetaRow key={k} label={k} value={metadata[k]} />
              ))}
            </div>

            {/* EXIF data */}
            {hasExif && (
              <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">EXIF Data</p>
                {Object.entries(metadata)
                  .filter(([k]) => !['File name', 'File size', 'MIME type', 'Last modified', 'Width', 'Height'].includes(k))
                  .map(([k, v]) => <MetaRow key={k} label={k} value={v} />)}
              </div>
            )}

            {/* Strip metadata */}
            {!stripResult && (
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                <p className="text-sm font-semibold text-surface-200 mb-1">Strip metadata</p>
                <p className="text-xs text-surface-500 mb-3">Remove all EXIF data including GPS location, camera info, and timestamps before sharing.</p>
                <motion.button type="button" onClick={handleStrip} disabled={stripping} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full min-h-[44px] rounded-xl text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
                  {stripping ? 'Stripping...' : '🧹 Strip All Metadata'}
                </motion.button>
              </div>
            )}

            {stripResult && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-primary-500/5 border border-emerald-500/20">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-sm font-semibold text-surface-100">Metadata stripped!</p>
                <a href={stripResult.downloadUrl} download={stripResult.metadata?.outputName || `clean_${file?.name}`} className="w-full flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download Clean Image
                </a>
                <p className="text-xs text-surface-400 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Your data is auto-deleted in 24h
                </p>
              </motion.div>
            )}
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
