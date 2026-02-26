import { describe, it, expect, beforeEach } from 'vitest';
import useToolStore from './useToolStore.js';

describe('useToolStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useToolStore.setState({
      searchQuery: '',
      activeCategory: null,
    });
  });

  it('initialises with empty search query and no active category', () => {
    const state = useToolStore.getState();
    expect(state.searchQuery).toBe('');
    expect(state.activeCategory).toBeNull();
  });

  it('has a non-empty tools array', () => {
    const { tools } = useToolStore.getState();
    expect(tools.length).toBeGreaterThan(0);
  });

  it('setSearchQuery updates the search query', () => {
    useToolStore.getState().setSearchQuery('pdf');
    expect(useToolStore.getState().searchQuery).toBe('pdf');
  });

  it('setActiveCategory updates the active category', () => {
    useToolStore.getState().setActiveCategory('image');
    expect(useToolStore.getState().activeCategory).toBe('image');
  });

  it('setActiveCategory can be cleared with null', () => {
    useToolStore.getState().setActiveCategory('image');
    useToolStore.getState().setActiveCategory(null);
    expect(useToolStore.getState().activeCategory).toBeNull();
  });

  describe('getFilteredTools', () => {
    it('returns all tools when no filters are set', () => {
      const { getFilteredTools, tools } = useToolStore.getState();
      expect(getFilteredTools().length).toBe(tools.length);
    });

    it('filters by active category', () => {
      useToolStore.getState().setActiveCategory('image');
      const results = useToolStore.getState().getFilteredTools();
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((t) => t.category === 'image')).toBe(true);
    });

    it('filters by search query matching name (case-insensitive)', () => {
      useToolStore.getState().setSearchQuery('PDF');
      const results = useToolStore.getState().getFilteredTools();
      expect(results.length).toBeGreaterThan(0);
      for (const tool of results) {
        const matchesName = tool.name.toLowerCase().includes('pdf');
        const matchesDesc = tool.description.toLowerCase().includes('pdf');
        const matchesKw = tool.keywords.some((kw) => kw.toLowerCase().includes('pdf'));
        expect(matchesName || matchesDesc || matchesKw).toBe(true);
      }
    });

    it('filters by search query matching keywords', () => {
      useToolStore.getState().setSearchQuery('regex');
      const results = useToolStore.getState().getFilteredTools();
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((t) => t.id === 'regex-tester')).toBe(true);
    });

    it('filters by search query matching description', () => {
      useToolStore.getState().setSearchQuery('animated GIFs');
      const results = useToolStore.getState().getFilteredTools();
      expect(results.length).toBeGreaterThan(0);
    });

    it('combines category and search filters', () => {
      useToolStore.getState().setActiveCategory('developer');
      useToolStore.getState().setSearchQuery('json');
      const results = useToolStore.getState().getFilteredTools();
      expect(results.length).toBeGreaterThan(0);
      for (const tool of results) {
        expect(tool.category).toBe('developer');
        const q = 'json';
        const matches =
          tool.name.toLowerCase().includes(q) ||
          tool.description.toLowerCase().includes(q) ||
          tool.keywords.some((kw) => kw.toLowerCase().includes(q));
        expect(matches).toBe(true);
      }
    });

    it('returns empty array for non-matching query', () => {
      useToolStore.getState().setSearchQuery('xyznonexistent123');
      const results = useToolStore.getState().getFilteredTools();
      expect(results).toEqual([]);
    });

    it('ignores whitespace-only search query', () => {
      useToolStore.getState().setSearchQuery('   ');
      const { getFilteredTools, tools } = useToolStore.getState();
      expect(getFilteredTools().length).toBe(tools.length);
    });
  });
});
