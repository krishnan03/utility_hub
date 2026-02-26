import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FREQ_OPTIONS = ['always','hourly','daily','weekly','monthly','yearly','never'];
const cardStyle = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };
const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' };
const btnGradient = { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' };

function isValidUrl(str) {
  try { const u = new URL(str); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
}

function isValidFreq(f) {
  return FREQ_OPTIONS.includes(f);
}

function isValidPriority(p) {
  const n = parseFloat(p);
  return !isNaN(n) && n >= 0 && n <= 1;
}

function isValidISODate(d) {
  return !isNaN(Date.parse(d)) && /^\d{4}-\d{2}-\d{2}/.test(d);
}

function validateSitemap(xmlText) {
  const results = [];
  let urlCount = 0;
  const urls = [];

  // Check valid XML
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      results.push({ pass: false, label: 'Valid XML structure', detail: 'XML parsing failed: ' + parseError.textContent.slice(0, 120) });
      return { results, urlCount: 0, urls: [] };
    }
    results.push({ pass: true, label: 'Valid XML structure', detail: 'XML is well-formed' });

    // Check urlset root
    const root = doc.documentElement;
    const hasUrlset = root.localName === 'urlset';
    const ns = root.namespaceURI || '';
    const correctNs = ns.includes('sitemaps.org');
    results.push({
      pass: hasUrlset,
      label: '<urlset> root element',
      detail: hasUrlset ? 'Root element is <urlset>' : `Root element is <${root.localName}>, expected <urlset>`,
    });
    results.push({
      pass: correctNs,
      label: 'Correct namespace',
      detail: correctNs ? `Namespace: ${ns}` : (ns ? `Unexpected namespace: ${ns}` : 'No namespace found — should be http://www.sitemaps.org/schemas/sitemap/0.9'),
      warn: !correctNs,
    });

    // Check url entries
    const urlEls = doc.getElementsByTagNameNS('*', 'url');
    urlCount = urlEls.length;
    results.push({
      pass: urlCount > 0,
      label: 'Contains <url> entries',
      detail: `Found ${urlCount} URL${urlCount !== 1 ? 's' : ''}`,
    });

    let missingLoc = 0;
    let invalidLocs = 0;
    let invalidFreqs = 0;
    let invalidPriorities = 0;
    let invalidDates = 0;
    const duplicates = new Set();
    const seenUrls = new Set();

    for (let i = 0; i < urlEls.length; i++) {
      const urlEl = urlEls[i];
      const locEl = urlEl.getElementsByTagNameNS('*', 'loc')[0];
      const loc = locEl?.textContent?.trim();

      if (!loc) { missingLoc++; continue; }
      if (!isValidUrl(loc)) invalidLocs++;
      if (seenUrls.has(loc)) duplicates.add(loc);
      seenUrls.add(loc);
      urls.push(loc);

      const freqEl = urlEl.getElementsByTagNameNS('*', 'changefreq')[0];
      if (freqEl && !isValidFreq(freqEl.textContent.trim())) invalidFreqs++;

      const prioEl = urlEl.getElementsByTagNameNS('*', 'priority')[0];
      if (prioEl && !isValidPriority(prioEl.textContent.trim())) invalidPriorities++;

      const modEl = urlEl.getElementsByTagNameNS('*', 'lastmod')[0];
      if (modEl && !isValidISODate(modEl.textContent.trim())) invalidDates++;
    }

    results.push({
      pass: missingLoc === 0,
      label: 'Every <url> has <loc>',
      detail: missingLoc === 0 ? 'All URLs have <loc>' : `${missingLoc} URL(s) missing <loc>`,
    });
    results.push({
      pass: invalidLocs === 0,
      label: '<loc> values are valid URLs',
      detail: invalidLocs === 0 ? 'All <loc> values are valid' : `${invalidLocs} invalid URL(s)`,
    });
    results.push({
      pass: duplicates.size === 0,
      label: 'No duplicate URLs',
      detail: duplicates.size === 0 ? 'No duplicates found' : `${duplicates.size} duplicate URL(s) found`,
      warn: duplicates.size > 0,
    });
    if (invalidFreqs > 0 || urlCount > 0) {
      results.push({
        pass: invalidFreqs === 0,
        label: '<changefreq> values valid',
        detail: invalidFreqs === 0 ? 'All valid (or not present)' : `${invalidFreqs} invalid value(s)`,
      });
    }
    if (invalidPriorities > 0 || urlCount > 0) {
      results.push({
        pass: invalidPriorities === 0,
        label: '<priority> values 0.0–1.0',
        detail: invalidPriorities === 0 ? 'All valid (or not present)' : `${invalidPriorities} out-of-range value(s)`,
      });
    }
    if (invalidDates > 0 || urlCount > 0) {
      results.push({
        pass: invalidDates === 0,
        label: '<lastmod> valid ISO dates',
        detail: invalidDates === 0 ? 'All valid (or not present)' : `${invalidDates} invalid date(s)`,
      });
    }
  } catch (e) {
    results.push({ pass: false, label: 'XML parsing', detail: e.message });
  }

  return { results, urlCount, urls };
}

