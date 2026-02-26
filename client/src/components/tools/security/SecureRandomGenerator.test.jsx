import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SecureRandomGenerator from './SecureRandomGenerator.jsx';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderComponent() {
  return render(
    <MemoryRouter>
      <SecureRandomGenerator />
    </MemoryRouter>,
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SecureRandomGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock clipboard
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn(() => Promise.resolve()) },
    });
  });

  // ── Tab rendering ──────────────────────────────────────────────────────

  it('renders all six tabs', () => {
    renderComponent();
    expect(screen.getByText('🔢 Numbers')).toBeInTheDocument();
    expect(screen.getByText('🎲 Dice')).toBeInTheDocument();
    expect(screen.getByText('🪙 Coins')).toBeInTheDocument();
    expect(screen.getByText('🃏 Cards')).toBeInTheDocument();
    expect(screen.getByText('🎰 Lottery')).toBeInTheDocument();
    expect(screen.getByText('🔀 Shuffle')).toBeInTheDocument();
  });

  it('shows privacy notice about crypto.getRandomValues', () => {
    renderComponent();
    expect(screen.getByText(/crypto\.getRandomValues/)).toBeInTheDocument();
  });

  // ── Numbers tab ────────────────────────────────────────────────────────

  it('defaults to the Numbers tab', () => {
    renderComponent();
    expect(screen.getByText(/generate random numbers/i)).toBeInTheDocument();
  });

  it('generates random numbers when button is clicked', async () => {
    renderComponent();
    fireEvent.click(screen.getByText(/generate random numbers/i));

    await waitFor(() => {
      expect(screen.getByText(/copy all/i)).toBeInTheDocument();
    });
  });

  it('shows count, min, and max inputs on Numbers tab', () => {
    renderComponent();
    expect(screen.getByText('Count')).toBeInTheDocument();
    expect(screen.getByText('Min')).toBeInTheDocument();
    expect(screen.getByText('Max')).toBeInTheDocument();
  });

  // ── Dice tab ───────────────────────────────────────────────────────────

  it('switches to Dice tab and shows dice controls', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('🎲 Dice'));

    await waitFor(() => {
      expect(screen.getByText('Sides')).toBeInTheDocument();
      expect(screen.getByText('D6')).toBeInTheDocument();
      expect(screen.getByText('D20')).toBeInTheDocument();
    });
  });

  it('rolls dice and shows results with total', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('🎲 Dice'));

    await waitFor(() => {
      expect(screen.getByText(/roll 2d6/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/roll 2d6/i));

    await waitFor(() => {
      expect(screen.getByText(/total:/i)).toBeInTheDocument();
    });
  });

  it('shows all D&D dice side options', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('🎲 Dice'));

    await waitFor(() => {
      expect(screen.getByText('D4')).toBeInTheDocument();
      expect(screen.getByText('D6')).toBeInTheDocument();
      expect(screen.getByText('D8')).toBeInTheDocument();
      expect(screen.getByText('D10')).toBeInTheDocument();
      expect(screen.getByText('D12')).toBeInTheDocument();
      expect(screen.getByText('D20')).toBeInTheDocument();
    });
  });

  // ── Coins tab ──────────────────────────────────────────────────────────

  it('switches to Coins tab and shows coin controls', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('🪙 Coins'));

    await waitFor(() => {
      expect(screen.getByText(/flip 5 coins/i)).toBeInTheDocument();
    });
  });

  it('flips coins and shows heads/tails counts', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('🪙 Coins'));

    await waitFor(() => {
      fireEvent.click(screen.getByText(/flip 5 coins/i));
    });

    await waitFor(() => {
      expect(screen.getByText(/heads:/i)).toBeInTheDocument();
      expect(screen.getByText(/tails:/i)).toBeInTheDocument();
    });
  });

  // ── Cards tab ──────────────────────────────────────────────────────────

  it('switches to Cards tab and shows draw controls', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('🃏 Cards'));

    await waitFor(() => {
      expect(screen.getByText(/draw 5 cards/i)).toBeInTheDocument();
    });
  });

  it('draws cards and shows card results', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('🃏 Cards'));

    await waitFor(() => {
      fireEvent.click(screen.getByText(/draw 5 cards/i));
    });

    // Cards should render with suit symbols
    await waitFor(() => {
      const container = document.querySelector('.flex.flex-wrap.gap-2.justify-center');
      expect(container).toBeInTheDocument();
    });
  });

  // ── Lottery tab ────────────────────────────────────────────────────────

  it('switches to Lottery tab and shows lottery controls', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('🎰 Lottery'));

    await waitFor(() => {
      expect(screen.getByText('Pick count')).toBeInTheDocument();
      expect(screen.getByText('From 1 to')).toBeInTheDocument();
    });
  });

  it('picks lottery numbers and shows sorted results', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('🎰 Lottery'));

    await waitFor(() => {
      fireEvent.click(screen.getByText(/pick 6 from 1–49/i));
    });

    await waitFor(() => {
      expect(screen.getByText(/copy numbers/i)).toBeInTheDocument();
    });
  });

  // ── Shuffle tab ────────────────────────────────────────────────────────

  it('switches to Shuffle tab and shows textarea', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('🔀 Shuffle'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/alice/i)).toBeInTheDocument();
      expect(screen.getByText(/shuffle list/i)).toBeInTheDocument();
    });
  });

  it('shuffles a list and shows numbered results', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('🔀 Shuffle'));

    const textarea = await screen.findByPlaceholderText(/alice/i);
    await userEvent.type(textarea, 'Alpha\nBravo\nCharlie');

    fireEvent.click(screen.getByText(/shuffle list/i));

    await waitFor(() => {
      expect(screen.getByText('1.')).toBeInTheDocument();
      expect(screen.getByText('2.')).toBeInTheDocument();
      expect(screen.getByText('3.')).toBeInTheDocument();
    });
  });

  it('disables shuffle button when textarea is empty', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('🔀 Shuffle'));

    await waitFor(() => {
      const btn = screen.getByText(/shuffle list/i).closest('button');
      expect(btn).toBeDisabled();
    });
  });

  // ── Copy functionality ─────────────────────────────────────────────────

  it('copies generated numbers to clipboard', async () => {
    renderComponent();
    fireEvent.click(screen.getByText(/generate random numbers/i));

    await waitFor(() => {
      expect(screen.getByText(/copy all/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/copy all/i));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });
});
