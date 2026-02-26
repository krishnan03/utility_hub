import { useState } from 'react';
import { motion } from 'framer-motion';

const PRESETS = {
  'Allow All': [{ agent: '*', allow: '/', disallow: '' }],
  'Block All': [{ agent: '*', allow: '', disallow: '/' }],
  'Block Bots': [
    { agent: 'AhrefsBot', allow: '', disallow: '/' },
    { agent: 'SemrushBot', allow: '', disallow: '/' },
    { agent: 'MJ12bot', allow: '', disallow: '/' },
  ],
  'Block Admin': [{ agent: '*', allow: '/', disallow: '/admin/' }],
};

const emptyRule = () => ({ id: Date.now() + Math.random(), agent: '*', allow: '', disallow: '' });

export default function RobotsTxtGenerator() {
  const [rules, setRules] = useState([emptyRule()]);
  const [sitemap, setSitemap] = useState('');
  const [copied, setCopied] = useState(false);

  const update = (id, k, v) => setRules(r => r.map(x => x.id === id ? { ...x, [k]: v } : x));
  const addRule = () => setRules(r => [...r, emptyRule()]);
  const removeRule = (id) => setRules(r => r.filter(x => x.id !== id));

  const applyPreset = (name) => setRules(PRESETS[name].map(r => ({ ...r, id: Date.now() + Math.random() })));

  const output = rules.map(r => {
    const lines = [`User-agent: ${r.agent || '*'}`];
    if (r.allow) lines.push(`Allow: ${r.allow}`);
    if (r.disallow) lines.push(`Disallow: ${r.disallow}`);
    return lines.join('\n');
  }).join('\n\n') + (sitemap ? `\n\nSitemap: ${sitemap}` : '');

  const copy = () => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <div className="text-sm font-medium text-surface-300 mb-2">Presets</div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(PRESETS).map(p => (
              <button key={p} onClick={() => applyPreset(p)} className="px-3 py-1.5 text-sm hover:bg-primary-500/10/40 text-surface-300 rounded-xl transition-colors">{p}</button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {rules.map((rule, i) => (
            <div key={rule.id} className="rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Rule {i + 1}</span>
                {rules.length > 1 && <button onClick={() => removeRule(rule.id)} className="text-red-400 hover:text-red-600 text-sm">✕</button>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[['agent','User-agent'],['allow','Allow'],['disallow','Disallow']].map(([k, label]) => (
                  <div key={k}>
                    <label className="block text-xs text-surface-400 mb-1">{label}</label>
                    <input value={rule[k]} onChange={e => update(rule.id, k, e.target.value)} placeholder={k === 'agent' ? '*' : '/path/'}
                      className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 text-sm font-mono" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button onClick={addRule} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-surface-100 rounded-xl font-medium transition-colors text-sm">+ Add Rule</button>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">Sitemap URL (optional)</label>
          <input value={sitemap} onChange={e => setSitemap(e.target.value)} placeholder="https://example.com/sitemap.xml"
            className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}/>
        </div>
      </div>

      <div className="rounded-2xl p-6 space-y-3" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-surface-300">robots.txt</h3>
          <button onClick={copy} className="px-3 py-1.5 text-sm bg-blue-500 hover:text-white rounded-xl font-medium transition-colors">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre className="rounded-xl p-4 text-sm font-mono text-surface-300 whitespace-pre-wrap">{output}</pre>
      </div>
    </motion.div>
  );
}
