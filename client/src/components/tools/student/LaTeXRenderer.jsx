import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Template Library ────────────────────────────────────────────────────────

const TEMPLATES = [
  // Math
  { name: 'Quadratic Formula', category: 'Math', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  { name: 'Pythagorean Theorem', category: 'Math', latex: 'a^2 + b^2 = c^2' },
  { name: "Euler's Identity", category: 'Math', latex: 'e^{i\\pi} + 1 = 0' },
  { name: 'Taylor Series', category: 'Math', latex: 'f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!}(x - a)^n' },
  { name: 'Binomial Theorem', category: 'Math', latex: '(x + y)^n = \\sum_{k=0}^{n} \\binom{n}{k} x^{n-k} y^k' },
  { name: 'Normal Distribution', category: 'Math', latex: 'f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}' },
  // Calculus
  { name: 'Derivative Definition', category: 'Calculus', latex: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}" },
  { name: 'Chain Rule', category: 'Calculus', latex: '\\frac{d}{dx}[f(g(x))] = f\'(g(x)) \\cdot g\'(x)' },
  { name: 'Integration by Parts', category: 'Calculus', latex: '\\int u\\,dv = uv - \\int v\\,du' },
  { name: 'Fundamental Theorem', category: 'Calculus', latex: '\\int_a^b f(x)\\,dx = F(b) - F(a)' },
  // Linear Algebra
  { name: 'Matrix Multiplication', category: 'Linear Algebra', latex: '(AB)_{ij} = \\sum_{k=1}^{n} a_{ik} b_{kj}' },
  { name: 'Determinant', category: 'Linear Algebra', latex: '\\det(A) = \\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix} = ad - bc' },
  { name: 'Eigenvalue Equation', category: 'Linear Algebra', latex: 'A\\mathbf{v} = \\lambda\\mathbf{v}' },
  // Physics
  { name: "Newton's Second Law", category: 'Physics', latex: '\\mathbf{F} = m\\mathbf{a}' },
  { name: 'Schrödinger Equation', category: 'Physics', latex: 'i\\hbar\\frac{\\partial}{\\partial t}\\Psi = \\hat{H}\\Psi' },
  { name: "Maxwell's Equations", category: 'Physics', latex: '\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}, \\quad \\nabla \\times \\mathbf{B} = \\mu_0\\mathbf{J} + \\mu_0\\varepsilon_0\\frac{\\partial \\mathbf{E}}{\\partial t}' },
  { name: 'E=mc²', category: 'Physics', latex: 'E = mc^2' },
  // Statistics
  { name: "Bayes' Theorem", category: 'Statistics', latex: 'P(A|B) = \\frac{P(B|A)\\,P(A)}{P(B)}' },
  { name: 'Standard Deviation', category: 'Statistics', latex: '\\sigma = \\sqrt{\\frac{1}{N}\\sum_{i=1}^{N}(x_i - \\mu)^2}' },
  { name: 'Chi-Squared', category: 'Statistics', latex: '\\chi^2 = \\sum \\frac{(O_i - E_i)^2}{E_i}' },
  // Chemistry
  { name: 'Ideal Gas Law', category: 'Chemistry', latex: 'PV = nRT' },
];

const CATEGORY_COLORS = {
  Math: { bg: 'rgba(99,102,241,0.15)', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  Calculus: { bg: 'rgba(168,85,247,0.15)', text: 'text-purple-400', border: 'border-purple-500/30' },
  'Linear Algebra': { bg: 'rgba(59,130,246,0.15)', text: 'text-blue-400', border: 'border-blue-500/30' },
  Physics: { bg: 'rgba(34,197,94,0.15)', text: 'text-green-400', border: 'border-green-500/30' },
  Statistics: { bg: 'rgba(249,115,22,0.15)', text: 'text-orange-400', border: 'border-orange-500/30' },
  Chemistry: { bg: 'rgba(236,72,153,0.15)', text: 'text-pink-400', border: 'border-pink-500/30' },
};

const SNIPPETS = [
  { label: 'Fraction', value: '\\frac{a}{b}' },
  { label: 'Integral', value: '\\int_{a}^{b} f(x)\\,dx' },
  { label: 'Summation', value: '\\sum_{i=1}^{n} x_i' },
  { label: 'Limit', value: '\\lim_{x \\to \\infty}' },
  { label: 'Matrix', value: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
  { label: 'Sqrt', value: '\\sqrt{x^2 + y^2}' },
];

const SYMBOLS = ['α','β','γ','δ','ε','π','σ','Σ','∫','∂','√','∞','≤','≥','≠'];

// ─── KaTeX Loader ────────────────────────────────────────────────────────────

function useKaTeX() {
  const [katex, setKatex] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('katex');
        if (!cancelled) {
          // inject KaTeX CSS if not already present
          if (!document.querySelector('link[href*="katex"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
            document.head.appendChild(link);
          }
          setKatex(mod.default || mod);
        }
      } catch {
        // KaTeX not installed — use CDN fallback
        if (!cancelled) {
          try {
            if (!document.querySelector('script[src*="katex"]')) {
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
              document.head.appendChild(link);

              await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
              });
            }
            if (!cancelled && window.katex) setKatex(window.katex);
          } catch {
            /* KaTeX unavailable */
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { katex, loading };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function GlassCard({ children, className = '' }) {
  return (
    <div className={`rounded-2xl ${className}`}
      style={{ background: 'rgba(44,44,46,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {children}
    </div>
  );
}

function KaTeXPreview({ latex, katex }) {
  const [html, setHtml] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!katex || !latex.trim()) {
      setHtml('');
      setError(null);
      return;
    }
    try {
      const rendered = katex.renderToString(latex, { throwOnError: true, displayMode: true });
      setHtml(rendered);
      setError(null);
    } catch (e) {
      setError(e.message);
      setHtml('');
    }
  }, [latex, katex]);

  if (!latex.trim()) {
    return <p className="text-surface-500 text-sm italic">Enter a LaTeX expression to see the preview</p>;
  }
  if (error) {
    return (
      <div className="rounded-xl p-3 text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <span className="font-semibold">Render error:</span> {error}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto py-4 px-2 text-surface-100 text-lg" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function LaTeXRenderer() {
  const [latex, setLatex] = useState('\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
  const [copied, setCopied] = useState(null); // null | 'latex' | 'mathml' | 'template'
  const [activeTab, setActiveTab] = useState('editor');
  const [filterCategory, setFilterCategory] = useState('All');
  const { katex, loading: katexLoading } = useKaTeX();
  const canvasRef = useRef(null);

  const insert = (val) => setLatex((l) => l + val);

  const categories = useMemo(() => ['All', ...new Set(TEMPLATES.map((t) => t.category))], []);

  const filteredTemplates = useMemo(
    () => filterCategory === 'All' ? TEMPLATES : TEMPLATES.filter((t) => t.category === filterCategory),
    [filterCategory],
  );

  const copyText = useCallback(async (text, label) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const copyMathML = useCallback(async () => {
    if (!katex || !latex.trim()) return;
    try {
      const mathml = katex.renderToString(latex, { throwOnError: true, output: 'mathml' });
      await navigator.clipboard.writeText(mathml);
      setCopied('mathml');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore render errors */
    }
  }, [katex, latex]);

  const downloadPNG = useCallback(async () => {
    if (!katex || !latex.trim()) return;
    try {
      const html = katex.renderToString(latex, { throwOnError: true, displayMode: true });
      const container = document.createElement('div');
      container.innerHTML = html;
      container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;font-size:32px;padding:24px;background:white;color:black;';
      document.body.appendChild(container);

      document.body.removeChild(container);

      // SVG-based PNG export (no external dependencies)
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('xmlns', svgNS);
      svg.setAttribute('width', '800');
      svg.setAttribute('height', '200');
      const fo = document.createElementNS(svgNS, 'foreignObject');
      fo.setAttribute('width', '100%');
      fo.setAttribute('height', '100%');
      const div = document.createElement('div');
      div.innerHTML = html;
      div.style.cssText = 'font-size:24px;padding:16px;color:black;';
      fo.appendChild(div);
      svg.appendChild(fo);
      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = 800 * 2;
        c.height = 200 * 2;
        const ctx = c.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        const link = document.createElement('a');
        link.download = 'latex-equation.png';
        link.href = c.toDataURL('image/png');
        link.click();
      };
      img.src = url;
    } catch {
      /* ignore errors */
    }
  }, [katex, latex]);

  const useTemplate = useCallback((tmpl) => {
    setLatex(tmpl.latex);
    setActiveTab('editor');
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Tab Toggle */}
      <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {['editor', 'templates'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all duration-200 ${activeTab === tab ? 'text-white shadow-sm' : 'text-surface-400 hover:text-surface-300'}`}
            style={activeTab === tab ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : {}}>
            {tab === 'editor' ? '✏️ Editor' : '📚 Templates'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'editor' ? (
          <motion.div key="editor" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="space-y-6">
            {/* Editor Panel */}
            <GlassCard className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">LaTeX Input</label>
                <textarea value={latex} onChange={(e) => setLatex(e.target.value)} rows={4}
                  className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  placeholder="Enter LaTeX expression..." />
              </div>

              <div>
                <div className="text-xs text-surface-400 mb-2">Quick Symbols</div>
                <div className="flex flex-wrap gap-1.5">
                  {SYMBOLS.map((s) => (
                    <button key={s} onClick={() => insert(s)} className="px-2 py-1 text-sm text-surface-100 rounded-lg transition-colors font-mono hover:bg-white/5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-surface-400 mb-2">Common Snippets</div>
                <div className="flex flex-wrap gap-2">
                  {SNIPPETS.map((s) => (
                    <button key={s.label} onClick={() => insert(s.value)} className="px-3 py-1.5 text-xs text-surface-300 rounded-xl transition-colors hover:bg-white/5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </GlassCard>

            {/* Live Preview */}
            <GlassCard className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-surface-300">Live Preview</span>
                {katexLoading && <span className="text-xs text-surface-500">Loading renderer…</span>}
              </div>
              {katex ? (
                <KaTeXPreview latex={latex} katex={katex} />
              ) : !katexLoading ? (
                <div className="rounded-xl p-4 text-sm text-primary-300" style={{ background: 'rgba(255,99,99,0.06)', border: '1px solid rgba(255,99,99,0.2)' }}>
                  <div className="font-semibold mb-1">Preview Note</div>
                  For full rendered output, paste this LaTeX into:
                  <ul className="mt-1 space-y-0.5 list-disc list-inside">
                    <li><a href="https://katex.org/#demo" target="_blank" rel="noopener noreferrer" className="underline">KaTeX Demo</a></li>
                    <li><a href="https://www.overleaf.com" target="_blank" rel="noopener noreferrer" className="underline">Overleaf</a></li>
                  </ul>
                </div>
              ) : null}
            </GlassCard>

            {/* Export Options */}
            <GlassCard className="p-6 space-y-3">
              <span className="text-sm font-medium text-surface-300">Export</span>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => copyText(latex, 'latex')}
                  className="min-h-[44px] px-4 py-2 text-sm text-white rounded-xl font-medium transition-colors"
                  style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
                  {copied === 'latex' ? '✓ Copied' : '📋 Copy LaTeX'}
                </button>
                {katex && (
                  <button onClick={copyMathML}
                    className="min-h-[44px] px-4 py-2 text-sm text-surface-300 rounded-xl font-medium transition-colors hover:bg-white/10"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                    {copied === 'mathml' ? '✓ Copied' : '🧮 Copy MathML'}
                  </button>
                )}
                {katex && (
                  <button onClick={downloadPNG}
                    className="min-h-[44px] px-4 py-2 text-sm text-surface-300 rounded-xl font-medium transition-colors hover:bg-white/10"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                    🖼️ Download PNG
                  </button>
                )}
              </div>

              <pre className="rounded-xl p-4 text-sm font-mono text-surface-100 overflow-x-auto whitespace-pre-wrap break-all" style={{ background: 'rgba(255,255,255,0.04)' }}>
                {latex || '(empty)'}
              </pre>
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div key="templates" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button key={cat} onClick={() => setFilterCategory(cat)}
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${filterCategory === cat ? 'text-white' : 'text-surface-400 hover:text-surface-300'}`}
                  style={filterCategory === cat ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((tmpl) => {
                const colors = CATEGORY_COLORS[tmpl.category] || CATEGORY_COLORS.Math;
                return (
                  <motion.div key={tmpl.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
                    <GlassCard className="p-5 space-y-3 h-full flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-surface-100">{tmpl.name}</h3>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${colors.text} ${colors.border} border`}
                          style={{ background: colors.bg }}>
                          {tmpl.category}
                        </span>
                      </div>

                      {/* KaTeX mini preview */}
                      {katex && (
                        <div className="overflow-x-auto py-1 text-surface-200 text-sm">
                          <KaTeXPreview latex={tmpl.latex} katex={katex} />
                        </div>
                      )}

                      <pre className="flex-1 rounded-lg p-3 text-xs font-mono text-surface-400 overflow-x-auto whitespace-pre-wrap break-all"
                        style={{ background: 'rgba(255,255,255,0.03)' }}>
                        {tmpl.latex}
                      </pre>

                      <button onClick={() => useTemplate(tmpl)}
                        className="min-h-[44px] w-full px-4 py-2 text-sm text-white rounded-xl font-medium transition-all hover:brightness-110"
                        style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
                        Use Template
                      </button>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}
