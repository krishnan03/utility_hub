import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LaTeXRenderer from './LaTeXRenderer';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...filterMotionProps(props)}>{children}</div>,
    button: ({ children, ...props }) => <button {...filterMotionProps(props)}>{children}</button>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

function filterMotionProps(props) {
  const filtered = { ...props };
  delete filtered.initial;
  delete filtered.animate;
  delete filtered.exit;
  delete filtered.transition;
  delete filtered.whileHover;
  delete filtered.whileTap;
  return filtered;
}

// Mock KaTeX import — simulate it not being available so we test the fallback path
vi.mock('katex', () => {
  throw new Error('Module not found');
});

// Prevent CDN script loading in tests
beforeEach(() => {
  vi.spyOn(document, 'createElement').mockImplementation((tag) => {
    const el = document.createElement.wrappedMethod
      ? document.createElement.wrappedMethod.call(document, tag)
      : Object.getPrototypeOf(document).createElement.call(document, tag);
    if (tag === 'script') {
      // Prevent actual script loading
      setTimeout(() => el.onerror && el.onerror(new Error('blocked')), 0);
    }
    return el;
  });
});

describe('LaTeXRenderer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders with default quadratic formula', () => {
    render(<LaTeXRenderer />);
    expect(screen.getByPlaceholderText('Enter LaTeX expression...')).toHaveValue(
      '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'
    );
  });

  it('shows Editor and Templates tabs', () => {
    render(<LaTeXRenderer />);
    expect(screen.getByText('✏️ Editor')).toBeInTheDocument();
    expect(screen.getByText('📚 Templates')).toBeInTheDocument();
  });

  it('displays quick symbols', () => {
    render(<LaTeXRenderer />);
    expect(screen.getByText('α')).toBeInTheDocument();
    expect(screen.getByText('π')).toBeInTheDocument();
    expect(screen.getByText('∞')).toBeInTheDocument();
  });

  it('displays common snippets', () => {
    render(<LaTeXRenderer />);
    expect(screen.getByText('Fraction')).toBeInTheDocument();
    expect(screen.getByText('Integral')).toBeInTheDocument();
    expect(screen.getByText('Matrix')).toBeInTheDocument();
  });

  it('inserts symbol into textarea when clicked', async () => {
    const user = userEvent.setup();
    render(<LaTeXRenderer />);
    const textarea = screen.getByPlaceholderText('Enter LaTeX expression...');
    const initialValue = textarea.value;

    await user.click(screen.getByText('π'));
    expect(textarea.value).toBe(initialValue + 'π');
  });

  it('inserts snippet into textarea when clicked', async () => {
    const user = userEvent.setup();
    render(<LaTeXRenderer />);
    const textarea = screen.getByPlaceholderText('Enter LaTeX expression...');
    const initialValue = textarea.value;

    await user.click(screen.getByText('Fraction'));
    expect(textarea.value).toBe(initialValue + '\\frac{a}{b}');
  });

  it('allows typing in the textarea', async () => {
    const user = userEvent.setup();
    render(<LaTeXRenderer />);
    const textarea = screen.getByPlaceholderText('Enter LaTeX expression...');

    await user.clear(textarea);
    await user.type(textarea, 'x^2');
    expect(textarea.value).toBe('x^2');
  });

  it('copies LaTeX source to clipboard', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<LaTeXRenderer />);
    await user.click(screen.getByText('📋 Copy LaTeX'));

    expect(writeText).toHaveBeenCalledWith('\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
  });

  it('shows LaTeX source in the pre block', () => {
    render(<LaTeXRenderer />);
    const preBlocks = screen.getAllByText((content, element) =>
      element?.tagName === 'PRE' && content.includes('\\frac')
    );
    expect(preBlocks.length).toBeGreaterThan(0);
  });

  it('switches to Templates tab and shows template cards', async () => {
    const user = userEvent.setup();
    render(<LaTeXRenderer />);

    await user.click(screen.getByText('📚 Templates'));

    expect(screen.getByText('Quadratic Formula')).toBeInTheDocument();
    expect(screen.getByText('Pythagorean Theorem')).toBeInTheDocument();
    expect(screen.getByText("Euler's Identity")).toBeInTheDocument();
    expect(screen.getByText('Ideal Gas Law')).toBeInTheDocument();
  });

  it('shows category badges on template cards', async () => {
    const user = userEvent.setup();
    render(<LaTeXRenderer />);

    await user.click(screen.getByText('📚 Templates'));

    expect(screen.getAllByText('Math').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Physics').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Chemistry').length).toBeGreaterThan(0);
  });

  it('filters templates by category', async () => {
    const user = userEvent.setup();
    render(<LaTeXRenderer />);

    await user.click(screen.getByText('📚 Templates'));
    await user.click(screen.getByRole('button', { name: 'Physics' }));

    expect(screen.getByText("Newton's Second Law")).toBeInTheDocument();
    expect(screen.getByText('E=mc²')).toBeInTheDocument();
    expect(screen.queryByText('Quadratic Formula')).not.toBeInTheDocument();
  });

  it('loads template into editor when Use Template is clicked', async () => {
    const user = userEvent.setup();
    render(<LaTeXRenderer />);

    await user.click(screen.getByText('📚 Templates'));

    const useButtons = screen.getAllByText('Use Template');
    await user.click(useButtons[0]); // First template: Quadratic Formula

    // Should switch back to editor tab
    const textarea = screen.getByPlaceholderText('Enter LaTeX expression...');
    expect(textarea.value).toBe('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
  });

  it('has all 21 templates', async () => {
    const user = userEvent.setup();
    render(<LaTeXRenderer />);

    await user.click(screen.getByText('📚 Templates'));

    const useButtons = screen.getAllByText('Use Template');
    expect(useButtons.length).toBe(21);
  });

  it('shows All category filter by default', async () => {
    const user = userEvent.setup();
    render(<LaTeXRenderer />);

    await user.click(screen.getByText('📚 Templates'));

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
  });
});
