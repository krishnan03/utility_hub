import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function GlassCard({ children, className = '', ...props }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: 'rgba(44,44,46,0.8)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
      {...props}
    >
      {children}
    </div>
  );
}

const FIELD_ICONS = {
  text: '✏️',
  checkbox: '☑️',
  dropdown: '📋',
  radio: '🔘',
  unknown: '❓',
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PDFFormFiller() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fields, setFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [flatten, setFlatten] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const pdfBytesRef = useRef(null);

  // ─── Load & detect fields ────────────────────────────────────────────────

  const processPDF = useCallback(async (pdfBytes, name) => {
    setLoading(true);
    setError(null);
    setFields([]);
    setFieldValues({});
    setDownloadDone(false);
    pdfBytesRef.current = pdfBytes;

    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      let form;
      try {
        form = pdfDoc.getForm();
      } catch {
        setError('This PDF does not contain any interactive form fields.');
        setLoading(false);
        return;
      }

      const rawFields = form.getFields();
      if (rawFields.length === 0) {
        setError('This PDF does not contain any interactive form fields.');
        setLoading(false);
        return;
      }

      const detected = rawFields.map((field) => {
        const type = field.constructor.name;
        const name = field.getName();

        if (type === 'PDFTextField') {
          const val = field.getText() || '';
          return { name, type: 'text', value: val, multiline: field.isMultiline?.() || false };
        }
        if (type === 'PDFCheckBox') {
          return { name, type: 'checkbox', value: field.isChecked() };
        }
        if (type === 'PDFDropdown') {
          return { name, type: 'dropdown', value: field.getSelected()?.[0] || '', options: field.getOptions() };
        }
        if (type === 'PDFRadioGroup') {
          return { name, type: 'radio', value: field.getSelected(), options: field.getOptions() };
        }
        return { name, type: 'unknown', value: '' };
      });

      const initialValues = {};
      detected.forEach((f) => {
        initialValues[f.name] = f.value;
      });

      setFields(detected);
      setFieldValues(initialValues);
      setFile(true);
      setFileName(name);
    } catch (e) {
      setError(`Failed to parse PDF: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── File handling ───────────────────────────────────────────────────────

  const handleFile = useCallback(async (f) => {
    if (!f || f.type !== 'application/pdf') {
      setError('Please upload a valid PDF file.');
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum size is 50 MB.');
      return;
    }
    const bytes = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result));
      reader.onerror = reject;
      reader.readAsArrayBuffer(f);
    });
    await processPDF(bytes, f.name);
  }, [processPDF]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleInputChange = useCallback((e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  // ─── Field value updates ─────────────────────────────────────────────────

  const updateField = useCallback((name, value) => {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
    setDownloadDone(false);
  }, []);

  // ─── Fill & Download ─────────────────────────────────────────────────────

  const handleDownload = useCallback(async () => {
    if (!pdfBytesRef.current) return;
    setDownloading(true);
    setError(null);

    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.load(pdfBytesRef.current, { ignoreEncryption: true });
      const form = pdfDoc.getForm();

      for (const [name, value] of Object.entries(fieldValues)) {
        try {
          const field = form.getField(name);
          const type = field.constructor.name;

          if (type === 'PDFTextField') field.setText(String(value || ''));
          else if (type === 'PDFCheckBox') { value ? field.check() : field.uncheck(); }
          else if (type === 'PDFDropdown') field.select(value);
          else if (type === 'PDFRadioGroup') field.select(value);
        } catch { /* skip unfillable fields */ }
      }

      if (flatten) {
        form.flatten();
      }

      const filledBytes = await pdfDoc.save();
      const blob = new Blob([filledBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.replace(/\.pdf$/i, '') + '_filled.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadDone(true);
    } catch (e) {
      setError(`Failed to fill PDF: ${e.message}`);
    } finally {
      setDownloading(false);
    }
  }, [fieldValues, flatten, fileName]);

  // ─── Reset ───────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setFile(null);
    setFileName('');
    setFields([]);
    setFieldValues({});
    setError(null);
    setDownloadDone(false);
    pdfBytesRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ─── Field counts ────────────────────────────────────────────────────────

  const fieldCounts = fields.reduce((acc, f) => {
    acc[f.type] = (acc[f.type] || 0) + 1;
    return acc;
  }, {});

  const filledCount = Object.entries(fieldValues).filter(([, v]) => {
    if (typeof v === 'boolean') return true;
    return v !== '' && v != null;
  }).length;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">

      {/* ── Step 1: Upload ─────────────────────────────────────────────── */}
      {!file && (
        <div>
          <label className="block text-sm font-semibold text-surface-300 mb-3">Upload PDF with form fields</label>
          <motion.div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.995 }}
            className={`relative flex flex-col items-center justify-center min-h-[200px] rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 ${
              dragOver
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-surface-600 hover:border-surface-500 bg-white/[0.02] hover:bg-white/[0.04]'
            }`}
          >
            <motion.span
              className="text-5xl mb-3"
              animate={dragOver ? { y: -8, scale: 1.15 } : { y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              aria-hidden="true"
            >
              📝
            </motion.span>
            <p className="text-surface-300 font-semibold mb-1">
              {dragOver ? 'Drop your PDF here' : 'Drag & drop a PDF with form fields'}
            </p>
            <p className="text-surface-500 text-sm">or click to browse · Max 50 MB</p>
            {dragOver && (
              <motion.div
                className="absolute inset-0 rounded-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ background: 'radial-gradient(circle, rgba(255,99,99,0.08) 0%, transparent 70%)' }}
              />
            )}
          </motion.div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleInputChange}
            className="hidden"
            aria-label="Upload PDF file"
          />
        </div>
      )}

      {/* ── Loading ────────────────────────────────────────────────────── */}
      {loading && (
        <GlassCard className="p-6 flex items-center justify-center gap-3">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="text-2xl"
          >
            ⏳
          </motion.span>
          <span className="text-surface-300 font-semibold">Detecting form fields…</span>
        </GlassCard>
      )}

      {/* ── Error ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            ⚠️ {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Step 2: Configure — Form Fields ────────────────────────────── */}
      {file && fields.length > 0 && (
        <>
          {/* Summary bar */}
          <GlassCard className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">📄</span>
                <div>
                  <p className="text-sm font-semibold text-surface-200 truncate max-w-[250px]">{fileName}</p>
                  <p className="text-xs text-surface-500">{fields.length} field{fields.length !== 1 ? 's' : ''} detected · {filledCount} filled</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(fieldCounts).map(([type, count]) => (
                  <span key={type} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-surface-400"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                    {FIELD_ICONS[type] || '❓'} {count} {type}
                  </span>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Field list */}
          <div className="space-y-3">
            {fields.map((field, idx) => (
              <motion.div
                key={field.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.2 }}
              >
                <GlassCard className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base" aria-hidden="true">{FIELD_ICONS[field.type]}</span>
                    <label className="text-sm font-semibold text-surface-200 break-all" htmlFor={`field-${idx}`}>
                      {field.name}
                    </label>
                    <span className="ml-auto text-[10px] uppercase font-bold text-surface-600 tracking-wider">{field.type}</span>
                  </div>

                  {/* Text field */}
                  {field.type === 'text' && (
                    field.multiline ? (
                      <textarea
                        id={`field-${idx}`}
                        value={fieldValues[field.name] || ''}
                        onChange={(e) => updateField(field.name, e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-surface-100 placeholder-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                        placeholder={`Enter ${field.name}`}
                      />
                    ) : (
                      <input
                        id={`field-${idx}`}
                        type="text"
                        value={fieldValues[field.name] || ''}
                        onChange={(e) => updateField(field.name, e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-surface-100 placeholder-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                        placeholder={`Enter ${field.name}`}
                      />
                    )
                  )}

                  {/* Checkbox */}
                  {field.type === 'checkbox' && (
                    <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                      <input
                        id={`field-${idx}`}
                        type="checkbox"
                        checked={!!fieldValues[field.name]}
                        onChange={(e) => updateField(field.name, e.target.checked)}
                        className="w-5 h-5 rounded accent-primary-500"
                      />
                      <span className="text-sm text-surface-400">{fieldValues[field.name] ? 'Checked' : 'Unchecked'}</span>
                    </label>
                  )}

                  {/* Dropdown */}
                  {field.type === 'dropdown' && (
                    <select
                      id={`field-${idx}`}
                      value={fieldValues[field.name] || ''}
                      onChange={(e) => updateField(field.name, e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all min-h-[44px]"
                      style={{ background: 'rgba(44,44,46,0.95)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <option value="">— Select —</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {/* Radio */}
                  {field.type === 'radio' && (
                    <div className="flex flex-wrap gap-2">
                      {(field.options || []).map((opt) => (
                        <label
                          key={opt}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm cursor-pointer transition-all min-h-[44px] ${
                            fieldValues[field.name] === opt
                              ? 'text-white ring-2 ring-primary-500/50'
                              : 'text-surface-400 hover:text-surface-300'
                          }`}
                          style={{
                            background: fieldValues[field.name] === opt
                              ? 'rgba(255,99,99,0.15)'
                              : 'rgba(255,255,255,0.06)',
                          }}
                        >
                          <input
                            type="radio"
                            name={`radio-${field.name}`}
                            value={opt}
                            checked={fieldValues[field.name] === opt}
                            onChange={() => updateField(field.name, opt)}
                            className="accent-primary-500"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Unknown */}
                  {field.type === 'unknown' && (
                    <p className="text-xs text-surface-600 italic">Unsupported field type — will be skipped</p>
                  )}
                </GlassCard>
              </motion.div>
            ))}
          </div>

          {/* ── Step 3: Download ──────────────────────────────────────────── */}
          <GlassCard className="p-4 space-y-4">
            {/* Flatten toggle */}
            <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={flatten}
                onChange={(e) => { setFlatten(e.target.checked); setDownloadDone(false); }}
                className="w-5 h-5 rounded accent-primary-500"
              />
              <div>
                <span className="text-sm font-semibold text-surface-200">Flatten after filling</span>
                <p className="text-xs text-surface-500">Makes fields non-editable in the output PDF</p>
              </div>
            </label>

            {/* Download button */}
            <motion.button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full min-h-[48px] px-6 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
            >
              {downloading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>⏳</motion.span>
                  Filling PDF…
                </span>
              ) : downloadDone ? (
                <span className="flex items-center justify-center gap-2">✅ Downloaded — Fill Again?</span>
              ) : (
                <span className="flex items-center justify-center gap-2">📥 Fill & Download PDF</span>
              )}
            </motion.button>
          </GlassCard>

          {/* Success card */}
          <AnimatePresence>
            {downloadDone && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <GlassCard className="p-5 text-center"
                  style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(59,130,246,0.1))', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <span className="text-4xl block mb-2" aria-hidden="true">🎉</span>
                  <p className="text-sm font-bold text-emerald-400">PDF filled successfully!</p>
                  <p className="text-xs text-surface-500 mt-1">{filledCount} of {fields.length} fields filled{flatten ? ' · Flattened' : ''}</p>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* New file button */}
          <button
            type="button"
            onClick={handleReset}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-sm text-surface-500 hover:text-surface-300 hover:bg-white/[0.04] transition-colors"
          >
            ← Upload a different PDF
          </button>
        </>
      )}

    </motion.div>
  );
}
