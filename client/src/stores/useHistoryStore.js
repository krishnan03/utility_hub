import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import tools from '../lib/toolRegistry.js';

const MAX_RECENT = 10;

const useHistoryStore = create(
  persist(
    (set) => ({
      recentTools: [],

      addRecentTool: (toolId) =>
        set((state) => {
          const filtered = state.recentTools.filter((id) => id !== toolId);
          return { recentTools: [toolId, ...filtered].slice(0, MAX_RECENT) };
        }),
    }),
    {
      name: 'toolspilot-history',
    },
  ),
);

export function getRecentToolObjects(recentToolIds) {
  return recentToolIds
    .map((id) => tools.find((t) => t.id === id))
    .filter(Boolean);
}

export default useHistoryStore;
