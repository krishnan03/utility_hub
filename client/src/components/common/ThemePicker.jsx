import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useThemeStore from '../../stores/useThemeStore.js';
import COLOR_THEMES from '../../lib/colorThemes.js';

export default function ThemePicker() {
  const [open, setOpen] = useState(false);
  const colorTheme = useThemeStore((s) => s.colorTheme);
  const setColorTheme = useThemeStore((s) => s.setColorTheme);
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const current = COLOR_THEMES.find((t) => t.id === colorTheme) || COLOR_THEMES[0];

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--tp-border)',
        }}
        aria-label="Change color theme"
        title={`Theme: ${current.name}`}
      >
        <span className="text-sm">{current.emoji}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 z-50 w-64 max-h-80 overflow-y-auto rounded-xl p-2 scrollbar-hide"
            style={{
              background: 'var(--tp-card)',
              border: '1px solid var(--tp-border)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(24px)',
            }}
          >
            <div className="px-2 py-1.5 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tp-muted)' }}>
                Color Theme
              </span>
            </div>
            {COLOR_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => { setColorTheme(theme.id); setOpen(false); }}
                className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all duration-150 text-left"
                style={{
                  background: colorTheme === theme.id ? 'var(--tp-selection)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (colorTheme !== theme.id) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  if (colorTheme !== theme.id) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span className="text-base w-6 text-center flex-shrink-0">{theme.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: 'var(--tp-text)' }}>
                    {theme.name}
                    {theme.id === 'default' && (
                      <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'var(--tp-selection)', color: 'var(--tp-accent)' }}>
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] truncate" style={{ color: 'var(--tp-muted)' }}>{theme.description}</div>
                </div>
                {/* Color preview dots */}
                <div className="flex gap-1 flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: theme.vars['--tp-accent'] }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: theme.vars['--tp-accent2'] }} />
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
