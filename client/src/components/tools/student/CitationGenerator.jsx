import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCitation } from '../../../utils/citationFormatter';

const SOURCE_TYPES = [
  { label: 'Book', value: 'book' },
  { label: 'Journal Article', value: 'journal' },
  { label: 'Website', value: 'website' },
  { label: 'Film', value: 'film' },
];

const STYLES = [
  { label: 'APA 7th', value: 'apa7' },
  { label: 'MLA 9th', value: 'mla9' },
  { label: 'Chicago 17th', value: 'chicago17' },
  { label: 'Harvard', value: 'harvard' },
  { label: 'IEEE', value: 'ieee' },
  { label: 'Vancouver', value: 'vancouver' },
];

const LS_KEY = 'utilityhub_bibliography';
const EMPTY_FIELDS = { author: '', title: '', year: '', publisher: '', url: '', journal: '', volume: '', issue: '', pages: '', doi: '', director: '' };

const cardStyle = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };
const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' };
const btnGradient = { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' };

function detectLookupType(input) {
  const trimmed = input.trim();
  if (/^10\.\d{4,}\//.test(trimmed)) return 'doi';
  const digits = trimmed.replace(/[-\s]/g, '');
  if (/^(978|979)?\d{9}[\dXx]$/.test(digits)) return 'isbn';
  return null;
}

async function fetchDOI(doi) {
  const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
  if (!res.ok) throw new Error('DOI not found');
  const data = await res.json();
  const item = data.message;
  const authorList = (item.author || []).map(a => `${a.given || ''} ${a.family || ''}`.trim()).join(', ');
  const published = item.published?.['date-parts']?.[0] || [];
  return {
    author: authorList || '',
    title: (item.title || [])[0] || '',
    year: String(published[0] || ''),
    journal: (item['container-title'] || [])[0] || '',
    volume: item.volume || '',
    issue: item.issue || '',
    pages: item.page || '',
    publisher: item.publisher || '',
    doi: doi,
    url: item.URL || '',
  };
}

async function fetchISBN(isbn) {
  const clean = isbn.replace(/[-\s]/g, '');
  const res = await fetch(`https://openlibrary.org/isbn/${clean}.json`);
  if (!res.ok) throw new Error('ISBN not found');
  const data = await res.json();
  let authorName = '';
  if (data.authors?.length) {
    try {
      const authorRes = await fetch(`https://openlibrary.org${data.authors[0].key}.json`);
      if (authorRes.ok) {
        const authorData = await authorRes.json();
        authorName = authorData.name || '';
      }
    } catch { /* ignore author fetch failure */ }
  }
  return {
    author: authorName,
    title: data.title || '',
    year: data.publish_date ? data.publish_date.match(/\d{4}/)?.[0] || '' : '',
    publisher: (data.publishers || [])[0] || '',
    pages: data.number_of_pages ? String(data.number_of_pages) : '',
    url: '',
    journal: '',
    volume: '',
    issue: '',
    doi: '',
  };
}

function loadBibliography() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveBibliography(items) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

function InputField({ label, value, onChange, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-surface-300 mb-1">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 min-h-[44px]"
        style={inputStyle}
      />
    </div>
  );
}

export default function CitationGenerator() {
  const [sourceType, setSourceType] = useState('book');
  const [style, setStyle] = useState('apa7');
  const [fields, setFields] = useState({ ...EMPTY_FIELDS });
  const [citation, setCitation] = useState('');
  const [copied, setCopied] = useState(false);
  const [lookupInput, setLookupInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [autoFilled, setAutoFilled] = useState(false);
  const [bibliography, setBibliography] = useState(() => loadBibliography());
  const [showBib, setShowBib] = useState(false);
  const [addedToBib, setAddedToBib] = useState(false);

  useEffect(() => { saveBibliography(bibliography); }, [bibliography]);

  const set = useCallback((k, v) => setFields(f => ({ ...f, [k]: v })), []);

  const handleLookup = async () => {
    const type = detectLookupType(lookupInput);
    if (!type) { setLookupError('Enter a valid DOI (e.g. 10.1038/nature12373) or ISBN (e.g. 978-0-13-468599-1)'); return; }
    setLookupLoading(true);
    setLookupError('');
    setAutoFilled(false);
    try {
      const data = type === 'doi' ? await fetchDOI(lookupInput.trim()) : await fetchISBN(lookupInput.trim());
      setFields(prev => ({ ...prev, ...data }));
      if (type === 'doi' && data.journal) setSourceType('journal');
      else if (type === 'isbn') setSourceType('book');
      setAutoFilled(true);
      setTimeout(() => setAutoFilled(false), 2000);
    } catch (err) {
      setLookupError(err.message || 'Lookup failed. Check the identifier and try again.');
    } finally {
      setLookupLoading(false);
    }
  };

  const generate = () => {
    try {
      const source = { ...fields, type: sourceType };
      const result = formatCitation(source, style);
      setCitation(result);
      setAddedToBib(false);
    } catch (err) {
      setCitation(`Error: ${err.message}`);
    }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addToBibliography = () => {
    if (!citation || citation.startsWith('Error:')) return;
    const entry = {
      id: Date.now(),
      text: citation,
      style: STYLES.find(s => s.value === style)?.label || style,
      sourceType: SOURCE_TYPES.find(s => s.value === sourceType)?.label || sourceType,
      raw: { ...fields, type: sourceType },
      styleKey: style,
    };
    setBibliography(prev => [...prev, entry]);
    setAddedToBib(true);
  };

  const removeFromBibliography = (id) => {
    setBibliography(prev => prev.filter(e => e.id !== id));
  };

  const clearBibliography = () => {
    if (window.confirm('Clear all saved citations?')) {
      setBibliography([]);
    }
  };

  const exportBibliography = () => {
    const text = bibliography.map(e => e.text).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bibliography.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const showJournalFields = sourceType === 'journal';
  const showWebsiteFields = sourceType === 'website';
  const showFilmFields = sourceType === 'film';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">

      {/* ── Quick Lookup ─────────────────────────────── */}
      <div className="rounded-2xl p-6 space-y-3" style={cardStyle}>
        <h3 className="text-surface-100 font-semibold text-lg">Quick Lookup</h3>
        <p className="text-surface-400 text-sm">Paste a DOI or ISBN to auto-fill citation fields</p>
        <div className="flex gap-3 items-start">
          <div className="flex-1">
            <input
              value={lookupInput}
              onChange={e => { setLookupInput(e.target.value); setLookupError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
              placeholder="e.g. 10.1038/nature12373 or 978-0-13-468599-1"
              className="w-full px-4 py-2.5 rounded-xl text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 min-h-[44px]"
              style={inputStyle}
            />
          </div>
          <button
            onClick={handleLookup}
            disabled={lookupLoading || !lookupInput.trim()}
            className="px-5 py-2.5 text-white rounded-xl font-medium transition-all min-h-[44px] min-w-[44px] disabled:opacity-50"
            style={btnGradient}
          >
            {lookupLoading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Looking up…
              </span>
            ) : 'Lookup'}
          </button>
        </div>
        <AnimatePresence>
          {lookupError && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-red-400 text-sm">{lookupError}</motion.p>
          )}
          {autoFilled && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-green-400 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Fields auto-populated from lookup
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Source Details ────────────────────────────── */}
      <motion.div layout className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <h3 className="text-surface-100 font-semibold text-lg">Source Details</h3>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium text-surface-300 mb-1">Source Type</label>
            <select value={sourceType} onChange={e => setSourceType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 min-h-[44px]"
              style={inputStyle}>
              {SOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium text-surface-300 mb-1">Citation Style</label>
            <select value={style} onChange={e => setStyle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 min-h-[44px]"
              style={inputStyle}>
              {STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField label={showFilmFields ? 'Director' : 'Author(s)'} value={fields.author} onChange={v => set('author', v)} />
          <InputField label="Title" value={fields.title} onChange={v => set('title', v)} />
          <InputField label="Year" value={fields.year} onChange={v => set('year', v)} />
          <InputField label={showFilmFields ? 'Studio / Distributor' : 'Publisher'} value={fields.publisher} onChange={v => set('publisher', v)} />

          {showWebsiteFields && (
            <InputField label="URL" value={fields.url} onChange={v => set('url', v)} className="sm:col-span-2" />
          )}

          {showJournalFields && (
            <>
              <InputField label="Journal" value={fields.journal} onChange={v => set('journal', v)} />
              <InputField label="Volume" value={fields.volume} onChange={v => set('volume', v)} />
              <InputField label="Issue" value={fields.issue} onChange={v => set('issue', v)} />
              <InputField label="Pages" value={fields.pages} onChange={v => set('pages', v)} />
              <InputField label="DOI" value={fields.doi} onChange={v => set('doi', v)} className="sm:col-span-2" />
            </>
          )}
        </div>

        <button onClick={generate} className="px-5 py-2.5 text-white rounded-xl font-medium transition-all min-h-[44px]" style={btnGradient}>
          Generate Citation
        </button>
      </motion.div>

      {/* ── Generated Citation ────────────────────────── */}
      <AnimatePresence>
        {citation && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="rounded-2xl p-6 space-y-3"
            style={cardStyle}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-medium text-surface-300">{STYLES.find(s => s.value === style)?.label} Citation</span>
              <div className="flex gap-2">
                <button onClick={() => copy(citation)} className="px-4 py-2 text-sm text-white rounded-xl font-medium transition-all min-h-[44px]" style={btnGradient}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
                {!addedToBib && (
                  <button onClick={addToBibliography} className="px-4 py-2 text-sm rounded-xl font-medium transition-all min-h-[44px] text-surface-100 hover:text-white"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    + Add to Bibliography
                  </button>
                )}
                {addedToBib && (
                  <span className="px-4 py-2 text-sm rounded-xl font-medium text-green-400 flex items-center gap-1 min-h-[44px]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Added
                  </span>
                )}
              </div>
            </div>
            <p className="text-surface-100 font-mono text-sm rounded-xl p-4 leading-relaxed" style={{ background: 'rgba(255,255,255,0.04)' }}>{citation}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bibliography ──────────────────────────────── */}
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <button
          onClick={() => setShowBib(prev => !prev)}
          className="w-full flex items-center justify-between min-h-[44px]"
        >
          <h3 className="text-surface-100 font-semibold text-lg flex items-center gap-2">
            Bibliography
            {bibliography.length > 0 && (
              <span className="text-xs font-normal px-2 py-0.5 rounded-full text-surface-300" style={{ background: 'rgba(255,255,255,0.08)' }}>
                {bibliography.length}
              </span>
            )}
          </h3>
          <svg className={`w-5 h-5 text-surface-400 transition-transform ${showBib ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <AnimatePresence>
          {showBib && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden"
            >
              {bibliography.length === 0 ? (
                <p className="text-surface-400 text-sm py-4 text-center">No citations saved yet. Generate a citation and click "Add to Bibliography".</p>
              ) : (
                <>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={exportBibliography} className="px-4 py-2 text-sm text-white rounded-xl font-medium transition-all min-h-[44px]" style={btnGradient}>
                      Export as Text
                    </button>
                    <button onClick={clearBibliography} className="px-4 py-2 text-sm rounded-xl font-medium transition-all min-h-[44px] text-red-400 hover:text-red-300"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-2">
                    {bibliography.map(entry => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        className="rounded-xl p-4 flex gap-3 items-start"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-surface-100 text-sm font-mono leading-relaxed break-words">{entry.text}</p>
                          <div className="flex gap-2 mt-2">
                            <span className="text-xs px-2 py-0.5 rounded-full text-surface-400" style={{ background: 'rgba(255,255,255,0.06)' }}>{entry.style}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full text-surface-400" style={{ background: 'rgba(255,255,255,0.06)' }}>{entry.sourceType}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromBibliography(entry.id)}
                          className="text-surface-500 hover:text-red-400 transition-colors p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
                          title="Remove"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
