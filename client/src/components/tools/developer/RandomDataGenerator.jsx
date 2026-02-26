import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Word lists ───────────────────────────────────────────────────────
const FIRST_NAMES = ['James','Mary','John','Patricia','Robert','Jennifer','Michael','Linda','David','Elizabeth','William','Barbara','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Christopher','Karen','Charles','Lisa','Daniel','Nancy','Matthew','Betty','Anthony','Margaret','Mark','Sandra','Donald','Ashley','Steven','Kimberly','Paul','Emily','Andrew','Donna','Joshua','Michelle','Kenneth','Carol','Kevin','Amanda','Brian','Dorothy','George','Melissa','Timothy','Deborah'];
const LAST_NAMES = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores'];
const CITIES = ['New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia','San Antonio','San Diego','Dallas','San Jose','Austin','Jacksonville','Fort Worth','Columbus','Charlotte','Indianapolis','San Francisco','Seattle','Denver','Nashville','Oklahoma City','Portland','Las Vegas','Memphis','Louisville','Baltimore','Milwaukee','Albuquerque','Tucson','Fresno'];
const STREETS = ['Main St','Oak Ave','Maple Dr','Cedar Ln','Pine Rd','Elm St','Washington Blvd','Park Ave','Lake Dr','Hill Rd','River Rd','Sunset Blvd','Broadway','Highland Ave','Forest Dr','Meadow Ln','Spring St','Valley Rd','Church St','School Rd','Mill St','Center St','Union Ave','Liberty St','Franklin Blvd'];
const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
const COUNTRIES = ['United States','United Kingdom','Canada','Australia','Germany','France','India','Japan','Brazil','Mexico','Italy','Spain','Netherlands','Sweden','Norway','Denmark','Switzerland','South Korea','Singapore','New Zealand'];
const DOMAINS = ['gmail.com','yahoo.com','outlook.com','example.com','test.org','company.io','mail.com','proton.me','fastmail.com','icloud.com'];
const COMPANIES = ['Acme Corp','Globex','Initech','Umbrella Corp','Stark Industries','Wayne Enterprises','Cyberdyne','Soylent Corp','Massive Dynamic','Hooli','Pied Piper','Dunder Mifflin','Sterling Cooper','Wonka Industries','Aperture Science','Weyland-Yutani','Tyrell Corp','Oscorp','LexCorp','Dharma Initiative'];
const LOREM_WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(' ');
const TLD = ['.com','.org','.net','.io','.dev','.co','.app','.tech'];
const ADJECTIVES = ['quick','lazy','happy','sad','bright','dark','cool','warm','fast','slow','big','small','old','new','smart','bold','calm','wild','free','pure'];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, dec = 2) => (Math.random() * (max - min) + min).toFixed(dec);

// ── Generators ───────────────────────────────────────────────────────

function luhnChecksum(partial) {
  const digits = partial.split('').map(Number);
  let sum = 0;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i];
    if ((digits.length - i) % 2 === 0) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return (10 - (sum % 10)) % 10;
}

const generators = {
  firstName: () => rand(FIRST_NAMES),
  lastName: () => rand(LAST_NAMES),
  fullName: () => `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
  email: () => `${rand(FIRST_NAMES).toLowerCase()}.${rand(LAST_NAMES).toLowerCase()}${randInt(1,99)}@${rand(DOMAINS)}`,
  phoneUS: () => `+1 (${randInt(200,999)}) ${randInt(100,999)}-${randInt(1000,9999)}`,
  phoneUK: () => `+44 ${randInt(7000,7999)} ${randInt(100000,999999)}`,
  phoneIN: () => `+91 ${randInt(70000,99999)} ${randInt(10000,99999)}`,
  address: () => `${randInt(1,9999)} ${rand(STREETS)}, ${rand(CITIES)}, ${rand(STATES)} ${randInt(10000,99999)}`,
  street: () => `${randInt(1,9999)} ${rand(STREETS)}`,
  city: () => rand(CITIES),
  state: () => rand(STATES),
  zip: () => String(randInt(10000, 99999)),
  country: () => rand(COUNTRIES),
  uuid: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16); }),
  dateRandom: () => { const d = new Date(Date.now() - randInt(0, 365*10) * 86400000); return d.toISOString().slice(0,10); },
  integer: (min = 0, max = 10000) => randInt(min, max),
  float: (min = 0, max = 1000) => Number(randFloat(min, max)),
  loremSentence: () => { const len = randInt(6,15); const words = Array.from({length:len}, ()=>rand(LOREM_WORDS)); words[0] = words[0][0].toUpperCase()+words[0].slice(1); return words.join(' ')+'.'; },
  loremParagraph: () => Array.from({length:randInt(3,6)}, ()=>generators.loremSentence()).join(' '),
  url: () => `https://${rand(ADJECTIVES)}-${rand(LAST_NAMES).toLowerCase()}${rand(TLD)}/${rand(LOREM_WORDS)}`,
  ipv4: () => Array.from({length:4}, ()=>randInt(0,255)).join('.'),
  ipv6: () => Array.from({length:8}, ()=>randInt(0,0xFFFF).toString(16).padStart(4,'0')).join(':'),
  creditCard: () => { const prefix = rand(['4','51','52','53','54','55','37']); const len = prefix.startsWith('3') ? 15 : 16; let num = prefix; while(num.length < len-1) num += randInt(0,9); num += luhnChecksum(num); return num.replace(/(.{4})/g,'$1 ').trim(); },
  colorHex: () => '#'+Math.floor(Math.random()*0xFFFFFF).toString(16).padStart(6,'0').toUpperCase(),
  colorRGB: () => `rgb(${randInt(0,255)}, ${randInt(0,255)}, ${randInt(0,255)})`,
  company: () => rand(COMPANIES),
  username: () => `${rand(ADJECTIVES)}${rand(FIRST_NAMES)}${randInt(1,999)}`,
  password: () => { const chars='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'; return Array.from({length:randInt(12,20)}, ()=>chars[randInt(0,chars.length-1)]).join(''); },
  boolean: () => Math.random() > 0.5,
  number: (min = 0, max = 10000) => randInt(min, max),
};

