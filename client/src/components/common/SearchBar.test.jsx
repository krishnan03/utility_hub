import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SearchBar from './SearchBar.jsx';
import useToolStore from '../../stores/useToolStore.js';

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderSearchBar() {
  return render(
    <MemoryRouter>
      <SearchBar />
    </MemoryRouter>,
  );
}

describe('SearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToolStore.setState({ searchQuery: '', activeCategory: null });
  });

  it('renders a search input with correct ARIA attributes', () => {
    renderSearchBar();
    const input = screen.getByRole('combobox', { name: /search tools/i });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    expect(input).toHaveAttribute('aria-controls', 'search-results-listbox');
  });

  it('shows dropdown results when typing a matching query', async () => {
    renderSearchBar();
    const input = screen.getByRole('combobox', { name: /search tools/i });
    await userEvent.type(input, 'image');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
  });

  it('does not show dropdown for empty input', () => {
    renderSearchBar();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('filters results case-insensitively', async () => {
    renderSearchBar();
    const input = screen.getByRole('combobox', { name: /search tools/i });
    await userEvent.type(input, 'PDF');
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
  });

  it('navigates to tool page on Enter with active selection', async () => {
    renderSearchBar();
    const input = screen.getByRole('combobox', { name: /search tools/i });
    await userEvent.type(input, 'regex');

    // ArrowDown to select first result, then Enter
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/tools/'));
  });

  it('closes dropdown on Escape', async () => {
    renderSearchBar();
    const input = screen.getByRole('combobox', { name: /search tools/i });
    await userEvent.type(input, 'image');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('supports ArrowDown / ArrowUp keyboard navigation', async () => {
    renderSearchBar();
    const input = screen.getByRole('combobox', { name: /search tools/i });
    await userEvent.type(input, 'pdf merge');

    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThanOrEqual(1);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    if (options.length > 1) {
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(options[0]).toHaveAttribute('aria-selected', 'false');
      expect(options[1]).toHaveAttribute('aria-selected', 'true');

      fireEvent.keyDown(input, { key: 'ArrowUp' });
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    }
  });

  it('wraps around when navigating past the last result', async () => {
    renderSearchBar();
    const input = screen.getByRole('combobox', { name: /search tools/i });
    await userEvent.type(input, 'regex');

    const options = screen.getAllByRole('option');
    // Navigate down past the last item
    for (let i = 0; i <= options.length; i++) {
      fireEvent.keyDown(input, { key: 'ArrowDown' });
    }
    // Should wrap to first
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('navigates on click of a result item', async () => {
    renderSearchBar();
    const input = screen.getByRole('combobox', { name: /search tools/i });
    await userEvent.type(input, 'password');

    const option = screen.getAllByRole('option')[0];
    fireEvent.mouseDown(option);

    expect(mockNavigate).toHaveBeenCalled();
  });

  it('clears input after selecting a tool', async () => {
    renderSearchBar();
    const input = screen.getByRole('combobox', { name: /search tools/i });
    await userEvent.type(input, 'gpa');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(input).toHaveValue('');
  });

  it('updates aria-activedescendant when navigating', async () => {
    renderSearchBar();
    const input = screen.getByRole('combobox', { name: /search tools/i });
    await userEvent.type(input, 'timer');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).toBeTruthy();
  });
});
