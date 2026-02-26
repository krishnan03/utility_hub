import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  toUpperCase, toLowerCase, toTitleCase, toSentenceCase,
  toCamelCase, toSnakeCase, toKebabCase,
  countWords, countCharacters, countSentences, estimateReadingTime,
  encodeBase64, decodeBase64, encodeUrl, decodeUrl,
  encodeHtmlEntities, decodeHtmlEntities,
  generateHash,
  diffTexts,
  generateLoremIpsum,
  findAndReplace,
  fleschReadingEase, fleschKincaidGrade, gunningFogIndex,
  colemanLiauIndex, automatedReadabilityIndex, smogIndex,
  countSyllables, countTotalSyllables,
  gradeLabel, fleschLabel, fleschColor,
} from '../../../utils/textUtils';

const TABS = [
  { id: 'case', label: 'Case' },
  { id: 'count', label: 'Count' },
  { id: 'encode', label: 'Encode' },
  { id: 'hash', label: 'Hash' },
  { id: 'diff', label: 'Diff' },
  { id: 'lorem', label: 'Lorem' },
  { id: 'find-replace', label: 'Find & Replace' },
  { id: 'readability', label: 'Readability' },
];

const CASE_OPTIONS = [
  { label: 'UPPERCASE', fn: toUpperCase },
  { label: 'lowercase', fn: toLowerCase },
  { label: 'Title Case', fn: toTitleCase },
  { label: 'Sentence case', fn: toSentenceCase },
  { label: 'camelCase', fn: toCamelCase },
  { label: 'snake_case', fn: toSnakeCase },
  { label: 'kebab-case', fn: toKebabCase },
];

const ENCODE_OPTIONS = [
  { label: 'Base64 Encode', fn: encodeBase64 },
  { label: 'Base64 Decode', fn: decodeBase64 },
  { label: 'URL Encode', fn: encodeUrl },
  { label: 'URL Decode', fn: decodeUrl },
  { label: 'HTML Encode', fn: encodeHtmlEntities },
  { label: 'HTML Decode', fn: decodeHtmlEntities },
];

const HASH_ALGOS = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512'];

