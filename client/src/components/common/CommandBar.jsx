import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useToolStore from '../../stores/useToolStore.js';
import { matchIntent } from '../../lib/intentMatcher.js';

/**
 * Smart Command Bar — Raycast/Spotlight-style search with NLP intent matching.
 *
 * Users can type natural language like "fix messy JSON" or "make text lowercase"
 * and the bar surfaces the right tool with an action hint.
 *
 * Features:
 *  - NLP intent matching (priority) + keyword fallback
 *  - ⌘K global shortcut to focus
 *  - Keyboard navigation (↑↓ Enter Esc)
 *  - Grouped results by category
 *  - Action hints for intent matches ("Format JSON", "Compress PDF")
 *  - Framer Motion transitions
 *  - Full ARIA combobox semantics
 */
export default function CommandBar({ autoFocus = false }) {
  const navigate = useNavigate();
  const { tools, setSearchQuery } = useToolStore();

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Debounced sync to global store (150ms per standards)
  const syncToStore = useCallback(
    (value) => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => setSearchQuery(value), 150);
    },
    [setSearchQuery],
  );

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  // NLP intent matching + keyword fallback
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const matches = matchIntent(query, tools);
    // Resolve tool objects and cap at 12
    return matches
      .map((m) => {
        const tool = tools.find((t) => t.id === m.toolId);
        return tool ? { ...tool, action: m.action, matchScore: m.score } : null;
      })
      .filter(Boolean)
      .slice(0, 12);
  }, [query, tools]);

  // Group by category for display
  const grouped = useMemo(() => {
    const groups = {};
    results.forEach((tool) => {
      if (!groups[tool.category]) groups[tool.category] = [];
      groups[tool.category].push(tool);
    });
    return groups;
  }, [results]);

  // Flat list for keyboard nav
  const flatResults = results;

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.trim().length > 0);
    setActiveIndex(-1);
    syncToStore(value);
  };

  const selectTool = useCallback(
    (tool) => {
      setIsOpen(false);
      setQuery('');
      setSearchQuery('');
      navigate(tool.path);
      inputRef.current?.blur();
    },
    [navigate, setSearchQuery],
  );

  const handleKeyDown = (e) => {
    if (!isOpen || flatResults.length === 0) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < flatResults.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatResults.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < flatResults.length) {
          selectTool(flatResults[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
        break;
      default:
        break;
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      items[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    const handleGlobal = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    document.addEventListener('keydown', handleGlobal);
    return () => document.removeEventListener('keydown', handleGlobal);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeDescendant =
    activeIndex >= 0 ? `cmd-result-${flatResults[activeIndex]?.id}` : undefined;

  const isIntentMatch = (tool) => tool.matchScore >= 2;

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        role="combobox"
        aria-expanded={isOpen && flatResults.length > 0}
        aria-haspopup="listbox"
        aria-owns="command-bar-listbox"
      >
        <div className="relative">
          {/* Search icon */}
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => query.trim() && setIsOpen(true)}
            autoFocus={autoFocus}
            placeholder='Try "fix messy JSON" or "compress my PDF"...'
            className="cmd-input pl-11 pr-20"
            role="combobox"
            aria-autocomplete="list"
            aria-controls="command-bar-listbox"
            aria-activedescendant={activeDescendant}
            aria-label="Search tools — describe what you need"
          />
          {/* ⌘K badge */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
            <kbd
              className="px-1.5 py-0.5 rounded text-[10px] font-mono text-surface-500"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Results dropdown */}
      <AnimatePresence>
        {isOpen && flatResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50 mt-2 w-full rounded-2xl shadow-2xl overflow-hidden"
            style={{
              background: 'rgba(32,32,34,0.97)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            {/* Hint bar */}
            {flatResults.length > 0 && flatResults[0].matchScore >= 2 && (
              <div
                className="px-4 py-2 text-xs text-surface-400 flex items-center gap-2"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{
                    background: 'rgba(16,185,129,0.15)',
                    color: '#10B981',
                    border: '1px solid rgba(16,185,129,0.25)',
                  }}
                >
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" />
                  </svg>
                  Smart match
                </span>
                <span>We understood what you need</span>
              </div>
            )}

            <ul
              id="command-bar-listbox"
              ref={listRef}
              role="listbox"
              aria-label="Tool results"
              className="max-h-80 overflow-y-auto py-1"
            >
              {Object.entries(grouped).map(([category, categoryTools]) => (
                <li key={category} role="presentation">
                  <div
                    className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-surface-600"
                  >
                    {category}
                  </div>
                  <ul role="group">
                    {categoryTools.map((tool) => {
                      const index = flatResults.indexOf(tool);
                      const isActive = index === activeIndex;
                      const isIntent = isIntentMatch(tool);
                      return (
                        <li
                          key={tool.id}
                          id={`cmd-result-${tool.id}`}
                          role="option"
                          aria-selected={isActive}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors duration-100 ${
                            isActive
                              ? 'bg-primary-500/10'
                              : 'hover:bg-white/[0.04]'
                          }`}
                          style={isActive ? { borderLeft: '2px solid #FF6363' } : { borderLeft: '2px solid transparent' }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectTool(tool);
                          }}
                          onMouseEnter={() => setActiveIndex(index)}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.08)',
                            }}
                          >
                            <span aria-hidden="true">{tool.icon}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-surface-100 truncate">
                              {tool.name}
                            </div>
                            <div className="text-xs text-surface-500 truncate">
                              {tool.description}
                            </div>
                          </div>
                          {/* Action hint for intent matches */}
                          {isIntent && (
                            <span
                              className="ml-auto shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-md"
                              style={{
                                background: 'rgba(255,99,99,0.1)',
                                color: '#FF6363',
                                border: '1px solid rgba(255,99,99,0.2)',
                              }}
                            >
                              {tool.action}
                            </span>
                          )}
                          {!isIntent && (
                            <span className="badge ml-auto shrink-0">{tool.category}</span>
                          )}
                          {/* Enter hint on active */}
                          {isActive && (
                            <kbd
                              className="ml-2 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono text-surface-500"
                              style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                              }}
                            >
                              ↵
                            </kbd>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>

            {/* Footer hint */}
            <div
              className="px-4 py-2 text-[10px] text-surface-600 flex items-center gap-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded font-mono" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded font-mono" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>↵</kbd>
                open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded font-mono" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>esc</kbd>
                close
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
