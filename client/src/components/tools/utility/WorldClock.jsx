import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Data ──────────────────────────────────────────────────────────────
const DEFAULT_CITIES = [
  { id: 'new-york', name: 'New York', country: 'US', flag: '🇺🇸', tz: 'America/New_York' },
  { id: 'london', name: 'London', country: 'UK', flag: '🇬🇧', tz: 'Europe/London' },
  { id: 'tokyo', name: 'Tokyo', country: 'JP', flag: '🇯🇵', tz: 'Asia/Tokyo' },
  { id: 'sydney', name: 'Sydney', country: 'AU', flag: '🇦🇺', tz: 'Australia/Sydney' },
  { id: 'dubai', name: 'Dubai', country: 'AE', flag: '🇦🇪', tz: 'Asia/Dubai' },
  { id: 'singapore', name: 'Singapore', country: 'SG', flag: '🇸🇬', tz: 'Asia/Singapore' },
  { id: 'mumbai', name: 'Mumbai', country: 'IN', flag: '🇮🇳', tz: 'Asia/Kolkata' },
  { id: 'berlin', name: 'Berlin', country: 'DE', flag: '🇩🇪', tz: 'Europe/Berlin' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'BR', flag: '🇧🇷', tz: 'America/Sao_Paulo' },
  { id: 'los-angeles', name: 'Los Angeles', country: 'US', flag: '🇺🇸', tz: 'America/Los_Angeles' },
];

const IANA_GROUPS = (() => {
  const zones = Intl.supportedValuesOf('timeZone');
  const grouped = {};
  zones.forEach(tz => {
    const [region] = tz.split('/');
    if (!grouped[region]) grouped[region] = [];
    grouped[region].push(tz);
  });
  return grouped;
})();

const ALL_TIMEZONES = Object.values(IANA_GROUPS).flat();

const STORAGE_KEY = 'worldclock-cities';

function loadSavedCities() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

function saveCities(cities) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cities)); } catch {}
}

function formatTime(tz) {
  const now = new Date();
  const time = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
  const date = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' }).format(now);
  const abbr = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(now).find(p => p.type === 'timeZoneName')?.value || '';
  const hour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).format(now), 10);
  return { time, date, abbr, hour };
}

function getOffsetHours(tz) {
  const now = new Date();
  const str = now.toLocaleString('en-US', { timeZone: tz });
  const local = new Date(str);
  const utcStr = now.toLocaleString('en-US', { timeZone: 'UTC' });
  const utc = new Date(utcStr);
  return (local - utc) / 3600000;
}

// ── Styles ────────────────────────────────────────────────────────────
const card = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' };
const input = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' };
const gradient = 'linear-gradient(135deg, #6366f1, #8b5cf6)';

// ── Sub-components ────────────────────────────────────────────────────
function CityCard({ city, onRemove, isCustom }) {
  const [info, setInfo] = useState(() => formatTime(city.tz));

  useEffect(() => {
    const id = setInterval(() => setInfo(formatTime(city.tz)), 1000);
    return () => clearInterval(id);
  }, [city.tz]);

  const isNight = info.hour < 6 || info.hour >= 20;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="rounded-2xl p-4 relative group"
      style={card}
    >
      {isCustom && (
        <button
          onClick={() => onRemove(city.id)}
          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-surface-400 hover:text-red-400 hover:bg-red-500/10"
          aria-label={`Remove ${city.name}`}
          style={{ minWidth: 44, minHeight: 44 }}
        >
          ✕
        </button>
      )}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl" aria-hidden="true">{city.flag}</span>
        <div>
          <div className="font-semibold text-surface-100 text-sm">{city.name}</div>
          <div className="text-xs text-surface-500">{info.abbr}</div>
        </div>
        {isNight && <span className="ml-auto text-lg" aria-label="Nighttime">🌙</span>}
      </div>
      <div className="text-3xl font-bold text-surface-50 font-mono tracking-tight">{info.time}</div>
      <div className="text-xs text-surface-400 mt-1">{info.date}</div>
    </motion.div>
  );
}

