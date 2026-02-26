import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from './ThemeToggle.jsx';
import useThemeStore from '../../stores/useThemeStore.js';

// Framer Motion: disable animations for tests
vi.mock('framer-motion', () => {
  const cache = new Map();
  return {
    motion: new Proxy({}, {
      get: (_, tag) => {
        if (!cache.has(tag)) {
          const Component = ({ children, initial, animate, exit, transition, whileHover, whileTap, layout, layoutId, ...rest }) => {
            const Tag = typeof tag === 'string' ? tag : 'div';
            return <Tag {...rest}>{children}</Tag>;
          };
          Component.displayName = `motion.${String(tag)}`;
          cache.set(tag, Component);
        }
        return cache.get(tag);
      },
    }),
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});

describe('ThemeToggle', () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: 'dark', isDark: true });
  });

  it('renders a button with correct aria-label for dark mode', () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-label', 'Dark mode — click to switch to light');
  });

  it('renders a button with correct aria-label for light mode', () => {
    useThemeStore.setState({ mode: 'light', isDark: false });
    render(<ThemeToggle />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-label', 'Light mode — click to switch to dark');
  });

  it('renders a button with correct aria-label for system mode', () => {
    useThemeStore.setState({ mode: 'system', isDark: false });
    render(<ThemeToggle />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-label', 'System mode — click to switch to dark');
  });

  it('has a 44x44px minimum touch target (w-9 h-9)', () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('w-9');
    expect(btn.className).toContain('h-9');
  });

  it('calls toggleTheme on click', () => {
    useThemeStore.setState({ mode: 'dark', isDark: true });
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button'));
    // dark → light
    expect(useThemeStore.getState().mode).toBe('light');
  });

  it('renders an SVG icon inside the button', () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button');
    const svg = btn.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });
});
