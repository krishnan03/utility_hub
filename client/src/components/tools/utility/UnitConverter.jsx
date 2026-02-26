import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { convert, getUnitsForCategory, getCategories } from '../../../utils/unitConverter';

const CATEGORY_ICONS = {
  length: '📏',
  weight: '⚖️',
  volume: '🧪',
  speed: '🏎️',
  area: '📐',
  data: '💾',
  temperature: '🌡️',
  time: '⏱️',
  pressure: '🔧',
  energy: '⚡',
  power: '💡',
  frequency: '📻',
  angle: '📐',
  force: '💪',
  fuel: '⛽',
  cooking: '🍳',
  typography: '🔤',
  density: '🧊',
  torque: '🔩',
};

const CATEGORY_GROUPS = {
  Common: ['length', 'weight', 'volume', 'temperature', 'time'],
  Science: ['pressure', 'energy', 'power', 'force', 'frequency', 'angle', 'density', 'torque'],
  Everyday: ['speed', 'area', 'data', 'fuel', 'cooking', 'typography'],
};

export default function UnitConverter() {
  const categories = useMemo(() => getCategories(), []);
  const [category, setCategory] = useState(categories[0]);
  const [value, setValue] = useState('1');
  const [fromUnit, setFromUnit] = useState('');
  const [toUnit, setToUnit] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  const units = useMemo(() => getUnitsForCategory(category), [category]);

  const handleCategoryChange = useCallback((cat) => {
    setCategory(cat);
    const u = getUnitsForCategory(cat);
    setFromUnit(u[0] || '');
    setToUnit(u[1] || u[0] || '');
  }, []);

  // Initialize units on first render
  useMemo(() => {
    if (!fromUnit && units.length > 0) {
      setFromUnit(units[0]);
      setToUnit(units[1] || units[0]);
    }
  }, []);

  const filteredGroups = useMemo(() => {
    const q = categorySearch.toLowerCase().trim();
    const result = {};
    for (const [group, cats] of Object.entries(CATEGORY_GROUPS)) {
      const filtered = cats.filter(
        (c) => categories.includes(c) && (!q || c.includes(q))
      );
      if (filtered.length > 0) result[group] = filtered;
    }
    return result;
  }, [categorySearch, categories]);

  const result = useMemo(() => {
    const num = parseFloat(value);
    if (isNaN(num) || !fromUnit || !toUnit) return null;
    try {
      return convert(num, fromUnit, toUnit, category);
    } catch {
      return null;
    }
  }, [value, fromUnit, toUnit, category]);

  const handleSwap = useCallback(() => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  }, [fromUnit, toUnit]);

  const formatResult = (num) => {
    if (num === null || num === undefined) return '—';
    if (Number.isInteger(num)) return num.toLocaleString();
    if (Math.abs(num) < 0.001 || Math.abs(num) > 1e9) return num.toExponential(6);
    return parseFloat(num.toPrecision(10)).toLocaleString(undefined, { maximumFractionDigits: 10 });
  };

  return (
    <div className="space-y-6">
      {/* Category search */}
      <div className="relative">
        <input
          type="text"
          value={categorySearch}
          onChange={(e) => setCategorySearch(e.target.value)}
          placeholder="Search categories..."
          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        />
        {categorySearch && (
          <button
            type="button"
            onClick={() => setCategorySearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 text-sm"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Grouped category tabs */}
      <div className="space-y-3">
        {Object.entries(filteredGroups).map(([group, cats]) => (
          <div key={group}>
            <span className="text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-1.5 block">
              {group}
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {cats.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  className={`shrink-0 min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all duration-200 flex items-center gap-2 ${
                    category === cat
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                      : 'text-surface-300 hover:bg-white/5'
                  }`}
                  style={category !== cat ? { background: 'rgba(255,255,255,0.06)' } : undefined}
                >
                  <span aria-hidden="true">{CATEGORY_ICONS[cat] || '🔄'}</span>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Converter card */}
      <div className="space-y-4">
        {/* From */}
        <div className="p-4 rounded-2xl space-y-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider">From</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl text-lg font-mono font-bold text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              placeholder="0"
            />
            <select
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
              className="min-h-[48px] px-3 py-2 rounded-xl text-sm font-semibold text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 cursor-pointer min-w-[100px]"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {units.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Swap button */}
        <div className="flex justify-center -my-1">
          <motion.button
            type="button"
            onClick={handleSwap}
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-12 h-12 rounded-full bg-primary-500 text-white shadow-lg shadow-primary-500/30 flex items-center justify-center text-lg hover:shadow-xl transition-shadow"
            aria-label="Swap units"
          >
            ⇅
          </motion.button>
        </div>

        {/* To */}
        <div className="p-4 rounded-2xl space-y-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider">To</label>
          <div className="flex items-center gap-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={result}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl flex items-center"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <span className="text-lg font-mono font-bold text-primary-500">
                  {formatResult(result)}
                </span>
              </motion.div>
            </AnimatePresence>
            <select
              value={toUnit}
              onChange={(e) => setToUnit(e.target.value)}
              className="min-h-[48px] px-3 py-2 rounded-xl text-sm font-semibold text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 cursor-pointer min-w-[100px]"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {units.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
