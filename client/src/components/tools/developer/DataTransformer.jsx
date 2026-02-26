import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  jsonToCsv,
  csvToJson,
  jsonToYaml,
  yamlToJson,
  jsonToXml,
  xmlToJson,
  formatJson,
  formatXml,
  validateJson,
  validateXml,
} from '../../../utils/dataTransform';

const CONVERSIONS = [
  { id: 'json-csv', label: 'JSON → CSV', from: 'JSON', to: 'CSV' },
  { id: 'csv-json', label: 'CSV → JSON', from: 'CSV', to: 'JSON' },
  { id: 'json-yaml', label: 'JSON → YAML', from: 'JSON', to: 'YAML' },
  { id: 'yaml-json', label: 'YAML → JSON', from: 'YAML', to: 'JSON' },
  { id: 'json-xml', label: 'JSON → XML', from: 'JSON', to: 'XML' },
  { id: 'xml-json', label: 'XML → JSON', from: 'XML', to: 'JSON' },
];

function convert(mode, input) {
  switch (mode) {
    case 'json-csv': return jsonToCsv(JSON.parse(input));
    case 'csv-json': return JSON.stringify(csvToJson(input), null, 2);
    case 'json-yaml': return jsonToYaml(JSON.parse(input));
    case 'yaml-json': return JSON.stringify(yamlToJson(input), null, 2);
    case 'json-xml': return jsonToXml(JSON.parse(input));
    case 'xml-json': return JSON.stringify(xmlToJson(input), null, 2);
    default: return '';
  }
}

export default function DataTransformer() {
  const [mode, setMode] = useState('json-csv');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const activeConversion = CONVERSIONS.find((c) => c.id === mode);

  const handleConvert = useCallback(() => {
    setError('');
    setOutput('');
    setCopied(false);
    try {
      if (!input.trim()) {
        setError('Please enter some input data.');
        return;
      }
      const result = convert(mode, input);
      setOutput(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
    } catch (err) {
      setError(err.message || 'Conversion failed. Check your input format.');
    }
  }, [mode, input]);

  const handleFormat = useCallback(() => {
    setError('');
    const fromType = activeConversion?.from;
    if (fromType === 'JSON') {
      const res = formatJson(input);
      if (res.error) setError(res.error);
      else setInput(res.result);
    } else if (fromType === 'XML') {
      try {
        setInput(formatXml(input));
      } catch (err) {
        setError(err.message);
      }
    }
  }, [input, activeConversion]);

  const handleValidate = useCallback(() => {
    setError('');
    const fromType = activeConversion?.from;
    if (fromType === 'JSON') {
      const res = validateJson(input);
      if (res.valid) setError('');
      else setError(res.error || 'Invalid JSON');
      if (res.valid) setOutput('✓ Valid JSON');
    } else if (fromType === 'XML') {
      const res = validateXml(input);
      if (res.valid) setOutput('✓ Valid XML');
      else setError(res.error || 'Invalid XML');
    }
  }, [input, activeConversion]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const showFormatBtn = activeConversion?.from === 'JSON' || activeConversion?.from === 'XML';
  const showValidateBtn = showFormatBtn;

  return (
    <div className="space-y-6">
      {/* Conversion selector */}
      <div className="flex flex-wrap gap-2">
        {CONVERSIONS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setMode(c.id);
              setOutput('');
              setError('');
              setCopied(false);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 min-h-[44px] ${
              mode === c.id
                ? 'bg-primary-500/10 text-primary-500 border border-primary-500/30'
                : 'text-surface-400 hover:bg-white/5'
            }`}
            style={mode !== c.id ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' } : undefined}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Two-pane layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div className="space-y-2">
          <label
            htmlFor="transform-input"
            className="block text-sm font-semibold text-surface-300"
          >
            Input ({activeConversion?.from})
          </label>
          <textarea
            id="transform-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Paste your ${activeConversion?.from} here...`}
            rows={12}
            className="w-full px-4 py-3 rounded-2xl text-sm font-mono text-surface-100 placeholder:text-surface-400 resize-y focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="transform-output"
              className="block text-sm font-semibold text-surface-300"
            >
              Output ({activeConversion?.to})
            </label>
            {output && (
              <motion.button
                type="button"
                onClick={handleCopy}
                whileTap={{ scale: 0.9 }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-sm font-semibold bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 transition-colors px-3"
                aria-label="Copy output"
              >
                {copied ? '✓ Copied' : '📋 Copy'}
              </motion.button>
            )}
          </div>
          <textarea
            id="transform-output"
            value={output}
            readOnly
            rows={12}
            className="w-full px-4 py-3 rounded-2xl text-sm font-mono text-surface-100 placeholder:text-surface-400 resize-y"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            placeholder="Converted output will appear here..."
            spellCheck={false}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-500"
          role="alert"
        >
          {error}
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <motion.button
          type="button"
          onClick={handleConvert}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="flex-1 min-h-[52px] px-6 py-3.5 rounded-2xl text-base font-bold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200"
        >
          Convert
        </motion.button>
        {showFormatBtn && (
          <motion.button
            type="button"
            onClick={handleFormat}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="min-h-[52px] px-6 py-3.5 rounded-2xl text-base font-bold text-surface-300 hover:bg-white/5 transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Format
          </motion.button>
        )}
        {showValidateBtn && (
          <motion.button
            type="button"
            onClick={handleValidate}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="min-h-[52px] px-6 py-3.5 rounded-2xl text-base font-bold text-surface-300 hover:bg-white/5 transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Validate
          </motion.button>
        )}
      </div>
    </div>
  );
}
