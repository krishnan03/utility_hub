import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

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

import Footer from './Footer';

describe('Footer', () => {
  it('renders with contentinfo role', () => {
    render(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('displays copyright text with current year', () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(`© ${year} ToolPilot`))).toBeInTheDocument();
  });

  it('displays auto-delete notice', () => {
    render(<Footer />);
    expect(screen.getByText(/auto-deleted in 24h/i)).toBeInTheDocument();
  });

  it('displays made with love message', () => {
    render(<Footer />);
    expect(screen.getByText(/Made with/)).toBeInTheDocument();
    expect(screen.getByText(/for productivity/)).toBeInTheDocument();
  });
});
