import { create } from 'zustand';
import tools, { CATEGORIES } from '../lib/toolRegistry.js';

const useToolStore = create((set, get) => ({
  tools,
  categories: CATEGORIES,
  searchQuery: '',
  activeCategory: null,

  setSearchQuery: (query) => set({ searchQuery: query }),

  setActiveCategory: (category) => set({ activeCategory: category }),

  getFilteredTools: () => {
    const { tools: allTools, searchQuery, activeCategory } = get();
    let filtered = allTools;

    if (activeCategory) {
      filtered = filtered.filter((t) => t.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.keywords.some((kw) => kw.toLowerCase().includes(q)),
      );
    }

    return filtered;
  },
}));

export default useToolStore;
