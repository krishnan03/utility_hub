import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GraphingCalculator from './GraphingCalculator';

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
  delete filtered.whileTap;
  delete filtered.whileHover;
  delete filtered.transition;
  delete filtered.layout;
  delete filtered.mode;
  return filtered;
}

// Mock canvas context
function createMockContext() {
  return {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    scale: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineJoin: '',
    font: '',
    textAlign: '',
  };
}

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => createMockContext());
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
    width: 800,
    height: 450,
    top: 0,
    left: 0,
    right: 800,
    bottom: 450,
  }));
  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

describe('GraphingCalculator', () => {
  it('renders with default function input', () => {
    render(<GraphingCalculator />);
    const input = screen.getByLabelText('Function 1 expression');
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('sin(x)');
  });

  it('renders the canvas element', () => {
    render(<GraphingCalculator />);
    expect(screen.getByRole('img', { name: /function graph canvas/i })).toBeInTheDocument();
  });

  it('can add a new function (up to 5)', () => {
    render(<GraphingCalculator />);
    const addBtn = screen.getByText('+ Add Function');
    fireEvent.click(addBtn);
    expect(screen.getByLabelText('Function 2 expression')).toBeInTheDocument();
    fireEvent.click(addBtn);
    fireEvent.click(addBtn);
    fireEvent.click(addBtn);
    // After 5 functions, the add button should disappear
    expect(screen.queryByText('+ Add Function')).not.toBeInTheDocument();
  });

  it('can remove a function', () => {
    render(<GraphingCalculator />);
    fireEvent.click(screen.getByText('+ Add Function'));
    expect(screen.getByLabelText('Function 2 expression')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Remove function 2'));
    expect(screen.queryByLabelText('Function 2 expression')).not.toBeInTheDocument();
  });

  it('updates expression when typing', () => {
    render(<GraphingCalculator />);
    const input = screen.getByLabelText('Function 1 expression');
    fireEvent.change(input, { target: { value: 'x^2' } });
    expect(input.value).toBe('x^2');
  });

  it('loads a preset into an empty slot', () => {
    render(<GraphingCalculator />);
    // Clear the default expression first
    const input = screen.getByLabelText('Function 1 expression');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByText('Parabola'));
    expect(input.value).toBe('x^2');
  });

  it('renders all preset buttons', () => {
    render(<GraphingCalculator />);
    expect(screen.getByText('Parabola')).toBeInTheDocument();
    expect(screen.getByText('Sine')).toBeInTheDocument();
    expect(screen.getByText('Exponential')).toBeInTheDocument();
    expect(screen.getByText('Log')).toBeInTheDocument();
    expect(screen.getByText('Circle+')).toBeInTheDocument();
    expect(screen.getByText('Circle−')).toBeInTheDocument();
  });

  it('renders zoom and control buttons', () => {
    render(<GraphingCalculator />);
    expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
    expect(screen.getByLabelText('Reset view')).toBeInTheDocument();
    expect(screen.getByLabelText('Toggle grid')).toBeInTheDocument();
  });

  it('renders range inputs with default values', () => {
    render(<GraphingCalculator />);
    expect(screen.getByLabelText('X min').value).toBe('-10');
    expect(screen.getByLabelText('X max').value).toBe('10');
    expect(screen.getByLabelText('Y min').value).toBe('-7');
    expect(screen.getByLabelText('Y max').value).toBe('7');
  });

  it('updates range when input changes', () => {
    render(<GraphingCalculator />);
    const xMin = screen.getByLabelText('X min');
    fireEvent.change(xMin, { target: { value: '-20' } });
    expect(xMin.value).toBe('-20');
  });

  it('resets view when reset button is clicked', () => {
    render(<GraphingCalculator />);
    const xMin = screen.getByLabelText('X min');
    fireEvent.change(xMin, { target: { value: '-50' } });
    expect(xMin.value).toBe('-50');
    fireEvent.click(screen.getByLabelText('Reset view'));
    expect(xMin.value).toBe('-10');
  });

  it('toggles grid on and off', () => {
    render(<GraphingCalculator />);
    const gridBtn = screen.getByLabelText('Toggle grid');
    expect(gridBtn.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(gridBtn);
    expect(gridBtn.getAttribute('aria-pressed')).toBe('false');
  });
});
