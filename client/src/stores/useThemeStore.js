import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MODES = ['dark', 'light', 'system'];

function resolveIsDark(mode) {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  // system — check OS preference
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    return mql ? mql.matches : true;
  }
  return true; // default to dark during SSR / non-browser
}

function applyDarkClass(isDark) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

const useThemeStore = create(
  persist(
    (set, get) => ({
      mode: 'system',
      isDark: resolveIsDark('system'),

      setMode: (mode) => {
        if (!MODES.includes(mode)) return;
        const isDark = resolveIsDark(mode);
        applyDarkClass(isDark);
        set({ mode, isDark });
      },

      toggleTheme: () => {
        const { mode } = get();
        // dark → light, light → dark, system → dark
        if (mode === 'dark') get().setMode('light');
        else get().setMode('dark');
      },

      toggleMode: () => {
        const { mode } = get();
        const currentIndex = MODES.indexOf(mode);
        const nextMode = MODES[(currentIndex + 1) % MODES.length];
        get().setMode(nextMode);
      },

      /** Re-evaluate isDark when OS preference changes (only relevant in system mode) */
      syncSystem: () => {
        const { mode } = get();
        if (mode !== 'system') return;
        const isDark = resolveIsDark('system');
        applyDarkClass(isDark);
        set({ isDark });
      },
    }),
    {
      name: 'utility-hub-theme',
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // After rehydration, resolve isDark and apply class
        const isDark = resolveIsDark(state.mode);
        state.isDark = isDark;
        applyDarkClass(isDark);
      },
    },
  ),
);

// Listen for OS color-scheme changes so "system" mode stays in sync
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  if (mql && typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', () => {
      useThemeStore.getState().syncSystem();
    });
  }
}

export default useThemeStore;
export { MODES };
