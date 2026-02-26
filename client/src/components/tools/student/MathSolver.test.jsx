import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MathSolver from './MathSolver.jsx';

function renderComponent() {
  return render(
    <MemoryRouter>
      <MathSolver />
    </MemoryRouter>,
  );
}

describe('MathSolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn(() => Promise.resolve()) },
    });
  });

  // ── Initial render ─────────────────────────────────────────────────────

  it('renders all five problem type buttons', () => {
    renderComponent();
    expect(screen.getByText('Linear Equation')).toBeInTheDocument();
    expect(screen.getByText('Quadratic Equation')).toBeInTheDocument();
    expect(screen.getByText('Simplify Expression')).toBeInTheDocument();
    expect(screen.getByText('Derivative')).toBeInTheDocument();
    expect(screen.getByText('Integral')).toBeInTheDocument();
  });

  it('defaults to Linear Equation type', () => {
    renderComponent();
    expect(screen.getByText('Enter your equation')).toBeInTheDocument();
  });

  it('shows the solve button (disabled when empty)', () => {
    renderComponent();
    const btn = screen.getByText('🧮 Solve Step-by-Step').closest('button');
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it('shows the equation input', () => {
    renderComponent();
    expect(screen.getByPlaceholderText('2x + 3 = 7')).toBeInTheDocument();
  });

  // ── Problem type switching ─────────────────────────────────────────────

  it('switches to Quadratic type and updates label', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('Quadratic Equation'));
    expect(screen.getByText('Enter your equation')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('x^2 + 5x + 6 = 0')).toBeInTheDocument();
  });

  it('switches to Derivative type and updates label', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('Derivative'));
    expect(screen.getByText('Enter f(x) to differentiate')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('3x^2 + 2x + 1')).toBeInTheDocument();
  });

  it('switches to Integral type and updates label', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('Integral'));
    expect(screen.getByText('Enter f(x) to integrate')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('2x^3 + 3x + 1')).toBeInTheDocument();
  });

  it('switches to Simplify type and updates label', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('Simplify Expression'));
    expect(screen.getByText('Enter expression to simplify')).toBeInTheDocument();
  });

  // ── Linear equation solving ────────────────────────────────────────────

  it('solves a simple linear equation: 2x + 3 = 7', async () => {
    renderComponent();
    const input = screen.getByPlaceholderText('2x + 3 = 7');
    await userEvent.type(input, '2x + 3 = 7');
    fireEvent.click(screen.getByText('🧮 Solve Step-by-Step'));

    await waitFor(() => {
      expect(screen.getByText('Solution')).toBeInTheDocument();
      expect(screen.getByText(/x = 2/)).toBeInTheDocument();
    });
  });

  it('shows step-by-step breakdown for linear equation', async () => {
    renderComponent();
    const input = screen.getByPlaceholderText('2x + 3 = 7');
    await userEvent.type(input, '2x + 3 = 7');
    fireEvent.click(screen.getByText('🧮 Solve Step-by-Step'));

    await waitFor(() => {
      expect(screen.getByText('Start with the equation')).toBeInTheDocument();
      expect(screen.getByText(/rearrange/i)).toBeInTheDocument();
    });
  });

  it('handles equation with no solution', async () => {
    renderComponent();
    const input = screen.getByPlaceholderText('2x + 3 = 7');
    await userEvent.type(input, '0x + 3 = 7');
    fireEvent.click(screen.getByText('🧮 Solve Step-by-Step'));

    await waitFor(() => {
      expect(screen.getByText(/no solution/i)).toBeInTheDocument();
    });
  });

  // ── Quadratic equation solving ─────────────────────────────────────────

  it('solves a quadratic equation: x^2 + 5x + 6 = 0', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('Quadratic Equation'));
    const input = screen.getByPlaceholderText('x^2 + 5x + 6 = 0');
    await userEvent.type(input, 'x{^}2+5x+6=0');
    fireEvent.click(screen.getByText('🧮 Solve Step-by-Step'));

    await waitFor(() => {
      expect(screen.getByText(/identify coefficients/i)).toBeInTheDocument();
      expect(screen.getByText(/calculate discriminant/i)).toBeInTheDocument();
      // Both the calculation step and result step contain x₁
      const matches = screen.getAllByText(/x₁ =/);
      expect(matches.length).toBeGreaterThanOrEqual(2);
      // Verify the final result contains both roots
      expect(screen.getByText(/x₁ = -2.*x₂ = -3/)).toBeInTheDocument();
    });
  });

  // ── Derivative solving ─────────────────────────────────────────────────

  it('computes derivative of 3x^2 + 2x + 1', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('Derivative'));
    const input = screen.getByPlaceholderText('3x^2 + 2x + 1');
    await userEvent.type(input, '3x^2+2x+1');
    fireEvent.click(screen.getByText('🧮 Solve Step-by-Step'));

    await waitFor(() => {
      expect(screen.getByText(/find the derivative of/i)).toBeInTheDocument();
      expect(screen.getByText(/power rule/i)).toBeInTheDocument();
      expect(screen.getByText(/f'.*=.*6x/)).toBeInTheDocument();
    });
  });

  // ── Integral solving ───────────────────────────────────────────────────

  it('computes integral of 2x + 1', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('Integral'));
    const input = screen.getByPlaceholderText('2x^3 + 3x + 1');
    await userEvent.type(input, '2x+1');
    fireEvent.click(screen.getByText('🧮 Solve Step-by-Step'));

    await waitFor(() => {
      expect(screen.getByText(/find the integral of/i)).toBeInTheDocument();
      expect(screen.getByText(/∫f\(x\)dx/)).toBeInTheDocument();
    });
  });

  // ── Simplify ───────────────────────────────────────────────────────────

  it('simplifies expression 3x + 2x - x', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('Simplify Expression'));
    const input = screen.getByPlaceholderText('3x + 2x - x + 5 - 2');
    await userEvent.type(input, '3x+2x-x');
    fireEvent.click(screen.getByText('🧮 Solve Step-by-Step'));

    await waitFor(() => {
      expect(screen.getByText(/simplified expression/i)).toBeInTheDocument();
      // Check the result step contains 4x
      const resultEl = screen.getByText(/simplified expression/i).closest('div').parentElement;
      expect(resultEl.textContent).toContain('4x');
    });
  });

  // ── Copy & Reset ───────────────────────────────────────────────────────

  it('copies solution to clipboard', async () => {
    renderComponent();
    const input = screen.getByPlaceholderText('2x + 3 = 7');
    await userEvent.type(input, '2x+3=7');
    fireEvent.click(screen.getByText('🧮 Solve Step-by-Step'));

    await waitFor(() => {
      expect(screen.getByText('📋 Copy Solution')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('📋 Copy Solution'));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  it('resets the form when Try Another is clicked', async () => {
    renderComponent();
    const input = screen.getByPlaceholderText('2x + 3 = 7');
    await userEvent.type(input, '2x+3=7');
    fireEvent.click(screen.getByText('🧮 Solve Step-by-Step'));

    await waitFor(() => {
      expect(screen.getByText('🔄 Try Another')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('🔄 Try Another'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('2x + 3 = 7')).toHaveValue('');
    });
  });

  // ── Keyboard shortcut ──────────────────────────────────────────────────

  it('solves on Enter key press', async () => {
    renderComponent();
    const input = screen.getByPlaceholderText('2x + 3 = 7');
    await userEvent.type(input, 'x+1=3');
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Solution')).toBeInTheDocument();
    });
  });
});
