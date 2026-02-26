import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { analyzeAcademicText } from '../../../utils/academicMetrics';

const LEVEL_COLORS = {
  Elementary: 'bg-green-500/10 text-green-500 border-green-500/20',
  'Middle School': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'High School': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  College: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  Graduate: 'bg-red-500/10 text-red-500 border-red-500/20',
};

function MetricCard({ label, value, icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-1 p-4 rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <span className="text-lg" aria-hidden="true">{icon}</span>
      <span className="text-2xl font-extrabold font-mono text-surface-100">
        {value}
      </span>
      <span className="text-xs text-surface-400 text-center">
        {label}
      </span>
    </motion.div>
  );
}

export default function AcademicMetrics() {
  const [text, setText] = useState('');

  const metrics = useMemo(() => analyzeAcademicText(text), [text]);

  const levelClass = LEVEL_COLORS[metrics.readability.level] || LEVEL_COLORS.Elementary;

  return (
    <div className="space-y-6">
      {/* Education level badge */}
      {text.trim() && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center"
        >
          <span
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border ${levelClass}`}
          >
            🎓 {metrics.readability.level} Level
          </span>
        </motion.div>
      )}

      {/* Textarea */}
      <div>
        <label
          htmlFor="academic-text"
          className="block text-sm font-semibold text-surface-300 mb-2"
        >
          Paste or type your text
        </label>
        <textarea
          id="academic-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Start typing or paste your essay, paper, or article here..."
          rows={8}
          className="w-full px-4 py-3 rounded-2xl text-sm text-surface-100 placeholder:text-surface-400 resize-y focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        />
      </div>

      {/* Basic counts */}
      <div>
        <h3 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-3">
          Counts
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Words" value={metrics.wordCount} icon="📝" />
          <MetricCard label="Characters" value={metrics.charCount} icon="🔤" />
          <MetricCard label="Sentences" value={metrics.sentenceCount} icon="💬" />
          <MetricCard label="Paragraphs" value={metrics.paragraphCount} icon="📄" />
        </div>
      </div>

      {/* Page & time estimates */}
      <div>
        <h3 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-3">
          Estimates
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MetricCard
            label="Pages (double-spaced)"
            value={metrics.pagesDoubleSpaced}
            icon="📑"
          />
          <MetricCard
            label="Pages (single-spaced)"
            value={metrics.pagesSingleSpaced}
            icon="📃"
          />
          <MetricCard
            label="Speaking time (min)"
            value={metrics.speakingTimeMinutes}
            icon="🎤"
          />
        </div>
      </div>

      {/* Readability scores */}
      <div>
        <h3 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-3">
          Readability
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            label="Flesch-Kincaid Grade"
            value={metrics.readability.fleschKincaid}
            icon="📊"
          />
          <MetricCard
            label="Reading Ease"
            value={metrics.readability.fleschReadingEase}
            icon="👁️"
          />
          <MetricCard
            label="Gunning Fog"
            value={metrics.readability.gunningFog}
            icon="🌫️"
          />
          <MetricCard
            label="Coleman-Liau"
            value={metrics.readability.colemanLiau}
            icon="📐"
          />
        </div>
      </div>
    </div>
  );
}
