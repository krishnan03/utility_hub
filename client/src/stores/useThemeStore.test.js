import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import useThemeStore, { MODES } from './useThemeStore.js';

describe('useThemeStore', () => {
  beforeEach(() => {
    // Reset store to defaults before each test
    useThemeStore.setState({ mode: 'system', isDark: true });
    document.documentElement.classList.remove('dark');
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initialises with system mode', () => {
    const { mode } = useThemeStore.getState();
    expect(mode).toBe('system');
  });

  it('exports MODES array with dark, light, system', () => {
    expect(MODES).toEqual(['dark', 'light', 'system']);
  });

  describe('setMode', () => {
    it('sets mode to dark and isDark to true', () => {
      useThemeStore.getState().setMode('dark');
      const { mode, isDark } = useThemeStore.getState();
      expect(mode).toBe('dark');
      expect(isDark).toBe(true);
    });

    it('sets mode to light and isDark to false', () => {
      useThemeStore.getState().setMode('light');
      const { mode, isDark } = useThemeStore.getState();
      expect(mode).toBe('light');
      expect(isDark).toBe(false);
    });

    it('sets mode to system and resolves isDark from OS preference', () => {
      useThemeStore.getState().setMode('system');
      const { mode } = useThemeStore.getState();
      expect(mode).toBe('system');
      expect(typeof useThemeStore.getState().isDark).toBe('boolean');
    });

    it('ignores invalid mode values', () => {
      useThemeStore.getState().setMode('dark');
      useThemeStore.getState().setMode('invalid');
      expect(useThemeStore.getState().mode).toBe('dark');
    });

    it('applies dark class to documentElement when isDark is true', () => {
      useThemeStore.getState().setMode('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('removes dark class from documentElement when isDark is false', () => {
      document.documentElement.classList.add('dark');
      useThemeStore.getState().setMode('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('toggleTheme', () => {
    it('toggles dark → light', () => {
      useThemeStore.getState().setMode('dark');
      useThemeStore.getState().toggleTheme();
      expect(useThemeStore.getState().mode).toBe('light');
      expect(useThemeStore.getState().isDark).toBe(false);
    });

    it('toggles light → dark', () => {
      useThemeStore.getState().setMode('light');
      useThemeStore.getState().toggleTheme();
      expect(useThemeStore.getState().mode).toBe('dark');
      expect(useThemeStore.getState().isDark).toBe(true);
    });

    it('toggles system → dark', () => {
      useThemeStore.getState().setMode('system');
      useThemeStore.getState().toggleTheme();
      expect(useThemeStore.getState().mode).toBe('dark');
      expect(useThemeStore.getState().isDark).toBe(true);
    });
  });

  describe('toggleMode', () => {
    it('cycles dark → light → system → dark', () => {
      useThemeStore.getState().setMode('dark');
      expect(useThemeStore.getState().mode).toBe('dark');

      useThemeStore.getState().toggleMode();
      expect(useThemeStore.getState().mode).toBe('light');

      useThemeStore.getState().toggleMode();
      expect(useThemeStore.getState().mode).toBe('system');

      useThemeStore.getState().toggleMode();
      expect(useThemeStore.getState().mode).toBe('dark');
    });
  });

  describe('syncSystem', () => {
    it('does nothing when mode is not system', () => {
      useThemeStore.getState().setMode('dark');
      const before = useThemeStore.getState().isDark;
      useThemeStore.getState().syncSystem();
      expect(useThemeStore.getState().isDark).toBe(before);
    });

    it('re-evaluates isDark when mode is system', () => {
      useThemeStore.getState().setMode('system');
      useThemeStore.getState().syncSystem();
      expect(typeof useThemeStore.getState().isDark).toBe('boolean');
    });
  });

  describe('persistence', () => {
    it('only persists the mode field to toolspilot-theme key', () => {
      useThemeStore.getState().setMode('light');
      const stored = JSON.parse(localStorage.getItem('toolspilot-theme'));
      expect(stored).toBeTruthy();
      expect(stored.state.mode).toBe('light');
      // isDark should NOT be persisted
      expect(stored.state.isDark).toBeUndefined();
    });
  });
});
