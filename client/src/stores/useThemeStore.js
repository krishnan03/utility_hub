import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import COLOR_THEMES from '../lib/colorThemes.js';

const MODES = ['dark', 'light', 'system'];

function resolveIsDark(mode) {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    return mql ? mql.matches : true;
  }
  return true;
}

function applyDarkClass(isDark) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (isDark) root.classList.add('dark');
  else root.classList.remove('dark');
}

function applyColorTheme(themeId) {
  if (typeof document === 'undefined') return;
  const theme = COLOR_THEMES.find((t) => t.id === themeId) || COLOR_THEMES[0];
  const root = document.documentElement;
  // Apply all CSS custom properties
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // For non-default themes, walk the DOM and patch inline styles on elements
  // that use the hardcoded Raycast color values. This covers 50+ tool components
  // without needing to edit each file individually.
  if (themeId === 'default') {
    // Restore original inline styles by re-rendering (React will re-apply them)
    const sheet = document.getElementById('tp-theme-overrides');
    if (sheet) sheet.textContent = '';
    return;
  }

  // Use a style sheet with high-specificity selectors as a baseline
  let sheet = document.getElementById('tp-theme-overrides');
  if (!sheet) {
    sheet = document.createElement('style');
    sheet.id = 'tp-theme-overrides';
    document.head.appendChild(sheet);
  }

  const card = theme.vars['--tp-card'];
  const cardHover = theme.vars['--tp-card-hover'];
  const bg = theme.vars['--tp-bg'];
  const border = theme.vars['--tp-border'];
  const gradient = theme.vars['--tp-gradient'];
  const glow = theme.vars['--tp-glow'];
  const selection = theme.vars['--tp-selection'];
  const accent = theme.vars['--tp-accent'];

  sheet.textContent = `
    /* Card backgrounds — override hardcoded rgba(44,44,46,*) */
    [style*="44, 44, 46"]:not([aria-hidden="true"]):not(.pointer-events-none) { background: ${card} !important; }
    [style*="44,44,46"]:not([aria-hidden="true"]):not(.pointer-events-none) { background: ${card} !important; }
    [style*="58, 58, 60"], [style*="58,58,60"] { background: ${cardHover} !important; }
    [style*="28, 28, 30"]:not([aria-hidden="true"]):not(.pointer-events-none), [style*="28,28,30"]:not([aria-hidden="true"]):not(.pointer-events-none) { background: ${bg} !important; }

    /* Borders — override hardcoded rgba(255,255,255,0.08/0.06/0.1) */
    [style*="255, 255, 255, 0.08"], [style*="255,255,255,0.08"] { border-color: ${border} !important; }
    [style*="255, 255, 255, 0.06"], [style*="255,255,255,0.06"] { border-color: ${border} !important; }
    [style*="255, 255, 255, 0.1)"], [style*="255,255,255,0.1)"] { border-color: ${border} !important; }
  `;

  // Also directly patch elements via JS for maximum reliability
  requestAnimationFrame(() => patchInlineStyles(theme));
}

