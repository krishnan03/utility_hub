import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import useThemeStore from '../../stores/useThemeStore.js';

vi.mock('framer-motion', () => {
  const cache = new Map();
  return {
    motion: new Proxy({}, {
      get: (_, tag) => {
        if (!cache.has(tag)) {
          const Component = ({ children, whileTap, whileHover, initial, animate, exit, transition, layout, layoutId, variants, ...rest }) => {
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

import Navbar from './Navbar';

function renderNavbar(props = {}) {
  const defaults = {
    onToggleMobileMenu: vi.fn(),
  };
  return render(
    <MemoryRouter>
      <Navbar {...defaults} {...props} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  useThemeStore.setState({ mode: 'system', isDark: false });
  document.documentElement.classList.remove('dark');
});

describe('Navbar', () => {
  it('renders logo with link to home', () => {
    renderNavbar();
    const link = screen.getByLabelText('ToolsPilot home');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
    expect(screen.getByText(/Tool/)).toBeInTheDocument();
  });

  it('renders hamburger menu button with aria-label', () => {
    renderNavbar();
    expect(screen.getByLabelText('Toggle navigation menu')).toBeInTheDocument();
  });

  it('calls onToggleMobileMenu when hamburger is clicked', async () => {
    const user = userEvent.setup();
    const onToggleMobileMenu = vi.fn();
    renderNavbar({ onToggleMobileMenu });

    await user.click(screen.getByLabelText('Toggle navigation menu'));
    expect(onToggleMobileMenu).toHaveBeenCalledOnce();
  });

  it('has sticky positioning and backdrop blur', () => {
    renderNavbar();
    const header = screen.getByRole('banner');
    expect(header.className).toContain('sticky');
    // backdrop blur is applied via inline style, not className
    expect(header.style.backdropFilter).toContain('blur');
  });
});