function TimezoneSelect({ value, onChange, label }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return IANA_GROUPS;
    const q = search.toLowerCase();
    const result = {};
    Object.entries(IANA_GROUPS).forEach(([region, zones]) => {
      const matched = zones.filter(z => z.toLowerCase().includes(q));
      if (matched.length) result[region] = matched;
    });
    return result;
  }, [search]);

  return (
    <div className="relative flex-1">
      <label className="block text-xs font-medium text-surface-400 mb-1">{label}</label>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 rounded-xl text-sm text-left text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 truncate"
        style={{ ...input, minHeight: 44 }}
      >
        {value || 'Select timezone…'}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-xl shadow-xl" style={{ ...card, background: 'rgba(30,30,32,0.98)' }}>
          <div className="sticky top-0 p-2" style={{ background: 'rgba(30,30,32,0.98)' }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search timezones…"
              className="w-full px-3 py-2 rounded-lg text-sm text-surface-100 focus:outline-none"
              style={input}
              autoFocus
            />
          </div>
          {Object.entries(filtered).map(([region, zones]) => (
            <div key={region}>
              <div className="px-3 py-1 text-xs font-semibold text-surface-500 uppercase tracking-wider">{region}</div>
              {zones.map(tz => (
                <button
                  key={tz}
                  onClick={() => { onChange(tz); setOpen(false); setSearch(''); }}
                  className="w-full text-left px-3 py-1.5 text-sm text-surface-300 hover:bg-primary-500/10 hover:text-primary-400 transition-colors"
                  style={{ minHeight: 36 }}
                >
                  {tz.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimezoneConverter() {
  const [fromTz, setFromTz] = useState('America/New_York');
  const [toTz, setToTz] = useState('Asia/Tokyo');
  const [dateTime, setDateTime] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [converted, setConverted] = useState('');

  const convert = useCallback(() => {
    try {
      const d = new Date(dateTime);
      if (isNaN(d)) { setConverted('Invalid date'); return; }
      const fromOffset = getOffsetHours(fromTz);
      const toOffset = getOffsetHours(toTz);
      const utc = new Date(d.getTime() - fromOffset * 3600000 + d.getTimezoneOffset() * 60000);
      const result = new Date(utc.getTime() + toOffset * 3600000);
      setConverted(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'UTC',
          weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
        }).format(result)
      );
    } catch { setConverted('Conversion error'); }
  }, [fromTz, toTz, dateTime]);

  useEffect(() => { convert(); }, [convert]);

  const swap = () => { setFromTz(toTz); setToTz(fromTz); };

  return (
    <div className="rounded-2xl p-6 space-y-4" style={card}>
      <h2 className="text-lg font-bold text-surface-100">Timezone Converter</h2>
      <div className="flex flex-col sm:flex-row items-end gap-3">
        <TimezoneSelect label="From" value={fromTz} onChange={setFromTz} />
        <button
          onClick={swap}
          className="px-3 py-2.5 rounded-xl text-surface-300 hover:text-primary-400 hover:bg-primary-500/10 transition-colors shrink-0"
          style={{ ...input, minWidth: 44, minHeight: 44 }}
          aria-label="Swap timezones"
        >
          ⇄
        </button>
        <TimezoneSelect label="To" value={toTz} onChange={setToTz} />
      </div>
      <div>
        <label className="block text-xs font-medium text-surface-400 mb-1">Date & Time</label>
        <input
          type="datetime-local"
          value={dateTime}
          onChange={e => setDateTime(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          style={{ ...input, minHeight: 44 }}
        />
      </div>
      {converted && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl px-4 py-3"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
        >
          <div className="text-xs text-surface-400 mb-1">Converted Time</div>
          <div className="text-lg font-bold text-primary-400 font-mono">{converted}</div>
        </motion.div>
      )}
    </div>
  );
}

function MeetingPlanner() {
  const [selectedZones, setSelectedZones] = useState(['America/New_York', 'Europe/London', 'Asia/Tokyo']);
  const [addingZone, setAddingZone] = useState(false);

  const addZone = (tz) => {
    if (selectedZones.length < 4 && !selectedZones.includes(tz)) {
      setSelectedZones([...selectedZones, tz]);
    }
    setAddingZone(false);
  };

  const removeZone = (tz) => setSelectedZones(selectedZones.filter(z => z !== tz));

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const bestMeeting = useMemo(() => {
    let bestStart = -1;
    let bestLen = 0;
    for (let h = 0; h < 24; h++) {
      let allBusiness = true;
      for (const tz of selectedZones) {
        const offset = getOffsetHours(tz);
        const localH = ((h + offset - getOffsetHours('UTC')) % 24 + 24) % 24;
        if (localH < 9 || localH >= 17) { allBusiness = false; break; }
      }
      if (allBusiness) {
        if (bestStart === -1) bestStart = h;
        bestLen++;
      } else if (bestStart !== -1 && bestLen > 0) {
        break;
      }
    }
    if (bestStart === -1) return null;
    return { start: bestStart, end: (bestStart + bestLen) % 24 };
  }, [selectedZones]);

  return (
    <div className="rounded-2xl p-6 space-y-4" style={card}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-surface-100">Meeting Planner</h2>
        {selectedZones.length < 4 && (
          <button
            onClick={() => setAddingZone(!addingZone)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-primary-400 hover:bg-primary-500/10 transition-colors"
            style={{ ...input, minHeight: 44 }}
          >
            + Add Timezone
          </button>
        )}
      </div>

      {addingZone && (
        <div className="flex gap-2">
          <TimezoneSelect label="" value="" onChange={addZone} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {selectedZones.map(tz => (
          <span key={tz} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-primary-300" style={{ background: 'rgba(99,102,241,0.12)' }}>
            {tz.split('/').pop().replace(/_/g, ' ')}
            <button onClick={() => removeZone(tz)} className="ml-1 hover:text-red-400" aria-label={`Remove ${tz}`}>✕</button>
          </span>
        ))}
      </div>

      {bestMeeting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl px-4 py-3"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <div className="text-xs text-green-400 font-medium">Best Meeting Window (UTC)</div>
          <div className="text-sm text-surface-100 mt-0.5">
            {String(bestMeeting.start).padStart(2, '0')}:00 – {String(bestMeeting.end).padStart(2, '0')}:00 UTC
          </div>
        </motion.div>
      )}
      {!bestMeeting && selectedZones.length >= 2 && (
        <div className="rounded-xl px-4 py-3 text-xs text-amber-400" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
          No overlapping business hours (9 AM – 5 PM) found across all selected timezones.
        </div>
      )}

      <div className="overflow-x-auto -mx-2 px-2">
        <div className="min-w-[600px]">
          {selectedZones.map(tz => {
            const offset = getOffsetHours(tz);
            const label = tz.split('/').pop().replace(/_/g, ' ');
            return (
              <div key={tz} className="flex items-center gap-2 mb-2">
                <div className="w-28 text-xs text-surface-400 truncate shrink-0">{label}</div>
                <div className="flex flex-1 gap-px">
                  {hours.map(h => {
                    const localH = ((h + offset - getOffsetHours('UTC')) % 24 + 24) % 24;
                    const isBusiness = localH >= 9 && localH < 17;
                    const isOverlap = bestMeeting && h >= bestMeeting.start && h < bestMeeting.start + ((bestMeeting.end - bestMeeting.start + 24) % 24 || 24);
                    let bg = 'rgba(255,255,255,0.04)';
                    if (isBusiness) bg = 'rgba(99,102,241,0.2)';
                    if (isBusiness && isOverlap) bg = 'rgba(34,197,94,0.3)';
                    return (
                      <div
                        key={h}
                        className="flex-1 h-7 rounded-sm relative group/cell"
                        style={{ background: bg, minWidth: 4 }}
                        title={`${String(Math.round(localH)).padStart(2, '0')}:00 local`}
                      >
                        {h % 6 === 0 && (
                          <span className="absolute -bottom-4 left-0 text-[9px] text-surface-500">{String(h).padStart(2, '0')}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-2 mt-6">
            <div className="w-28" />
            <div className="flex gap-4 text-[10px] text-surface-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(99,102,241,0.2)' }} /> Business hours</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(34,197,94,0.3)' }} /> Overlap</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────
export default function WorldClock() {
  const [cities, setCities] = useState(() => loadSavedCities() || DEFAULT_CITIES);
  const [tab, setTab] = useState('clocks');
  const [addOpen, setAddOpen] = useState(false);
  const [addTz, setAddTz] = useState('');

  useEffect(() => { saveCities(cities); }, [cities]);

  const addCity = () => {
    if (!addTz) return;
    const name = addTz.split('/').pop().replace(/_/g, ' ');
    const id = `custom-${addTz}`;
    if (cities.find(c => c.tz === addTz)) return;
    setCities([...cities, { id, name, country: '', flag: '🌐', tz: addTz, custom: true }]);
    setAddTz('');
    setAddOpen(false);
  };

  const removeCity = (id) => setCities(cities.filter(c => c.id !== id));

  const tabs = [
    { key: 'clocks', label: '🕐 World Clocks' },
    { key: 'converter', label: '🔄 Converter' },
    { key: 'meeting', label: '📅 Meeting Planner' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === t.key
                ? 'text-white shadow-lg'
                : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'
            }`}
            style={tab === t.key ? { background: gradient, minHeight: 44 } : { ...input, minHeight: 44 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'clocks' && (
          <motion.div key="clocks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-surface-100">World Clocks</h2>
              <button
                onClick={() => setAddOpen(!addOpen)}
                className="px-3 py-2 rounded-xl text-sm font-medium text-primary-400 hover:bg-primary-500/10 transition-colors"
                style={{ minHeight: 44 }}
              >
                + Add City
              </button>
            </div>

            {addOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl p-4 mb-4 flex flex-col sm:flex-row gap-3"
                style={card}
              >
                <div className="flex-1">
                  <TimezoneSelect label="Timezone" value={addTz} onChange={setAddTz} />
                </div>
                <button
                  onClick={addCity}
                  disabled={!addTz}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-40 self-end"
                  style={{ background: gradient, minHeight: 44 }}
                >
                  Add
                </button>
              </motion.div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <AnimatePresence>
                {cities.map(city => (
                  <CityCard
                    key={city.id}
                    city={city}
                    onRemove={removeCity}
                    isCustom={!!city.custom || !DEFAULT_CITIES.find(d => d.id === city.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {tab === 'converter' && (
          <motion.div key="converter" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <TimezoneConverter />
          </motion.div>
        )}

        {tab === 'meeting' && (
          <motion.div key="meeting" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <MeetingPlanner />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