const DATA_TYPES = [
  { id: 'fullName', label: 'Full Name', group: 'People' },
  { id: 'firstName', label: 'First Name', group: 'People' },
  { id: 'lastName', label: 'Last Name', group: 'People' },
  { id: 'email', label: 'Email', group: 'People' },
  { id: 'username', label: 'Username', group: 'People' },
  { id: 'password', label: 'Password', group: 'People' },
  { id: 'phoneUS', label: 'Phone (US)', group: 'Contact' },
  { id: 'phoneUK', label: 'Phone (UK)', group: 'Contact' },
  { id: 'phoneIN', label: 'Phone (IN)', group: 'Contact' },
  { id: 'address', label: 'Full Address', group: 'Location' },
  { id: 'street', label: 'Street', group: 'Location' },
  { id: 'city', label: 'City', group: 'Location' },
  { id: 'state', label: 'State', group: 'Location' },
  { id: 'zip', label: 'Zip Code', group: 'Location' },
  { id: 'country', label: 'Country', group: 'Location' },
  { id: 'uuid', label: 'UUID', group: 'Identifiers' },
  { id: 'dateRandom', label: 'Date', group: 'Data' },
  { id: 'integer', label: 'Integer', group: 'Data' },
  { id: 'float', label: 'Float', group: 'Data' },
  { id: 'boolean', label: 'Boolean', group: 'Data' },
  { id: 'loremSentence', label: 'Lorem Sentence', group: 'Text' },
  { id: 'loremParagraph', label: 'Lorem Paragraph', group: 'Text' },
  { id: 'url', label: 'URL', group: 'Web' },
  { id: 'ipv4', label: 'IPv4 Address', group: 'Web' },
  { id: 'ipv6', label: 'IPv6 Address', group: 'Web' },
  { id: 'creditCard', label: 'Credit Card (fake)', group: 'Finance' },
  { id: 'colorHex', label: 'Color (HEX)', group: 'Design' },
  { id: 'colorRGB', label: 'Color (RGB)', group: 'Design' },
  { id: 'company', label: 'Company Name', group: 'Business' },
];

const OUTPUT_FORMATS = ['JSON', 'CSV', 'SQL', 'TSV'];

const cardStyle = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };
const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' };

function generateValue(typeId) {
  const gen = generators[typeId];
  if (!gen) return '';
  const val = gen();
  return typeof val === 'boolean' ? val : typeof val === 'number' ? val : String(val);
}

function formatOutput(data, columns, format, tableName = 'data') {
  if (format === 'JSON') return JSON.stringify(data, null, 2);
  if (format === 'CSV') {
    const header = columns.map(c => c.name).join(',');
    const rows = data.map(row => columns.map(c => {
      const v = String(row[c.name]);
      return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g,'""')}"` : v;
    }).join(','));
    return [header, ...rows].join('\n');
  }
  if (format === 'TSV') {
    const header = columns.map(c => c.name).join('\t');
    const rows = data.map(row => columns.map(c => String(row[c.name])).join('\t'));
    return [header, ...rows].join('\n');
  }
  if (format === 'SQL') {
    const cols = columns.map(c => c.name).join(', ');
    return data.map(row => {
      const vals = columns.map(c => {
        const v = row[c.name];
        if (typeof v === 'number' || typeof v === 'boolean') return String(v);
        return `'${String(v).replace(/'/g,"''")}'`;
      }).join(', ');
      return `INSERT INTO ${tableName} (${cols}) VALUES (${vals});`;
    }).join('\n');
  }
  return '';
}