/** Walk the DOM and directly override inline background/border styles */
function patchInlineStyles(theme) {
  if (typeof document === 'undefined') return;
  const all = document.querySelectorAll('[style]');
  all.forEach((el) => {
    const raw = el.getAttribute('style') || '';
    const s = el.style;

    // Skip decorative/overlay elements — these use gradients for visual effects, not card backgrounds
    const isDecorative = el.classList.contains('pointer-events-none') ||
                         el.getAttribute('aria-hidden') === 'true';

    // Card backgrounds — only override solid rgba backgrounds, not gradient meshes
    if (!isDecorative && (raw.includes('44, 44, 46') || raw.includes('44,44,46'))) {
      s.setProperty('background', theme.vars['--tp-card'], 'important');
    }
    if (!isDecorative && (raw.includes('58, 58, 60') || raw.includes('58,58,60'))) {
      s.setProperty('background', theme.vars['--tp-card-hover'], 'important');
    }
    if (!isDecorative && (raw.includes('28, 28, 30') || raw.includes('28,28,30'))) {
      s.setProperty('background', theme.vars['--tp-bg'], 'important');
    }
    // Gradient buttons — only match the exact primary gradient (both colors together),
    // but NOT when used as a subtle tint suffix like #FF636322 or #FF636315
    if (raw.includes('FF6363') && raw.includes('FF9F43') && raw.includes('linear-gradient')) {
      // Only override if it's the full gradient, not a hex+opacity tint
      const isFullGradient = raw.includes('linear-gradient(135deg') &&
                             !raw.includes('FF636315') && !raw.includes('FF636322');
      if (isFullGradient) {
        s.setProperty('background', theme.vars['--tp-gradient'], 'important');
      }
    }
    // Borders
    if (raw.includes('255, 255, 255, 0.08') || raw.includes('255,255,255,0.08') ||
        raw.includes('255, 255, 255, 0.06') || raw.includes('255,255,255,0.06') ||
        raw.includes('255, 255, 255, 0.1)') || raw.includes('255,255,255,0.1)')) {
      s.setProperty('border-color', theme.vars['--tp-border'], 'important');
    }
    // Accent color — only override when used as a standalone solid background/border,
    // NOT in radial-gradient meshes or subtle hex tints like #FF636315
    const hasAccent = raw.includes('255, 99, 99') || raw.includes('255,99,99');
    const hasGradientMesh = raw.includes('radial-gradient') || raw.includes('ellipse');
    if (hasAccent && !isDecorative && !hasGradientMesh) {
      if (raw.includes('box-shadow')) {
        s.setProperty('box-shadow', `0 2px 12px ${theme.vars['--tp-glow']}`, 'important');
      }
    }
  });
}

const useThemeStore = create(
  persist(
    (set, get) => ({
      mode: 'system',
      isDark: resolveIsDark('system'),
      colorTheme: 'cyberpunk',

      setMode: (mode) => {
        if (!MODES.includes(mode)) return;
        const isDark = resolveIsDark(mode);
        applyDarkClass(isDark);
        set({ mode, isDark });
      },

      toggleTheme: () => {
        const { mode } = get();
        if (mode === 'dark') get().setMode('light');
        else get().setMode('dark');
      },

      toggleMode: () => {
        const { mode } = get();
        const currentIndex = MODES.indexOf(mode);
        const nextMode = MODES[(currentIndex + 1) % MODES.length];
        get().setMode(nextMode);
      },

      setColorTheme: (themeId) => {
        const theme = COLOR_THEMES.find((t) => t.id === themeId);
        if (!theme) return;
        applyColorTheme(themeId);
        // Auto-switch dark/light mode based on theme
        if (theme.light) get().setMode('light');
        else get().setMode('dark');
        set({ colorTheme: themeId });
      },

      syncSystem: () => {
        const { mode } = get();
        if (mode !== 'system') return;
        const isDark = resolveIsDark('system');
        applyDarkClass(isDark);
        set({ isDark });
      },
    }),
    {
      name: 'toolspilot-theme',
      partialize: (state) => ({ mode: state.mode, colorTheme: state.colorTheme }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const isDark = resolveIsDark(state.mode);
        state.isDark = isDark;
        applyDarkClass(isDark);
        applyColorTheme(state.colorTheme || 'cyberpunk');
      },
    },
  ),
);

// Listen for OS color-scheme changes
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  if (mql && typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', () => {
      useThemeStore.getState().syncSystem();
    });
  }
}

// MutationObserver: re-patch inline styles when React renders new elements
// This ensures theme propagates to lazily-loaded tool pages and route changes.
if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined') {
  let patchTimer = null;
  const observer = new MutationObserver(() => {
    const { colorTheme } = useThemeStore.getState();
    if (colorTheme === 'default') return;
    // Debounce to avoid patching on every micro-mutation
    if (patchTimer) clearTimeout(patchTimer);
    patchTimer = setTimeout(() => {
      const theme = COLOR_THEMES.find((t) => t.id === colorTheme);
      if (theme) patchInlineStyles(theme);
    }, 100);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

export default useThemeStore;
export { MODES };
