import { useState } from 'react';
import { motion } from 'framer-motion';

function validate(data, schema, path = '') {
  const errors = [];
  if (!schema || typeof schema !== 'object') return errors;

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data;
    if (!types.includes(actual)) errors.push(`${path || 'root'}: expected type "${types.join('|')}", got "${actual}"`);
  }
  if (schema.enum && !schema.enum.some(v => JSON.stringify(v) === JSON.stringify(data)))
    errors.push(`${path || 'root'}: value must be one of [${schema.enum.map(v => JSON.stringify(v)).join(', ')}]`);
  if (typeof data === 'string') {
    if (schema.minLength !== undefined && data.length < schema.minLength)
      errors.push(`${path || 'root'}: minLength ${schema.minLength}, got ${data.length}`);
    if (schema.maxLength !== undefined && data.length > schema.maxLength)
      errors.push(`${path || 'root'}: maxLength ${schema.maxLength}, got ${data.length}`);
    if (schema.pattern && !new RegExp(schema.pattern).test(data))
      errors.push(`${path || 'root'}: does not match pattern "${schema.pattern}"`);
  }
  if (typeof data === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum)
      errors.push(`${path || 'root'}: minimum ${schema.minimum}, got ${data}`);
    if (schema.maximum !== undefined && data > schema.maximum)
      errors.push(`${path || 'root'}: maximum ${schema.maximum}, got ${data}`);
  }
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    if (schema.required) {
      schema.required.forEach(k => {
        if (!(k in data)) errors.push(`${path || 'root'}: missing required property "${k}"`);
      });
    }
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([k, subSchema]) => {
        if (k in data) errors.push(...validate(data[k], subSchema, `${path}.${k}`));
      });
    }
  }
  if (Array.isArray(data) && schema.items) {
    data.forEach((item, i) => errors.push(...validate(item, schema.items, `${path}[${i}]`)));
  }
  return errors;
}

const SAMPLE_DATA = `{
  "name": "Alice",
  "age": 30,
  "email": "alice@example.com"
}`;

const SAMPLE_SCHEMA = `{
  "type": "object",
  "required": ["name", "age"],
  "properties": {
    "name": { "type": "string", "minLength": 1 },
    "age": { "type": "number", "minimum": 0, "maximum": 150 },
    "email": { "type": "string", "pattern": ".+@.+" }
  }
}`;

export default function JSONSchemaValidator() {
  const [jsonInput, setJsonInput] = useState('');
  const [schemaInput, setSchemaInput] = useState('');
  const [result, setResult] = useState(null);

  const runValidate = () => {
    try {
      const data = JSON.parse(jsonInput);
      const schema = JSON.parse(schemaInput);
      const errors = validate(data, schema);
      setResult({ errors, valid: errors.length === 0 });
    } catch (e) {
      setResult({ errors: [`Parse error: ${e.message}`], valid: false });
    }
  };

  const loadExample = () => { setJsonInput(SAMPLE_DATA); setSchemaInput(SAMPLE_SCHEMA); setResult(null); };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex justify-end">
          <button onClick={loadExample} className="text-xs px-3 py-1 hover:bg-white/5 rounded-lg transition-colors text-surface-400">
            Load Example
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">JSON Data</label>
            <textarea rows={10} value={jsonInput} onChange={e => setJsonInput(e.target.value)} placeholder='{"name": "Alice"}'
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-surface-300 block mb-1">JSON Schema</label>
            <textarea rows={10} value={schemaInput} onChange={e => setSchemaInput(e.target.value)} placeholder='{"type": "object"}'
              className="w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono text-sm" />
          </div>
        </div>
        <button onClick={runValidate} className="px-4 py-2 bg-blue-500 hover:text-white rounded-xl font-medium transition-colors">Validate</button>
        {result && (
          <div className={`rounded-xl p-4 border ${result.valid ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ' border-red-200 dark:border-red-800'}`}>
            {result.valid ? (
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-semibold">
                <span>✓</span> Valid — JSON matches the schema
              </div>
            ) : (
              <div>
                <div className="text-red-700 dark:text-red-300 font-semibold mb-2">✗ {result.errors.length} validation error{result.errors.length !== 1 ? 's' : ''}</div>
                <ul className="space-y-1">
                  {result.errors.map((e, i) => <li key={i} className="text-sm text-red-600 dark:text-red-400 font-mono">{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
