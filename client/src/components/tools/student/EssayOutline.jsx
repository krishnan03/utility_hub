import { useState } from 'react';
import { motion } from 'framer-motion';
import { generateOutline } from '../../../utils/essayOutline';

const ESSAY_TYPES = ['Argumentative', 'Expository', 'Narrative', 'Descriptive', 'Compare & Contrast'];

export default function EssayOutline() {
  const [topic, setTopic] = useState('');
  const [essayType, setEssayType] = useState('Argumentative');
  const [outline, setOutline] = useState(null);
  const [copied, setCopied] = useState(false);

  const generate = () => {
    if (!topic.trim()) return;
    setOutline(generateOutline(topic.trim(), essayType));
  };

  const outlineText = outline
    ? outline.sections?.map(s => `${s.title}\n${s.points?.map(p => `  - ${p}`).join('\n') || ''}`).join('\n\n')
    : '';

  const copy = () => {
    navigator.clipboard.writeText(outlineText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">Essay Topic</label>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. The impact of social media on mental health"
            className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">Essay Type</label>
          <select value={essayType} onChange={e => setEssayType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {ESSAY_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <button onClick={generate} className="px-4 py-2 text-white rounded-xl font-medium transition-colors" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>Generate Outline</button>
      </div>

      {outline && (
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-surface-100">{essayType} Essay Outline</h3>
            <button onClick={copy} className="px-3 py-1.5 text-sm text-white rounded-xl font-medium transition-colors" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
              {copied ? '✓ Copied' : 'Copy as Text'}
            </button>
          </div>
          <div className="space-y-4">
            {outline.sections?.map((section, i) => (
              <div key={i} className="border-l-2 border-primary-400 pl-4">
                <div className="font-semibold text-surface-100 mb-2">{section.title}</div>
                {section.points?.length > 0 && (
                  <ul className="space-y-1">
                    {section.points.map((p, j) => (
                      <li key={j} className="text-sm text-surface-400 flex gap-2">
                        <span className="text-primary-400 shrink-0">•</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
