import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useToolStore from '../../stores/useToolStore.js';

/**
 * Global search bar with real-time filtering, keyboard navigation,
 * and ARIA combobox semantics.
 */
export default function SearchBar() {
  const navigate = useNavigate();
  const { tools, searchQuery, setSearchQuery } = useToolStore();

  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debounceRef = useRef(null);

  // Debounced sync to store (150ms)
  const syncToStore = useCallback(
    (value) => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSearchQuery(value);
      }, 150);
    },
    [setSearchQuery],
  );

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  // Compute filtered results from local query directly for responsiveness
  const results = useMemo(() => {
    const q = localQuery.trim().toLowerCase();
    if (!q) return [];
    return tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.keywords.some((kw) => kw.toLowerCase().includes(q)),
    );
  }, [localQuery, tools]);

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups = {};
    results.forEach((tool) => {
      if (!groups[tool.category]) groups[tool.category] = [];
      groups[tool.category].push(tool);
    });
    return groups;
  }, [results]);

  const handleChange = (e) => {
    const value = e.target.value;
    setLocalQuery(value);
    setIsOpen(value.trim().length > 0);
    setActiveIndex(-1);
    syncToStore(value);
  };

  const selectTool = useCallback(
    (tool) => {
      setIsOpen(false);
      setLocalQuery('');
      setSearchQuery('');
      navigate(tool.path);
      inputRef.current?.blur();
    },
    [navigate, setSearchQuery],
  );

  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          selectTool(results[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      default:
        break;
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex];
      if (item && typeof item.scrollIntoView === 'function') {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        inputRef.current &&
        !inputRef.current.closest('[data-searchbar]')?.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeDescendant =
    activeIndex >= 0 ? `search-result-${results[activeIndex]?.id}` : undefined;

  return (
    <div className="relative w-full" data-searchbar>
      <div
        role="combobox"
        aria-expanded={isOpen && results.length > 0}
        aria-haspopup="listbox"
        aria-owns="search-results-listbox"
      >
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 pointer-events-none"
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
            value={localQuery}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => localQuery.trim() && setIsOpen(true)}
            placeholder="Search tools..."
            className="cmd-input pl-10 pr-12"
            role="combobox"
            aria-autocomplete="list"
            aria-controls="search-results-listbox"
            aria-activedescendant={activeDescendant}
            aria-label="Search tools"
          />
          {/* ⌘K badge */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-surface-600 pointer-events-none">
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>⌘K</kbd>
          </div>
        </div>
      </div>

      {isOpen && results.length > 0 && (
        <ul
          id="search-results-listbox"
          ref={listRef}
          role="listbox"
          aria-label="Search results"
          className="absolute z-50 mt-2 w-full max-h-80 overflow-y-auto rounded-2xl shadow-2xl"
          style={{
            background: 'rgba(44,44,46,0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          {Object.entries(groupedResults).map(([category, categoryTools]) => (
            <li key={category} role="presentation">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-surface-500" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {category}
              </div>
              <ul role="group">
                {categoryTools.map((tool) => {
                  const index = results.indexOf(tool);
                  return (
                    <li
                      key={tool.id}
                      id={`search-result-${tool.id}`}
                      role="option"
                      aria-selected={index === activeIndex}
                      className={`list-item ${index === activeIndex ? 'bg-primary-500/10 border-l-2 border-primary-500' : ''}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectTool(tool);
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <div className="icon-box w-8 h-8 text-sm flex-shrink-0">
                        <span aria-hidden="true">{tool.icon}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-surface-100 truncate">{tool.name}</div>
                        <div className="text-xs text-surface-500 truncate">{tool.description}</div>
                      </div>
                      <span className="badge ml-auto shrink-0">{tool.category}</span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
