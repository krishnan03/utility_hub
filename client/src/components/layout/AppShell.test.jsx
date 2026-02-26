import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import useThemeStore from '../../stores/useThemeStore.js';

// Mock framer-motion with Proxy to handle all motion elements
vi.mock('framer-motion', () => {
  const cache = new Map();
  return {
    motion: new Proxy({}, {
      get: (_, tag) => {
        if (!cache.has(tag)) {
          const Component = ({ children, initial, animate, exit, transition, whileHover, whileTap, layout, layoutId, variants, ...rest }) => {
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

import AppShell from './AppShell';

function renderWithRouter(ui, { route = '/' } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  useThemeStore.setState({ mode: 'system', isDark: false });
});

describe('AppShell', () => {
  it('renders navbar, footer, and children', () => {
    renderWithRouter(
      <AppShell>
        <p>Test content</p>
      </AppShell>
    );

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies dark class to html element (always forced)', () => {
    useThemeStore.setState({ mode: 'dark', isDark: true });
    renderWithRouter(<AppShell><p>hi</p></AppShell>);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('keeps dark class even when store isDark is false (forced dark mode)', () => {
    document.documentElement.classList.add('dark');
    useThemeStore.setState({ mode: 'light', isDark: false });
    renderWithRouter(<AppShell><p>hi</p></AppShell>);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggles theme when theme button is clicked', async () => {
    const user = userEvent.setup();
    useThemeStore.setState({ mode: 'dark', isDark: true });
    renderWithRouter(<AppShell><p>hi</p></AppShell>);

    expect(document.documentElement.classList.contains('dark')).toBe(true);

    const themeBtn = screen.getByLabelText('Dark mode — click to switch to light');
    await user.click(themeBtn);

    expect(useThemeStore.getState().mode).toBe('light');
    expect(useThemeStore.getState().isDark).toBe(false);
  });
});