export default function RandomDataGenerator() {
  const [mode, setMode] = useState('simple');
  const [simpleType, setSimpleType] = useState('fullName');
  const [count, setCount] = useState(10);
  const [outputFormat, setOutputFormat] = useState('JSON');
  const [results, setResults] = useState('');
  const [copied, setCopied] = useState(false);
  const [tableName, setTableName] = useState('data');

  // Schema builder state
  const [columns, setColumns] = useState([
    { name: 'name', type: 'fullName' },
    { name: 'email', type: 'email' },
    { name: 'age', type: 'integer' },
    { name: 'city', type: 'city' },
  ]);

  const groups = useMemo(() => {
    const map = {};
    DATA_TYPES.forEach(dt => { if (!map[dt.group]) map[dt.group] = []; map[dt.group].push(dt); });
    return map;
  }, []);

  const generate = useCallback(() => {
    const n = Math.min(Math.max(1, count), 1000);
    if (mode === 'simple') {
      const items = Array.from({ length: n }, () => generateValue(simpleType));
      if (outputFormat === 'JSON') {
        setResults(JSON.stringify(items, null, 2));
      } else {
        setResults(items.join('\n'));
      }
    } else {
      const data = Array.from({ length: n }, () => {
        const row = {};
        columns.forEach(col => { row[col.name || 'field'] = generateValue(col.type); });
        return row;
      });
      setResults(formatOutput(data, columns, outputFormat, tableName));
    }
  }, [mode, simpleType, count, outputFormat, columns, tableName]);

  const copy = () => { navigator.clipboard.writeText(results); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  const download = () => {
    const ext = { JSON: 'json', CSV: 'csv', SQL: 'sql', TSV: 'tsv' }[outputFormat] || 'txt';
    const blob = new Blob([results], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `generated-data.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const addColumn = () => setColumns([...columns, { name: `field${columns.length + 1}`, type: 'fullName' }]);
  const removeColumn = (i) => setColumns(columns.filter((_, j) => j !== i));
  const updateColumn = (i, field, value) => {
    const next = [...columns];
    next[i] = { ...next[i], [field]: value };
    setColumns(next);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      {/* Mode Toggle */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <div className="flex gap-2 mb-4">
          {['simple', 'schema'].map(m => (
            <button key={m} onClick={() => { setMode(m); setResults(''); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === m ? 'text-white' : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'}`}
              style={mode === m ? { background: 'linear-gradient(135deg, #f97316, #f59e0b)' } : {}}>
              {m === 'simple' ? '🎲 Quick Generate' : '📐 Schema Builder'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {mode === 'simple' ? (
            <motion.div key="simple" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-surface-300 block mb-1.5">Data Type</label>
                  <select value={simpleType} onChange={e => setSimpleType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={inputStyle}>
                    {Object.entries(groups).map(([group, types]) => (
                      <optgroup key={group} label={group}>
                        {types.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-surface-300 block mb-1.5">Count (1–1000)</label>
                  <input type="number" min={1} max={1000} value={count} onChange={e => setCount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={inputStyle} />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="schema" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-surface-300">Schema Columns</label>
                <button onClick={addColumn} className="text-xs text-primary-400 hover:text-primary-300 transition-colors">+ Add Column</button>
              </div>
              <div className="space-y-2">
                {columns.map((col, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={col.name} onChange={e => updateColumn(i, 'name', e.target.value)} placeholder="Column name"
                      className="flex-1 px-2.5 py-2 rounded-xl text-sm text-surface-100 font-mono focus:outline-none focus:ring-1 focus:ring-primary-500/40" style={inputStyle} />
                    <select value={col.type} onChange={e => updateColumn(i, 'type', e.target.value)}
                      className="flex-1 px-2.5 py-2 rounded-xl text-sm text-surface-100 focus:outline-none focus:ring-1 focus:ring-primary-500/40" style={inputStyle}>
                      {Object.entries(groups).map(([group, types]) => (
                        <optgroup key={group} label={group}>
                          {types.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </optgroup>
                      ))}
                    </select>
                    <button onClick={() => removeColumn(i)} disabled={columns.length <= 1}
                      className="text-surface-500 hover:text-red-400 transition-colors p-1 disabled:opacity-30" aria-label="Remove column">✕</button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-surface-300 block mb-1.5">Count (1–1000)</label>
                  <input type="number" min={1} max={1000} value={count} onChange={e => setCount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={inputStyle} />
                </div>
                {outputFormat === 'SQL' && (
                  <div>
                    <label className="text-sm font-medium text-surface-300 block mb-1.5">Table Name</label>
                    <input value={tableName} onChange={e => setTableName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-surface-100 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/40" style={inputStyle} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Output Format + Generate */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1">
            {OUTPUT_FORMATS.map(f => (
              <button key={f} onClick={() => setOutputFormat(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${outputFormat === f ? 'bg-white/10 text-white' : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'}`}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={generate}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all ml-auto"
            style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}>
            🎲 Generate
          </button>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {results && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl p-4 space-y-3" style={cardStyle}>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-surface-300">Output</label>
              <div className="flex gap-2">
                <button onClick={copy}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-surface-300 hover:text-white hover:bg-white/10 transition-colors">
                  {copied ? '✓ Copied' : '📋 Copy'}
                </button>
                <button onClick={download}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-surface-300 hover:text-white hover:bg-white/10 transition-colors">
                  ⬇ Download
                </button>
              </div>
            </div>
            <textarea readOnly value={results} rows={Math.min(20, results.split('\n').length + 1)}
              className="w-full font-mono text-sm text-surface-200 p-3 rounded-xl resize-y focus:outline-none" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
