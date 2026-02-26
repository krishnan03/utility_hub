import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

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

import MobileMenu from './MobileMenu';
import { categories } from './Sidebar';

function renderMenu(isOpen = true, onClose = vi.fn()) {
  return {
    onClose,
    ...render(
      <MemoryRouter initialEntries={['/']}>
        <MobileMenu isOpen={isOpen} onClose={onClose} />
      </MemoryRouter>
    ),
  };
}

describe('MobileMenu', () => {
  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = renderMenu(false);
    expect(container.innerHTML).toBe('');
  });

  it('renders dialog with correct ARIA attributes when open', () => {
    renderMenu();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Navigation menu');
  });

  it('renders all 13 category links', () => {
    renderMenu();
    categories.forEach((cat) => {
      expect(screen.getByText(cat.name)).toBeInTheDocument();
    });
  });

  it('renders category links with correct paths', () => {
    renderMenu();
    categories.forEach((cat) => {
      const link = screen.getByText(cat.name).closest('a');
      expect(link).toHaveAttribute('href', cat.path);
    });
  });

  it('renders a close button with accessible label', () => {
    renderMenu();
    const closeBtn = screen.getByLabelText('Close navigation menu');
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn.tagName).toBe('BUTTON');
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = renderMenu();
    await user.click(screen.getByLabelText('Close navigation menu'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderMenu(true, onClose);
    const backdrop = document.querySelector('.bg-black\\/60');
    expect(backdrop).toBeTruthy();
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    renderMenu(true, onClose);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose on Escape when menu is closed', () => {
    const onClose = vi.fn();
    renderMenu(false, onClose);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('locks body scroll when open', () => {
    renderMenu(true);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll when closed', () => {
    const { rerender } = render(
      <MemoryRouter>
        <MobileMenu isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <MemoryRouter>
        <MobileMenu isOpen={false} onClose={vi.fn()} />
      </MemoryRouter>
    );
    expect(document.body.style.overflow).toBe('');
  });

  it('has mobile navigation aria-label', () => {
    renderMenu();
    expect(screen.getByLabelText('Mobile category navigation')).toBeInTheDocument();
  });

  it('close button meets 44x44px minimum touch target', () => {
    renderMenu();
    const closeBtn = screen.getByLabelText('Close navigation menu');
    expect(closeBtn.className).toContain('min-w-[44px]');
    expect(closeBtn.className).toContain('min-h-[44px]');
  });

  it('category links meet 44px minimum touch target height', () => {
    renderMenu();
    categories.forEach((cat) => {
      const link = screen.getByText(cat.name).closest('a');
      expect(link.className).toContain('min-h-[44px]');
    });
  });

  it('close button is focusable when menu opens', () => {
    renderMenu();
    const closeBtn = screen.getByLabelText('Close navigation menu');
    // Verify the close button exists and is a focusable element
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn.tagName).toBe('BUTTON');
    expect(closeBtn).not.toBeDisabled();
    // Programmatically focus and verify it can receive focus
    closeBtn.focus();
    expect(closeBtn).toHaveFocus();
  });

  it('renders ToolPilot branding in the panel header', () => {
    renderMenu();
    expect(screen.getByText(/Utility/)).toBeInTheDocument();
    expect(screen.getByText('Hub')).toBeInTheDocument();
  });
});