export default function TextUtilities() {
  const [tab, setTab] = useState('case');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  // Case tab
  const [caseType, setCaseType] = useState(0);

  // Hash tab
  const [hashAlgo, setHashAlgo] = useState('SHA-256');
  const [hashResult, setHashResult] = useState('');

  // Diff tab
  const [diffText1, setDiffText1] = useState('');
  const [diffText2, setDiffText2] = useState('');

  // Lorem tab
  const [loremCount, setLoremCount] = useState(3);

  // Find-Replace tab
  const [findStr, setFindStr] = useState('');
  const [replaceStr, setReplaceStr] = useState('');
  const [frCaseSensitive, setFrCaseSensitive] = useState(false);
  const [frRegex, setFrRegex] = useState(false);
  const [frCount, setFrCount] = useState(0);

  // Live case conversion
  useEffect(() => {
    if (tab === 'case' && input) {
      try {
        setOutput(CASE_OPTIONS[caseType].fn(input));
      } catch {
        setOutput('');
      }
    }
  }, [tab, input, caseType]);

  // Live hash
  useEffect(() => {
    if (tab === 'hash' && input) {
      let cancelled = false;
      generateHash(input, hashAlgo).then((h) => {
        if (!cancelled) setHashResult(h);
      }).catch(() => {
        if (!cancelled) setHashResult('Error generating hash');
      });
      return () => { cancelled = true; };
    } else {
      setHashResult('');
    }
  }, [tab, input, hashAlgo]);

  // Live find-replace
  useEffect(() => {
    if (tab === 'find-replace' && input && findStr) {
      try {
        const res = findAndReplace(input, findStr, replaceStr, {
          caseSensitive: frCaseSensitive,
          regex: frRegex,
          global: true,
        });
        setOutput(res.result);
        setFrCount(res.count);
      } catch {
        setOutput(input);
        setFrCount(0);
      }
    } else if (tab === 'find-replace') {
      setOutput(input);
      setFrCount(0);
    }
  }, [tab, input, findStr, replaceStr, frCaseSensitive, frRegex]);

  const handleCopy = useCallback(async (text) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // Count stats — live
  const stats = useMemo(() => {
    if (!input) return { words: 0, chars: 0, sentences: 0, readTime: 0 };
    return {
      words: countWords(input),
      chars: countCharacters(input),
      sentences: countSentences(input),
      readTime: estimateReadingTime(input),
    };
  }, [input]);

  // Diff result — live
  const diffResult = useMemo(() => {
    if (tab !== 'diff' || (!diffText1 && !diffText2)) return [];
    return diffTexts(diffText1, diffText2);
  }, [tab, diffText1, diffText2]);

  // Lorem — live
  const loremOutput = useMemo(() => {
    if (tab !== 'lorem') return '';
    return generateLoremIpsum(loremCount);
  }, [tab, loremCount]);

  // Readability scores — live
  const readability = useMemo(() => {
    if (!input || !input.trim()) return null;
    const words = countWords(input);
    const sentences = countSentences(input) || 1;
    const syllables = countTotalSyllables(input);
    const wordList = input.trim().split(/\s+/).filter(Boolean);
    return {
      flesch: fleschReadingEase(input),
      fkGrade: fleschKincaidGrade(input),
      fog: gunningFogIndex(input),
      coleman: colemanLiauIndex(input),
      ari: automatedReadabilityIndex(input),
      smog: smogIndex(input),
      words,
      sentences,
      syllables,
      avgWordsPerSentence: words / sentences,
      avgSyllablesPerWord: syllables / (words || 1),
      sentenceList: input.match(/[^.!?]+[.!?]+/g) || [],
    };
  }, [input]);

  return (
    <div className="space-y-6">
      {/* Tab bar — scrollable */}
      <div className="flex gap-1 p-1 rounded-2xl overflow-x-auto" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              tab === t.id
                ? 'text-white'
                : 'text-surface-400'
            }`}
            style={tab === t.id ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main input — shared across most tabs */}
      {['case', 'count', 'encode', 'hash', 'find-replace', 'readability'].includes(tab) && (
        <div>
          <label className="block text-sm font-semibold text-surface-300 mb-1.5">
            Input Text
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            placeholder="Paste or type your text here..."
            className="w-full px-4 py-3 rounded-2xl text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 resize-y transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </div>
      )}

      {/* === Case Tab === */}
      {tab === 'case' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CASE_OPTIONS.map((opt, i) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setCaseType(i)}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  caseType === i
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                    : 'text-surface-300 hover:bg-white/5'
                }`}
                style={caseType !== i ? { background: 'rgba(255,255,255,0.06)' } : undefined}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {output && (
            <OutputBox text={output} onCopy={() => handleCopy(output)} copied={copied} />
          )}
        </motion.div>
      )}

      {/* === Count Tab === */}
      {tab === 'count' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Words', value: stats.words, icon: '📝' },
              { label: 'Characters', value: stats.chars, icon: '🔤' },
              { label: 'Sentences', value: stats.sentences, icon: '📄' },
              { label: 'Read Time', value: `${stats.readTime} min`, icon: '⏱️' },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-2xl text-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span className="text-2xl mb-1 block" aria-hidden="true">{s.icon}</span>
                <span className="text-2xl font-mono font-bold text-surface-100 block">{s.value}</span>
                <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">{s.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* === Encode Tab === */}
      {tab === 'encode' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ENCODE_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  try { setOutput(opt.fn(input)); } catch { setOutput('Error: invalid input'); }
                }}
                className="min-h-[44px] px-3 py-2 rounded-xl text-sm font-semibold text-surface-300 hover:bg-primary-500/10 hover:text-primary-500 transition-all duration-150"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {output && (
            <OutputBox text={output} onCopy={() => handleCopy(output)} copied={copied} />
          )}
        </motion.div>
      )}

      {/* === Hash Tab === */}
      {tab === 'hash' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex gap-2">
            {HASH_ALGOS.map((algo) => (
              <button
                key={algo}
                type="button"
                onClick={() => setHashAlgo(algo)}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  hashAlgo === algo
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                    : 'text-surface-300 hover:bg-white/5'
                }`}
                style={hashAlgo !== algo ? { background: 'rgba(255,255,255,0.06)' } : undefined}
              >
                {algo}
              </button>
            ))}
          </div>
          {hashResult && (
            <OutputBox text={hashResult} onCopy={() => handleCopy(hashResult)} copied={copied} mono />
          )}
        </motion.div>
      )}

      {/* === Diff Tab === */}
      {tab === 'diff' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-1.5">Original</label>
              <textarea
                value={diffText1}
                onChange={(e) => setDiffText1(e.target.value)}
                rows={6}
                placeholder="Original text..."
                className="w-full px-4 py-3 rounded-2xl text-sm text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-y"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-1.5">Modified</label>
              <textarea
                value={diffText2}
                onChange={(e) => setDiffText2(e.target.value)}
                rows={6}
                placeholder="Modified text..."
                className="w-full px-4 py-3 rounded-2xl text-sm text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-y"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
          </div>
          {diffResult.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="max-h-72 overflow-y-auto">
                {diffResult.map((line, i) => (
                  <div
                    key={i}
                    className={`px-4 py-1 text-sm font-mono ${
                      line.type === 'add'
                        ? 'bg-green-500/10 text-green-400'
                        : line.type === 'remove'
                          ? 'bg-red-500/10 text-red-400'
                          : 'text-surface-400'
                    }`}
                  >
                    <span className="inline-block w-5 text-xs opacity-60">
                      {line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ' '}
                    </span>
                    {line.value || '\u00A0'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* === Lorem Tab === */}
      {tab === 'lorem' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-sm font-semibold text-surface-300">Paragraphs</label>
              <span className="text-sm font-mono font-bold text-primary-500">{loremCount}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={loremCount}
              onChange={(e) => setLoremCount(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none accent-primary-600"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            />
          </div>
          {loremOutput && (
            <OutputBox text={loremOutput} onCopy={() => handleCopy(loremOutput)} copied={copied} />
          )}
        </motion.div>
      )}

      {/* === Find & Replace Tab === */}
      {tab === 'find-replace' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-1.5">Find</label>
              <input
                type="text"
                value={findStr}
                onChange={(e) => setFindStr(e.target.value)}
                placeholder="Search for..."
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-sm text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-surface-300 mb-1.5">Replace</label>
              <input
                type="text"
                value={replaceStr}
                onChange={(e) => setReplaceStr(e.target.value)}
                placeholder="Replace with..."
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-sm text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={frCaseSensitive} onChange={(e) => setFrCaseSensitive(e.target.checked)}
                className="w-5 h-5 rounded border-surface-600 text-primary-600 focus:ring-primary-500" />
              <span className="text-sm text-surface-300">Case sensitive</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={frRegex} onChange={(e) => setFrRegex(e.target.checked)}
                className="w-5 h-5 rounded border-surface-600 text-primary-600 focus:ring-primary-500" />
              <span className="text-sm text-surface-300">Regex</span>
            </label>
            {frCount > 0 && (
              <span className="text-sm font-semibold text-primary-500">{frCount} match{frCount !== 1 ? 'es' : ''}</span>
            )}
          </div>
          {output && findStr && (
            <OutputBox text={output} onCopy={() => handleCopy(output)} copied={copied} />
          )}
        </motion.div>
      )}

      {/* === Readability Tab === */}
      {tab === 'readability' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {readability ? (
            <>
              {/* Flesch gauge + label */}
              <div className="flex flex-col items-center gap-2">
                <svg viewBox="0 0 120 120" className="w-32 h-32">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke={fleschColor(readability.flesch)} strokeWidth="8"
                    strokeDasharray={`${(Math.max(0, Math.min(readability.flesch, 100)) / 100) * 327} 327`}
                    strokeLinecap="round" transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dasharray 0.4s ease' }} />
                  <text x="60" y="55" textAnchor="middle" className="text-2xl font-bold" fill="currentColor">{Math.round(readability.flesch)}</text>
                  <text x="60" y="72" textAnchor="middle" className="text-xs" fill="#888">{fleschLabel(readability.flesch)}</text>
                </svg>
                <p className="text-xs text-surface-500">Flesch Reading Ease</p>
              </div>

              {/* Score cards grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  { label: 'Flesch-Kincaid', value: readability.fkGrade, grade: true },
                  { label: 'Gunning Fog', value: readability.fog, grade: true },
                  { label: 'Coleman-Liau', value: readability.coleman, grade: true },
                  { label: 'ARI', value: readability.ari, grade: true },
                  { label: 'SMOG', value: readability.smog, grade: true },
                ].map((card) => (
                  <div key={card.label} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <p className="text-xs text-surface-500">{card.label}</p>
                    <p className="text-lg font-bold text-surface-100">{card.value.toFixed(1)}</p>
                    {card.grade && <p className="text-xs text-surface-400">{gradeLabel(card.value)}</p>}
                  </div>
                ))}
              </div>

              {/* Text statistics */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'Words', value: readability.words },
                  { label: 'Sentences', value: readability.sentences },
                  { label: 'Syllables', value: readability.syllables },
                  { label: 'Avg Words/Sentence', value: readability.avgWordsPerSentence.toFixed(1) },
                  { label: 'Avg Syllables/Word', value: readability.avgSyllablesPerWord.toFixed(2) },
                ].map((s) => (
                  <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <p className="text-lg font-mono font-bold text-surface-100">{s.value}</p>
                    <p className="text-xs text-surface-500">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Sentence complexity view */}
              {readability.sentenceList.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-surface-300">Sentence Complexity</h4>
                  <div className="p-4 rounded-2xl space-y-1.5 max-h-60 overflow-y-auto" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    {readability.sentenceList.map((sentence, i) => {
                      const wc = sentence.trim().split(/\s+/).filter(Boolean).length;
                      const color = wc <= 14 ? '#10B981' : wc <= 25 ? '#F59E0B' : '#EF4444';
                      return (
                        <p key={i} className="text-sm leading-relaxed" style={{ color }}>
                          <span className="inline-block w-8 text-xs font-mono opacity-50 mr-1">{wc}w</span>
                          {sentence.trim()}
                        </p>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 text-xs text-surface-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} /> Easy (≤14 words)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#F59E0B' }} /> Medium (15–25)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#EF4444' }} /> Complex (26+)</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-surface-500 text-sm">
              Type or paste text above to see readability scores.
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function OutputBox({ text, onCopy, copied, mono }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <pre className={`text-sm whitespace-pre-wrap break-all text-surface-100 max-h-60 overflow-y-auto ${mono ? 'font-mono' : ''}`}>
          {text}
        </pre>
      </div>
      <motion.button
        type="button"
        onClick={onCopy}
        whileTap={{ scale: 0.9 }}
        className="absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 transition-colors"
        aria-label="Copy output"
      >
        {copied ? '✓' : '📋'}
      </motion.button>
    </motion.div>
  );
}