export default function SitemapGenerator() {
  const [tab, setTab] = useState('generate');

  // Generate state
  const [urls, setUrls] = useState('');
  const [freq, setFreq] = useState('weekly');
  const [priority, setPriority] = useState('0.8');
  const [copied, setCopied] = useState(false);

  // Validate state
  const [validateInput, setValidateInput] = useState('');
  const [validation, setValidation] = useState(null);

  const urlList = urls.split('\n').map(u => u.trim()).filter(Boolean);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlList.map(u => `  <url>
    <loc>${u}</loc>
    <changefreq>${freq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  const copy = () => { navigator.clipboard.writeText(xml); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const download = () => {
    const blob = new Blob([xml], { type: 'application/xml' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sitemap.xml'; a.click();
  };

  const handleValidate = useCallback(() => {
    if (!validateInput.trim()) return;
    setValidation(validateSitemap(validateInput));
  }, [validateInput]);

  const handleValidateFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setValidateInput(text);
      setValidation(validateSitemap(text));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const passCount = validation ? validation.results.filter(r => r.pass).length : 0;
  const totalChecks = validation ? validation.results.length : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {[['generate', '🗺️ Generate'], ['validate', '✅ Validate']].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 min-h-[44px] ${tab === val ? 'text-white' : 'text-surface-400 hover:text-surface-200'}`}
            style={tab === val ? btnGradient : undefined}>
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'generate' && (
          <motion.div key="gen" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
            <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">URLs (one per line)</label>
                <textarea value={urls} onChange={e => setUrls(e.target.value)} rows={6}
                  placeholder={"https://example.com/\nhttps://example.com/about\nhttps://example.com/contact"}
                  className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm resize-none"
                  style={inputStyle} />
                <p className="text-xs text-surface-500 mt-1">{urlList.length} URL{urlList.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1">Change Frequency</label>
                  <select value={freq} onChange={e => setFreq(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 min-h-[44px]"
                    style={inputStyle}>
                    {FREQ_OPTIONS.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1">Priority (0.0–1.0)</label>
                  <input type="number" min="0" max="1" step="0.1" value={priority} onChange={e => setPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                    style={inputStyle} />
                </div>
              </div>
            </div>

            {urlList.length > 0 && (
              <div className="rounded-2xl p-6 space-y-3" style={cardStyle}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-semibold text-surface-300">sitemap.xml</h3>
                  <div className="flex gap-2">
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={copy}
                      className="px-3 py-1.5 text-sm rounded-xl font-medium text-surface-300 hover:text-surface-100 transition-colors min-h-[36px]"
                      style={{ background: 'rgba(255,255,255,0.06)' }}>
                      {copied ? '✓ Copied' : 'Copy'}
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={download}
                      className="px-3 py-1.5 text-sm rounded-xl font-medium text-white min-h-[36px]"
                      style={btnGradient}>
                      Download
                    </motion.button>
                  </div>
                </div>
                <pre className="rounded-xl p-4 text-xs font-mono text-surface-300 overflow-x-auto max-h-80 whitespace-pre"
                  style={{ background: 'rgba(255,255,255,0.03)' }}>{xml}</pre>
              </div>
            )}
          </motion.div>
        )}

        {tab === 'validate' && (
          <motion.div key="val" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
            <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Paste sitemap.xml content</label>
                <textarea value={validateInput} onChange={e => { setValidateInput(e.target.value); setValidation(null); }} rows={8}
                  placeholder='<?xml version="1.0" encoding="UTF-8"?>&#10;<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">&#10;  <url><loc>https://example.com/</loc></url>&#10;</urlset>'
                  className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-xs resize-none"
                  style={inputStyle} />
              </div>
              <div className="flex gap-3">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleValidate} disabled={!validateInput.trim()}
                  className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm min-h-[44px] disabled:opacity-40"
                  style={btnGradient}>
                  Validate
                </motion.button>
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-surface-300 cursor-pointer hover:text-surface-100 transition-colors min-h-[44px]"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  📁 Upload .xml
                  <input type="file" accept=".xml,application/xml,text/xml" className="hidden" onChange={handleValidateFile} />
                </label>
              </div>
            </div>

            <AnimatePresence>
              {validation && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
                      <p className="text-2xl font-bold text-green-400">{passCount}/{totalChecks}</p>
                      <p className="text-xs text-surface-400 mt-1">Checks Passed</p>
                    </div>
                    <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.15)' }}>
                      <p className="text-2xl font-bold text-primary-400">{validation.urlCount}</p>
                      <p className="text-xs text-surface-400 mt-1">URLs Found</p>
                    </div>
                    <div className="rounded-xl p-4 text-center" style={{ background: passCount === totalChecks ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${passCount === totalChecks ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}` }}>
                      <p className="text-2xl">{passCount === totalChecks ? '✅' : '⚠️'}</p>
                      <p className="text-xs text-surface-400 mt-1">{passCount === totalChecks ? 'All Good' : 'Has Issues'}</p>
                    </div>
                  </div>

                  {/* Detailed results */}
                  <div className="rounded-2xl p-5 space-y-2" style={cardStyle}>
                    <p className="text-sm font-semibold text-surface-300 mb-3">Validation Results</p>
                    {validation.results.map((r, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-start gap-3 p-3 rounded-xl"
                        style={{ background: r.pass ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)' }}>
                        <span className="text-lg mt-0.5">{r.pass ? '✅' : (r.warn ? '⚠️' : '❌')}</span>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium ${r.pass ? 'text-green-400' : 'text-red-400'}`}>{r.label}</p>
                          <p className="text-xs text-surface-500 mt-0.5">{r.detail}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
